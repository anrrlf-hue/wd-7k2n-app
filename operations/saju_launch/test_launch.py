"""New integration tests. Only the model transport, availability and host seam are doubles.

The pinned Task Contract, Base Goal/admission/tick, general_freeform runtime,
execute_tool_free and verifier execute. All state is temporary. No AI quality claim.
"""
import copy
from datetime import datetime, timedelta, timezone
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import sys
import tempfile
import unittest
from unittest.mock import patch

from .runtime import Runtime, module, prepare, verify_sources
from .tasks import GOAL, TENANT, WORKPACK, canonical, digest, goal_proposal

SOURCES = Path(os.environ.get("SAJU_LAUNCH_SOURCES", "/tmp/saju-active-contracts")) / "agent-base"
# Deliberately a test response, not delivered marketing copy or an AI result.
DRAFT = "\n".join(
    f"{i}. 주제: 시험용 자기이해 {i}\n제목: 내 성향을 돌아보기 {i}\n"
    "게시용 글 초안: 사주와 손금의 해석을 읽으며 평소의 선택을 돌아보세요. 해석은 확정된 미래가 아닙니다. "
    "무료 풀이로 관심 분야를 살펴보고 연간 리포트의 보완 행동과 월별 흐름을 비교할 수 있습니다.\n"
    "공유문구: 내 성향을 돌아보는 무료 사주·손금 풀이를 살펴보세요.\n선택 이유: 체험의 가치를 설명합니다."
    for i in range(1, 4)
)
REVIEW = "최종 판정: 대표 검토 필요\n근거: 해석의 불확실성을 밝혔습니다.\n수정안: 시험 문구를 실제 초안으로 교체하세요.\n대표 확인사항: 이는 모델 대체 응답입니다."


