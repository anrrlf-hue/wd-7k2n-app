"""Thin, manually invoked adapter to the existing Base APIs.

No scheduler, worker loop, provider, database schema or authentication is added.
Reads use SQLite mode=ro. Mutations require an exact reviewed packet digest.
Zero-cost confirmation is an operator attestation, NOT a billing verification.
"""
from contextlib import closing, contextmanager
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import sys

from .tasks import GOAL, TENANT, WORKPACK, HERE, assert_tool_free, brief, canonical, digest, goal_proposal, payload

LOCK = json.loads((HERE / "source-lock.json").read_text(encoding="utf-8"))


def verify_sources(root):
    root = Path(root).resolve()
    for relative, expected in LOCK["files"].items():
        try:
            raw = (root / relative).read_bytes()
        except OSError:
            raise ValueError("EXISTING_BASE_SOURCE_REQUIRED:" + relative) from None
        actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
        # Two installed files differ only in outer whitespace/newlines. Accept
        # exactly the reviewed normalised text, never an unpinned implementation.
        normalized = hashlib.sha256(raw.decode("utf-8").replace("\r\n", "\n").strip().encode()).hexdigest()
        if actual != expected and normalized != LOCK["normalized_sha256"][relative]:
            raise ValueError("BASE_SOURCE_DRIFT:" + relative)
    return root


def module(root, name):
    spec = importlib.util.spec_from_file_location("saju_operator_" + name, root / "contract" / (name + ".py"))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def prepare(root, kind="draft", *, parent_text=None, parent_id=None):
    root = verify_sources(root)
    data = payload(kind, module(root, "task_contract"), parent_text=parent_text, parent_id=parent_id)
    return {"schema": "SAJU_LAUNCH_REQUEST_V1", "environment": "SANDBOX",
            "source_commit": LOCK["commit"], "payload": data, "request_digest": digest(data)}


