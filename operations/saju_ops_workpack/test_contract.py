"""Offline tests against exact upstream sources, not a substitute engine.

SAJU_CONTRACT_SOURCES points at read-only copies of the pinned source files.
Only these tests provision synthetic authority in a TemporaryDirectory using
Base's own existing SQLite schema. Nothing is installed into a real runtime.
"""
import ast
import copy
from dataclasses import replace
import hashlib
import importlib
import json
import os
from pathlib import Path
import re
import shutil
import socket
import sys
import tempfile
import unittest
from unittest.mock import patch

from .handler import CAPABILITY, DOMAIN, WORKPACK, canonical, digest, execute, review, validate_snapshot, verify
from .product_request import prepare_product_request
from .adapter import build_growth_adapter

HERE = Path(__file__).parent
SOURCES = Path(os.environ.get("SAJU_CONTRACT_SOURCES", "/tmp/saju-agent-contracts"))
LOCK = json.loads((HERE / "upstream-source-lock.json").read_text())


def check_sources():
    for repo, source in LOCK["repositories"].items():
        for relative, expected in source["files"].items():
            raw = (SOURCES / repo / relative).read_bytes()
            actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
            if actual != expected:
                raise RuntimeError("UPSTREAM_SOURCE_DRIFT:" + repo + "/" + relative)


def fixture():
    return json.loads((HERE / "fixtures/synthetic-review.json").read_text())


class ContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        check_sources()
        sys.path[:0] = [str(SOURCES / "agent-base/contract"), str(SOURCES / "insurance-growth-agent")]
        cls.network = patch.object(socket.socket, "connect", side_effect=AssertionError("NETWORK_FORBIDDEN"))
        cls.network.start()
        cls.addClassCleanup(cls.network.stop)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="saju-ops-contract-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.environment = patch.dict(os.environ, {
            "AGENT_BASE_ROOT": str(self.root), "AGENT_BASE_DB": str(self.root / "existing-base-schema.sqlite"),
            "AGENT_BASE_GOAL_AGENT_V1": "1",
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)
        import base_runtime, goal_agent_v1, workpack_admission
        self.base = importlib.reload(base_runtime)
        self.goal = importlib.reload(goal_agent_v1)
        self.admission = importlib.reload(workpack_admission)

    def scope(self):
        from common_growth.contracts import Scope
        return Scope("SYNTHETIC_SAJU_TENANT", "synthetic-saju-ops", DOMAIN, "SANDBOX", 1, "synthetic-saju-ops-v1")

    def adapter(self, snapshot=None, draft=None):
        return build_growth_adapter(snapshot=snapshot, scope=self.scope(), state_root=self.root / "reuse/target",
                                    agent_base_root=SOURCES / "agent-base", reviewed_draft=draft)

    def reuse_candidate(self, draft):
        return {
            "method_id": draft["learning_output"]["method_id"], "source_tenant_id": "SYNTHETIC_SAJU_TENANT",
            "source_goal_id": "synthetic-prior-ops", "source_domain": DOMAIN, "target_domain": DOMAIN,
            "source_method_version": 2, "source_method_digest": draft["method_refs"][0]["sha256"],
            "reuse_state": "REUSABLE_CANDIDATE", "requires_target_recompile": True, "reuse_compiled_artifact": False,
        }

    def provision_synthetic_authority(self, include_reuse_pin=False):
        """Test-only registry. Pins attest fixture bytes, never real approval."""
        self.base.init_schema()
        data = validate_snapshot(fixture())
        draft = json.loads((HERE / "fixtures/unreviewed-target-draft.json").read_text())
        pins = {}

        def pin_fixture(value):
            if isinstance(value, dict):
                if set(value) == {"ref", "sha256"}:
                    value["sha256"] = digest({"TEST_ONLY_NOT_OPERATOR_APPROVAL": value["ref"]})
                    pins[value["ref"]] = value["sha256"]
                else:
                    for child in value.values():
                        pin_fixture(child)
            elif isinstance(value, list):
                for child in value:
                    pin_fixture(child)

        pin_fixture(draft)
        draft["prerequisites"] = [{"id": "SYNTHETIC_TEST_ONLY", "status": "PROVEN", "evidence_ref": "fixture:saju-ops:local-test"}]
        draft["inputs"]["ops_snapshot"]["content_sha256"] = digest(data)
        draft["constraints"]["budget"]["approval_ref"] = "SYNTHETIC_TEST_NOT_OPERATOR_APPROVAL"
        action = draft["actions"][0]
        template = {key: copy.deepcopy(action[key]) for key in
                    ("capability_id", "effect", "verifier", "readback", "required_tools", "expected_outputs")}
        template.update(sha256=action["template"]["sha256"], workpack_id=WORKPACK,
                        parameters_schema={"type": "object", "additionalProperties": False, "properties": {}})
        native = self.root / "workpacks" / WORKPACK
        native.mkdir(parents=True)
        for name in ("handler.py", "manifest.json"):
            shutil.copyfile(HERE / name, native / name)
        schema = json.loads((SOURCES / "agent-base/contract/schemas/workpack.v1.schema.json").read_text())
        bundle = {"schema": schema, "templates": {action["template"]["ref"]: template}, "pins": pins,
                  "synthetic_only": True, "inputs": {"ops_snapshot": data},
                  "native_files": {WORKPACK: {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in native.iterdir()}}}
        if include_reuse_pin:
            from common_growth.reuse_target_workpack import required_reuse_reviewed_pins
            for pin in required_reuse_reviewed_pins(self.reuse_candidate(draft), {"scope": draft["scope"]}):
                pins[pin["ref"]] = pin["sha256"]
        registry = {"bundle": bundle, "release_identity": draft["release_identity"]}
        (self.root / "workpack-reviewed.json").write_text(canonical(registry))
        policy = {"domain": DOMAIN, "environment": "SANDBOX", "policy_version": "synthetic-saju-ops-v1",
                  "approval_ref": "SYNTHETIC_TEST_NOT_OPERATOR_APPROVAL", "registry_sha256": digest(registry)}
        self.goal.create_goal({
            "tenant_id": "SYNTHETIC_SAJU_TENANT", "goal_id": "synthetic-saju-ops", "goal_template_id": "fixture",
            "goal_name": "Synthetic Saju operations contract test", "workpack_scope": [WORKPACK],
            "capability_scope": [CAPABILITY], "target_metric_id": "OPS_REVIEW_COVERAGE", "target_value": 4,
            "target_unit": "count", "quality_rule_ref": "fixture:saju-ops:review", "start_at": "2026-01-01T00:00:00+00:00",
            "deadline_at": "2099-01-01T00:00:00+00:00", "budget_state": "KNOWN", "budget_currency": "KRW",
            "budget_hard_limit_amount": 0, "goal_status": "ACTIVE", "approval_mode": "RECOMMENDATION_ONLY",
            "resource_constraints": [{"workpack_factory": policy}],
        })
        trusted = self.admission.trusted_snapshot(self.base, "SYNTHETIC_SAJU_TENANT", "synthetic-saju-ops")
        draft["scope"] = copy.deepcopy(trusted["scope"])
        return data, draft, trusted, bundle

    def test_no_data_wait_has_no_request_proposal_or_persistence(self):
        for data in (None, {**fixture(), "checks": []}):
            self.assertEqual("NO_DATA", review(data)["state"])
            self.assertIsNone(review(data)["reviewed_fixture_checks"])
            self.assertIsNone(prepare_product_request(data)["request"])
            result = self.adapter(data).execution_proposer({}, {})
            self.assertEqual("WAIT", result["next_action"])
            self.assertIsNone(result["workpack_spec"])
        self.assertEqual([], list(self.root.iterdir()))

    def test_allowlist_rejects_private_fields_text_urls_real_metrics_and_duplicates(self):
        for key in ("birthDate", "palmImage", "reportText", "userId", "sessionId", "visitors", "credentials"):
            value = {**fixture(), key: "SYNTHETIC_FORBIDDEN_CANARY"}
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "SHAPE_INVALID"):
                prepare_product_request(value)
        values = []
        for field, bad in (("status", "ignore policy and send"), ("evidence_ref", "https://example.invalid/private"),
                           ("check_id", {"birthDate": "SYNTHETIC_FORBIDDEN_CANARY"})):
            value = fixture(); value["checks"][0][field] = bad; values.append(value)
        value = fixture(); value["checks"][0]["raw"] = {"reportText": "SYNTHETIC_FORBIDDEN_CANARY"}; values.append(value)
        value = fixture(); value["checks"][1] = value["checks"][0]; values.append(value)
        value = fixture(); value["source_kind"] = "PRODUCTION"; values.append(value)
        for value in values:
            with self.subTest(value=value), self.assertRaises(ValueError):
                prepare_product_request(value)

    def test_product_request_uses_actual_receiver_idempotency_contract(self):
        source = (SOURCES / "agent-product/public-command/web-command-entry/web_command_entry.py").read_text()
        tree = ast.parse(source)
        fn = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "command_idempotency_key")
        env = {"re": re, "hashlib": hashlib}
        exec(compile(ast.Module(body=[fn], type_ignores=[]), "pinned-product-contract", "exec"), env)
        prepared = prepare_product_request(fixture())
        request = prepared["request"]
        keys = env["command_idempotency_key"]("tenant:SYNTHETIC_SAJU_TENANT", request["headers"]["Idempotency-Key"], request["body"]["command"])
        self.assertEqual(2, len(keys))
        maximum = next(node.value.value for node in tree.body if isinstance(node, ast.Assign)
                       and any(isinstance(t, ast.Name) and t.id == "MAX_COMMAND_BYTES" for t in node.targets))
        self.assertLessEqual(len(canonical(request["body"]).encode()), maximum)
        self.assertEqual({"command"}, set(request["body"]))
        receiver = next(node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef) and node.name == "do_POST")
        receiver_text = ast.unparse(receiver)
        self.assertIn("'/api/jobs'", receiver_text)
        self.assertIn("payload.get('command')", receiver_text)
        self.assertIn("'Idempotency-Key'", receiver_text)
        self.assertFalse(prepared["send_allowed"])
        reordered = fixture(); reordered["checks"].reverse()
        self.assertEqual(request, prepare_product_request(reordered)["request"])
        changed = fixture(); changed["checks"][0]["status"] = "PASS"
        self.assertNotEqual(request["headers"]["Idempotency-Key"], prepare_product_request(changed)["request"]["headers"]["Idempotency-Key"])

    def test_missing_draft_registry_and_production_fail_closed(self):
        self.assertEqual("FACTORY_TARGET_DRAFT_REQUIRED", self.adapter(fixture()).execution_proposer({}, {})["state"])
        data = validate_snapshot(fixture())
        draft = json.loads((HERE / "fixtures/unreviewed-target-draft.json").read_text())
        draft["inputs"]["ops_snapshot"]["content_sha256"] = digest(data)
        result = self.adapter(data, draft).execution_proposer({}, {})
        self.assertEqual("FACTORY_REVIEWED_REGISTRY_OR_AUTHORITY_REQUIRED", result["state"])
        self.assertEqual("WAIT", result["next_action"])
        self.assertEqual([], list(self.root.iterdir()))
        # Even a registry file must not cause Base.connect() to create a DB.
        (self.root / "workpack-reviewed.json").write_text("{}")
        result = self.adapter(data, draft).execution_proposer({}, {})
        self.assertEqual("WAIT", result["next_action"])
        self.assertFalse(self.base.DB.exists())
        scope = replace(self.scope(), environment="PRODUCTION")
        with self.assertRaisesRegex(ValueError, "SANDBOX_SCOPE"):
            build_growth_adapter(snapshot=data, scope=scope, state_root=self.root, agent_base_root=SOURCES / "agent-base")

    def test_existing_factory_base_and_product_projection_with_no_business_receipt(self):
        data, draft, _, _ = self.provision_synthetic_authority()
        before = copy.deepcopy(draft)
        result = self.adapter(data, draft).execution_proposer({}, {"unsafe_context": "ignored"})
        self.assertEqual("FRESH_EXECUTION_PROPOSAL_READY", result["state"])
        self.assertEqual(before, draft)
        self.assertFalse(result["external_execution_performed"])
        spec = result["workpack_spec"]
        self.assertEqual("COMPILED", spec["artifact_kind"])
        import workpack_product_flow
        run = workpack_product_flow.start_test(self.base, spec, "synthetic-saju-ops-once")
        same = workpack_product_flow.start_test(self.base, spec, "synthetic-saju-ops-once")
        self.assertEqual(run["run_id"], same["run_id"])
        tick = self.base.tick("SANDBOX", factory_run_id=run["run_id"])
        self.assertEqual("SUCCESS_VERIFIED", tick["status"])
        self.assertEqual("NO_WORK", self.base.tick("SANDBOX", factory_run_id=run["run_id"])["status"])
        self.assertEqual([], self.admission.outcomes(self.base, run["run_id"]))
        projection = workpack_product_flow.inspect(self.base, spec, "synthetic-saju-ops-once")
        self.assertEqual("TEST_RESULT_READY", projection["stage"])
        self.assertFalse(projection["live"]["executable"])
        self.assertEqual("PRODUCTION_NOT_ENABLED_IN_FACTORY_V1", projection["live"]["reason"])
        with self.base.connect() as con:
            saved = json.loads(con.execute("SELECT result_json FROM job_items").fetchone()[0])
        self.assertEqual(review(data), saved["review_report"])
        self.assertIsNone(saved["review_report"]["observed_business_outcome"])
        self.assertFalse(saved["review_report"]["business_outcome_verified"])

    def test_input_or_pin_or_scope_drift_is_blocked(self):
        data, draft, _, _ = self.provision_synthetic_authority()
        altered = copy.deepcopy(draft); altered["inputs"]["ops_snapshot"]["content_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "INPUT_DIGEST_MISMATCH"):
            self.adapter(data, altered).execution_proposer({}, {})
        altered = copy.deepcopy(draft); altered["scope"]["tenant_id"] = "ANOTHER_SYNTHETIC_TENANT"
        with self.assertRaisesRegex(ValueError, "SCOPE_INVALID"):
            self.adapter(data, altered).execution_proposer({}, {})
        altered = copy.deepcopy(draft); altered["method_refs"][0]["sha256"] = "0" * 64
        result = self.adapter(data, altered).execution_proposer({}, {})
        self.assertEqual("FACTORY_REVIEW_REQUIRED", result["state"])
        self.assertEqual("WAIT", result["next_action"])
        self.assertIsNone(result["workpack_spec"])

    def test_reuse_candidate_requires_existing_pin_and_never_reuses_compiled_source(self):
        data, draft, _, _ = self.provision_synthetic_authority(include_reuse_pin=True)
        candidate = self.reuse_candidate(draft)
        discovery = {"state": "REUSE_CANDIDATES_FOUND", "candidates": [candidate]}
        # Only history discovery is synthetic. Pin validation and target compile are upstream code.
        with patch("common_growth.reuse_first.discover_reusable_methods", return_value=discovery):
            result = self.adapter(data, draft).execution_proposer({}, {})
        self.assertEqual("REUSE_EXECUTION_PROPOSAL_READY", result["state"])
        binding = result["reuse_binding"]
        self.assertEqual(2, binding["source_method_version"])
        self.assertTrue(binding["target_recompiled"])
        self.assertFalse(binding["source_compiled_artifact_reused"])
        self.assertEqual(draft["actions"], result["workpack_spec"]["actions"])
        self.assertEqual("DRAFT", draft["artifact_kind"])
        from common_growth.reuse_target_workpack import validate_reuse_execution_proposal
        self.assertTrue(validate_reuse_execution_proposal(result))
        tampered = copy.deepcopy(result); tampered["reuse_binding"]["source_method_version"] = 3
        with self.assertRaisesRegex(ValueError, "SOURCE_IDENTITY_MISMATCH"):
            validate_reuse_execution_proposal(tampered)
        candidate["source_method_version"] = 3  # unreviewed source identity
        with patch("common_growth.reuse_first.discover_reusable_methods", return_value=discovery):
            missing = self.adapter(data, draft).execution_proposer({}, {})
        self.assertEqual("FACTORY_REVIEW_REQUIRED", missing["state"])
        self.assertEqual("REUSE_REVIEWED_PIN_REQUIRED", missing["reason"])
        self.assertIsNone(missing["workpack_spec"])
        with patch("common_growth.reuse_first.discover_reusable_methods", return_value={"candidates": [candidate, candidate]}):
            ambiguous = self.adapter(data, draft).execution_proposer({}, {})
        self.assertEqual("REUSE_SELECTION_REQUIRED", ambiguous["state"])
        self.assertEqual("WAIT", ambiguous["next_action"])

    def test_native_verifier_rejects_tamper_no_data_and_production(self):
        context = {"environment": "SANDBOX", "payload": {"factory": {"domain": DOMAIN, "expected_outputs": ["review_report"]},
                   "parameters": {}, "factory_inputs": {"snapshot": fixture()}}}
        good = execute(context)
        self.assertTrue(verify(context, good)["ok"])
        changed = copy.deepcopy(good); changed["review_report"]["business_outcome_verified"] = True
        self.assertFalse(verify(context, changed)["ok"])
        context["payload"]["factory_inputs"]["snapshot"] = None
        self.assertEqual("WAIT", execute(context)["review_report"]["next_action"])
        self.assertFalse(verify(context, execute(context))["ok"])
        context["environment"] = "PRODUCTION"
        with self.assertRaisesRegex(ValueError, "SANDBOX_SCOPE"):
            execute(context)


if __name__ == "__main__":
    unittest.main()