class LaunchTests(unittest.TestCase):
    def setUp(self):
        verify_sources(SOURCES)
        self.tmp = tempfile.TemporaryDirectory(prefix="saju-launch-test-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "base"
        shutil.copytree(SOURCES, self.root, ignore=shutil.ignore_patterns("__pycache__"))
        self.db = self.root / "state" / "existing.sqlite"
        self.db.parent.mkdir()
        self.env = patch.dict(os.environ, {"AGENT_BASE_ROOT": str(self.root), "AGENT_BASE_DB": str(self.db),
                                          "AGENT_BASE_GOAL_AGENT_V1": "1"})
        self.env.start(); self.addCleanup(self.env.stop)
        self.network = patch.object(socket.socket, "connect", side_effect=AssertionError("NETWORK_FORBIDDEN"))
        self.network.start(); self.addCleanup(self.network.stop)
        self.base = module(self.root, "base_runtime")
        # Test fixtures only: production adapter never initialises a new database.
        self.base.init_schema()
        self.runtime = Runtime(self.root, self.db)
        self.host = patch.object(self.runtime, "_engine", return_value=self.base)
        self.host.start(); self.addCleanup(self.host.stop)
        self.saved_path = list(sys.path)
        sys.path.insert(0, str(self.root / "contract"))
        for name in ("runtime", "verifier"):
            sys.modules.pop(name, None)
        _, self.handler = self.base.load_workpack(WORKPACK)
        self.native = sys.modules["runtime"]
        self.native.BASE = self.root  # Test host only; production pins the official location.
        self.registry = module(self.root, "capability_registry")
        real_resolve = self.registry.resolve
        self.registry.resolve = lambda contract: real_resolve(contract, availability={
            "create.llm_task": "AVAILABLE", "think.llm_task": "AVAILABLE"})
        self.native._capability_registry = lambda: self.registry
        self.executor = self.native._agentic_executor()
        self.model_calls = []
        self.model_inputs = []

        def fake_model(context, prompt, **kwargs):
            self.model_calls.append((context["job_id"], kwargs))
            self.model_inputs.append(prompt)
            context["capability_provider_usage"] = {"provider": "TEST_DOUBLE", "model": "NOT_CALLED"}
            return REVIEW if context["payload"]["saju_task"] == "review" else DRAFT

        self.executor._llm_task_synthesis = fake_model
        self.native._agentic_executor = lambda: self.executor
        self.addCleanup(self.cleanup_imports)
        now = datetime.now(timezone.utc)
        self.registration = self.runtime.registration_packet(now.isoformat(), (now + timedelta(days=1)).isoformat())

    def cleanup_imports(self):
        sys.path[:] = self.saved_path
        for name in ("runtime", "verifier"):
            sys.modules.pop(name, None)

    def register(self):
        return self.runtime.register(self.registration, self.registration["registration_digest"])

    def run_packet(self, packet):
        return self.runtime.run(packet, packet["request_digest"], packet["request_digest"])

    def job_count(self):
        with self.runtime.read() as con:
            return con.execute("SELECT count(*) FROM jobs").fetchone()[0]

    def test_real_parser_routes_draft_and_review_to_tool_free_without_high_brain(self):
        parser = module(self.root, "task_contract")
        unsafe = parser.build_task_contract("홍보 초안을 작성해주세요. 결제는 하지 마세요.", workpack=WORKPACK, tenant_id=TENANT)
        self.assertTrue(unsafe["external_action_required"])
        first = prepare(self.root)
        second = prepare(self.root, "review", parent_text=DRAFT, parent_id="sandbox-sample")
        self.assertEqual("CONTENT_DRAFT", first["payload"]["task_contract"]["requested_outcome"])
        self.assertEqual("GENERAL_ADVICE", second["payload"]["task_contract"]["requested_outcome"])
        for packet in (first, second):
            contract = packet["payload"]["task_contract"]
            self.assertEqual("llm_task_tool_free", self.registry.resolve(contract)["selected_backend"])
            self.assertEqual("NONE", contract["tool_requirement"])
            self.assertIsNone(contract.get("brain_policy"))
        self.assertEqual(first, prepare(self.root))
        self.assertEqual(0, self.job_count())

    def test_readonly_preflight_does_not_create_or_migrate_database(self):
        absent = self.root / "absent.sqlite"
        with self.assertRaisesRegex(ValueError, "EXISTING_BASE_DATABASE_REQUIRED"):
            Runtime(self.root, absent).check()
        self.assertFalse(absent.exists())
        empty = self.root / "empty.sqlite"; empty.touch()
        before = empty.read_bytes()
        with self.assertRaisesRegex(ValueError, "EXISTING_BASE_SCHEMA_REQUIRED"):
            Runtime(self.root, empty).check()
        self.assertEqual(before, empty.read_bytes())
        self.assertEqual("FIRST_REGISTRATION_REQUIRED", self.runtime.check()["registration"])

    def test_first_registration_uses_actual_goal_api_and_never_overwrites(self):
        with self.assertRaisesRegex(ValueError, "EXACT_REGISTRATION_APPROVAL_REQUIRED"):
            self.runtime.register(self.registration, "unapproved")
        changed = copy.deepcopy(self.registration); changed["goal"]["tenant_id"] = "unrelated"
        with self.assertRaisesRegex(ValueError, "EXACT_REGISTRATION_APPROVAL_REQUIRED"):
            self.runtime.register(changed, self.registration["registration_digest"])
        self.assertEqual("EXISTS", self.register()["registration"])
        self.assertEqual("MANUAL_ONLY", self.runtime.goal()["approval_mode"])
        with self.assertRaisesRegex(ValueError, "GOAL_ALREADY_EXISTS"):
            self.register()
        self.assertEqual([], self.model_calls)

    def test_missing_approval_and_cost_confirmation_do_not_enqueue(self):
        self.register(); packet = prepare(self.root)
        with self.assertRaisesRegex(ValueError, "EXACT_REQUEST_APPROVAL_REQUIRED"):
            self.runtime.run(packet, None, None)
        with self.assertRaisesRegex(ValueError, "ZERO_COST_ROUTE_CONFIRMATION_REQUIRED"):
            self.runtime.run(packet, packet["request_digest"], None)
        self.assertEqual(0, self.job_count()); self.assertEqual([], self.model_calls)

    def test_actual_base_and_general_freeform_draft_review_and_duplicate_readback(self):
        self.register(); packet = prepare(self.root)
        draft = self.run_packet(packet)
        self.assertTrue(draft["engine_verified"], draft)
        self.assertEqual(DRAFT, draft["result"])
        same = self.run_packet(packet)
        self.assertEqual(draft["job_id"], same["job_id"])
        self.assertEqual(1, len(self.model_calls))
        # Intent/context separation must preserve all restrictions at the model boundary.
        from .tasks import brief
        for constraint in brief()["constraints"]:
            self.assertIn(constraint, self.model_inputs[0])
        review_packet = self.runtime.review_packet(draft["job_id"])
        review = self.run_packet(review_packet)
        self.assertTrue(review["engine_verified"], review)
        self.assertEqual(REVIEW, review["result"])
        self.assertEqual(2, len(self.model_calls))
        self.assertEqual(2, self.job_count())
        self.assertFalse(review["publish_allowed"])
        self.assertFalse(review["business_effect_verified"])
        with self.runtime.read() as con:
            self.assertEqual(0, con.execute("SELECT count(*) FROM business_evidence").fetchone()[0])

    def test_changed_payload_and_other_tenant_are_rejected(self):
        self.register(); packet = prepare(self.root)
        changed = copy.deepcopy(packet)
        changed["payload"]["original_request"] = "다른 업무를 실행"
        changed["request_digest"] = digest(changed["payload"])
        with self.assertRaisesRegex(ValueError, "EXACT_REQUEST_APPROVAL_REQUIRED"):
            self.run_packet(changed)
        draft = self.run_packet(packet)
        with self.base.connect() as con:
            con.execute("UPDATE jobs SET tenant_id='unrelated-test-only' WHERE job_id=?", (draft["job_id"],))
        with self.assertRaisesRegex(ValueError, "SAJU_JOB_NOT_FOUND"):
            self.runtime.result(draft["job_id"])

    def test_unverified_result_cannot_be_claimed_or_sent_to_review(self):
        self.register(); draft = self.run_packet(prepare(self.root))
        with self.base.connect() as con:
            con.execute("UPDATE job_items SET evidence_json='{}' WHERE job_id=?", (draft["job_id"],))
        self.assertFalse(self.runtime.result(draft["job_id"])["engine_verified"])
        self.assertIsNone(self.runtime.result(draft["job_id"])["result"])
        with self.assertRaisesRegex(ValueError, "VERIFIED_DRAFT_REQUIRED"):
            self.runtime.review_packet(draft["job_id"])

    def test_provider_failure_is_not_completed_or_automatically_retried(self):
        self.register(); packet = prepare(self.root)
        failure = RuntimeError("TEST_PROVIDER_UNAVAILABLE")
        with patch.object(self.executor, "_llm_task_synthesis", side_effect=failure) as model:
            first = self.run_packet(packet)
            self.assertFalse(first["engine_verified"])
            self.assertIsNone(first["result"])
            second = self.run_packet(packet)
            self.assertEqual(first["job_id"], second["job_id"])
            self.assertEqual(1, model.call_count)

    def test_goal_scope_and_source_drift_block_execution(self):
        self.register(); packet = prepare(self.root)
        with self.base.connect() as con:
            con.execute("UPDATE goal_contracts SET workpack_scope_json='[]' WHERE goal_id=?", (GOAL,))
        with self.assertRaisesRegex(ValueError, "SAJU_GOAL_SCOPE_MISMATCH"):
            self.run_packet(packet)
        self.assertEqual(0, self.job_count())
        path = self.root / "contract/task_contract.py"
        path.write_text(path.read_text() + "\n# TEST DRIFT\n")
        with self.assertRaisesRegex(ValueError, "BASE_SOURCE_DRIFT"):
            prepare(self.root)

    def test_concurrent_admission_lock_does_not_queue_another_job(self):
        import fcntl
        self.register(); packet = prepare(self.root)
        with self.db.open("rb") as held:
            fcntl.flock(held.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):
                self.run_packet(packet)
        self.assertEqual(0, self.job_count())
        self.assertEqual([], self.model_calls)

    def test_review_is_bound_to_the_verified_draft_not_edited_packet_text(self):
        self.register(); draft = self.run_packet(prepare(self.root))
        packet = self.runtime.review_packet(draft["job_id"])
        changed = copy.deepcopy(packet)
        changed["payload"]["original_request"] += " 고객 비공개 자료"
        changed["request_digest"] = digest(changed["payload"])
        with self.assertRaisesRegex(ValueError, "EXACT_REQUEST_APPROVAL_REQUIRED"):
            self.run_packet(changed)
        self.assertEqual(1, self.job_count())
        self.assertEqual(1, len(self.model_calls))


if __name__ == "__main__":
    unittest.main()