class Runtime:
    def __init__(self, root, database):
        self.root = Path(root).expanduser().resolve()
        self.database = Path(database).expanduser().resolve()

    @contextmanager
    def read(self):
        if not self.database.is_file():
            raise ValueError("EXISTING_BASE_DATABASE_REQUIRED")
        with closing(sqlite3.connect(self.database.as_uri() + "?mode=ro", uri=True)) as con:
            con.row_factory = sqlite3.Row
            con.execute("PRAGMA query_only=ON")
            yield con

    def goal(self):
        with self.read() as con:
            row = con.execute("SELECT * FROM goal_contracts WHERE tenant_id=? AND goal_id=?", (TENANT, GOAL)).fetchone()
        return dict(row) if row else None

    def check(self):
        verify_sources(self.root)
        with self.read() as con:
            tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not {"jobs", "job_items", "job_events", "goal_contracts", "business_evidence", "goal_incidents"} <= tables:
            raise ValueError("EXISTING_BASE_SCHEMA_REQUIRED")
        goal = self.goal()
        return {"source_commit": LOCK["commit"], "tenant_id": TENANT, "goal_id": GOAL,
                "registration": "EXISTS" if goal else "FIRST_REGISTRATION_REQUIRED",
                "goal_status": goal["goal_status"] if goal else None,
                "model_billing": "UNVERIFIED", "model_call_performed": False,
                "publishing_enabled": False, "measurement": "DEFERRED_UNTIL_DOMAIN_LAUNCH"}

    def _engine(self):
        self.check()
        # The installed general_freeform artifact location is fixed by upstream.
        # Loading code from another location must never write into that runtime.
        native = self.root / "workpacks/general_freeform/runtime.py"
        import ast
        tree = ast.parse(native.read_text(encoding="utf-8"))
        root_literal = next(node.value.args[0].value for node in tree.body if isinstance(node, ast.Assign)
                            and any(isinstance(t, ast.Name) and t.id == "BASE" for t in node.targets))
        if self.root != Path(root_literal).resolve():
            raise ValueError("OFFICIAL_RUNTIME_LOCATION_REQUIRED")
        if os.environ.get("AGENT_BASE_ROOT") != str(self.root) or os.environ.get("AGENT_BASE_DB") != str(self.database):
            raise ValueError("EXISTING_RUNTIME_ENVIRONMENT_REQUIRED")
        if os.environ.get("AGENT_BASE_GOAL_AGENT_V1", "0").lower() not in {"1", "true", "yes", "on"}:
            raise ValueError("EXISTING_GOAL_FEATURE_REQUIRED")
        sys.path.insert(0, str(self.root / "contract"))
        base = module(self.root, "base_runtime")
        base.assert_database_allowed()
        return base

    def registration_packet(self, start_at, deadline_at):
        start, end = datetime.fromisoformat(start_at), datetime.fromisoformat(deadline_at)
        if start.tzinfo is None or end.tzinfo is None or end <= start:
            raise ValueError("REGISTRATION_DATES_INVALID")
        goal = goal_proposal(start_at, deadline_at)
        return {"schema": "SAJU_FIRST_REGISTRATION_V1", "source_commit": LOCK["commit"],
                "goal": goal, "registration_digest": digest(goal)}

    def register(self, packet, approval):
        expected = self.registration_packet(packet["goal"]["start_at"], packet["goal"]["deadline_at"])
        if packet != expected or approval != expected["registration_digest"]:
            raise ValueError("EXACT_REGISTRATION_APPROVAL_REQUIRED")
        if datetime.fromisoformat(packet["goal"]["deadline_at"]) <= datetime.now(timezone.utc):
            raise ValueError("GOAL_EXPIRED")
        base = self._engine()
        if self.goal() is not None:
            raise ValueError("GOAL_ALREADY_EXISTS_NO_OVERWRITE")
        # Existing Base owns its schema and Goal admission. Never call init here.
        base.goal_agent_v1().create_goal(packet["goal"])
        return self.check()

    def _require_goal(self):
        goal = self.goal()
        if goal is None:
            raise ValueError("FIRST_REGISTRATION_REQUIRED")
        expected = goal_proposal(goal["start_at"], goal["deadline_at"])
        for name in ("workpack_scope", "capability_scope", "resource_constraints"):
            if json.loads(goal[name + "_json"]) != expected[name]:
                raise ValueError("SAJU_GOAL_SCOPE_MISMATCH")
        if (goal["goal_status"] != "ACTIVE" or goal["approval_mode"] != "MANUAL_ONLY"
                or goal["budget_state"] != "KNOWN" or goal["budget_hard_limit_amount"] != 0
                or goal["budget_currency"] != "KRW"
                or datetime.fromisoformat(goal["deadline_at"]) <= datetime.now(timezone.utc)
                or datetime.fromisoformat(goal["start_at"]) > datetime.now(timezone.utc)):
            raise ValueError("SAJU_GOAL_NOT_APPROVED")

    def result(self, job_id):
        with self.read() as con:
            job = con.execute("SELECT job_id,status,command_text,workpack,environment FROM jobs "
                              "WHERE job_id=? AND tenant_id=? AND goal_id=?", (job_id, TENANT, GOAL)).fetchone()
            if job is None:
                raise ValueError("SAJU_JOB_NOT_FOUND")
            if job["workpack"] != WORKPACK or job["environment"] != "SANDBOX":
                raise ValueError("SAJU_JOB_SCOPE_MISMATCH")
            item = con.execute("SELECT status,result_json,evidence_json FROM job_items WHERE job_id=? ORDER BY id LIMIT 1",
                               (job_id,)).fetchone()
        saved = json.loads(job["command_text"])
        if saved.get("origin") != "saju_prelaunch_operator" or saved.get("saju_brief_digest") != digest(brief()):
            raise ValueError("SAJU_JOB_ORIGIN_MISMATCH")
        data = json.loads(item["result_json"] or "{}") if item else {}
        evidence = json.loads(item["evidence_json"] or "{}") if item else {}
        receipt = data.get("execution_receipt") or {}
        verified = bool(job["status"] == "COMPLETED" and item and item["status"] == "SUCCESS_VERIFIED"
                        and evidence.get("ok") is True and evidence.get("user_request_fulfilled") is True
                        and isinstance(data.get("result"), str) and data["result"].strip())
        return {"job_id": job_id, "task": saved.get("saju_task"), "state": job["status"],
                "engine_verified": verified, "result": data.get("result") if verified else None,
                "human_review_required": True, "publish_allowed": False, "business_effect_verified": False,
                "model_billing": "NOT_VERIFIED_BY_THIS_CLIENT",
                "provider_receipt": {key: receipt.get(key) for key in ("provider", "model", "usage", "selected_backend")},
                "issues": evidence.get("verification_issues") or [],
                "failure_reason": None if verified else evidence.get("reason")}

    def review_packet(self, job_id):
        draft = self.result(job_id)
        if not draft["engine_verified"] or draft["task"] != "draft":
            raise ValueError("VERIFIED_DRAFT_REQUIRED")
        return prepare(self.root, "review", parent_text=draft["result"], parent_id=job_id)

    def run(self, packet, approval, zero_cost_confirmation):
        data = packet.get("payload") or {}
        kind = data.get("saju_task")
        expected = (self.review_packet(data.get("saju_review_source_job")) if kind == "review"
                    else prepare(self.root, kind))
        if packet != expected or approval != expected["request_digest"]:
            raise ValueError("EXACT_REQUEST_APPROVAL_REQUIRED")
        # This explicit operator confirmation cannot be inferred from a subscription,
        # provider name containing 'free', test receipt, or a zero-budget Goal.
        if zero_cost_confirmation != expected["request_digest"]:
            raise ValueError("EXISTING_ZERO_COST_ROUTE_CONFIRMATION_REQUIRED")
        self._require_goal()
        base = self._engine()
        assert_tool_free(data["task_contract"])
        # The installed Base predates its admission_key parameter. Serialize this
        # CLI's short admission step with an OS lock on the existing DB inode,
        # and look up our immutable payload in Base's own records. No new table,
        # sidecar state, retry owner or execution lock is introduced. Base still
        # owns the job lease and execution. The lock is released before tick.
        import fcntl
        with self.database.open("rb") as admission_lock:
            fcntl.flock(admission_lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            try:
                with self.read() as con:
                    matches = [row["job_id"] for row in con.execute(
                        "SELECT job_id,command_text FROM jobs WHERE tenant_id=? AND goal_id=? "
                        "AND environment='SANDBOX' AND workpack=?", (TENANT, GOAL, WORKPACK))
                        if digest(json.loads(row["command_text"])) == packet["request_digest"]]
                if len(matches) > 1:
                    raise ValueError("AMBIGUOUS_EXISTING_JOBS_REVIEW_REQUIRED")
                job_id = matches[0] if matches else base.create_job("SANDBOX", WORKPACK, data)
            finally:
                fcntl.flock(admission_lock.fileno(), fcntl.LOCK_UN)
        before = self.result(job_id)
        # Never retry a failed/ambiguous job or start a new model turn on a completed job.
        if before["state"] != "QUEUED":
            return before
        base.tick("SANDBOX", job_id=job_id)
        return self.result(job_id)
