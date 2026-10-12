"""Focused integration against reviewed Base/Growth, with network blocked.

Only the model completion and director are fixtures. Factory compile/admission,
dependency execution, native readback, receipt ingestion, and the next Growth
context/decision all use the actual reviewed engines in a temporary directory.
"""
import copy
import hashlib
import importlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from .handler import CAPABILITY, DOMAIN, WORKPACK, public_brief
from .runtime import build_agent, advance_once
from .telemetry import canonical, digest, aggregate
from .test_telemetry import WINDOW, sample

HERE = Path(__file__).parent
SOURCES = Path(os.environ.get("SAJU_AGENT_SOURCES", "/workspace/saju-agent-integration-upstream"))


class IntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sys.path[:0] = [str(SOURCES / "agent-base/contract"), str(SOURCES / "insurance-growth-agent")]
        cls.network = patch.object(socket.socket, "connect", side_effect=AssertionError("NETWORK_FORBIDDEN"))
        cls.network.start(); cls.addClassCleanup(cls.network.stop)
        cls.process = patch.object(subprocess, "run", side_effect=AssertionError("MODEL_PROCESS_FORBIDDEN"))
        cls.process.start(); cls.addClassCleanup(cls.process.stop)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="saju-agent-integration-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.env = patch.dict(os.environ, {"AGENT_BASE_ROOT": str(self.root), "AGENT_BASE_DB": str(self.root / "base.sqlite"), "AGENT_BASE_GOAL_AGENT_V1": "1"})
        self.env.start(); self.addCleanup(self.env.stop)
        import base_runtime, goal_agent_v1, workpack_admission
        self.base = importlib.reload(base_runtime)
        self.goal = importlib.reload(goal_agent_v1)
        self.admission = importlib.reload(workpack_admission)
        self.calls = []
        self.contexts = []

    def provision(self, rows=None, realm="TEST", model_enabled=False):
        """Explicit test authority, never installed or presented as operator approval."""
        self.base.init_schema()
        draft = json.loads((HERE / "unreviewed-draft.json").read_text())
        pins = {}
        def pin(value):
            if isinstance(value, dict):
                if set(value) == {"ref", "sha256"}:
                    value["sha256"] = digest({"TEST_REVIEW_ONLY": value["ref"]})
                    pins[value["ref"]] = value["sha256"]
                else:
                    for item in value.values(): pin(item)
            elif isinstance(value, list):
                for item in value: pin(item)
        pin(draft)
        native = self.root / "workpacks" / WORKPACK
        native.mkdir(parents=True)
        for name in ("manifest.json", "native_handler.py", "handler.py", "telemetry.py", "brief.json"):
            shutil.copyfile(HERE / name, native / name)
        templates = {}
        for action in draft["actions"]:
            template = {k: copy.deepcopy(action[k]) for k in ("capability_id", "effect", "verifier", "readback", "required_tools", "expected_outputs")}
            template.update(sha256=action["template"]["sha256"], workpack_id=WORKPACK,
                parameters_schema={"type": "object", "additionalProperties": False, "required": ["kind"],
                                   "properties": {"kind": {"const": action["parameters"]["kind"]}}})
            templates[action["template"]["ref"]] = template
        telemetry = aggregate(sample() if rows is None else rows, **{**WINDOW, "realm": realm})
        bundle = {"schema": json.loads((SOURCES / "agent-base/contract/schemas/workpack.v1.schema.json").read_text()),
                  "templates": templates, "pins": pins, "synthetic_only": False, "public_local_only": True,
                  "inputs": {"brief": public_brief(), "aggregate": telemetry,
                             "model_policy": {"enabled": model_enabled, "incremental_cost_confirmed_zero": model_enabled, "approval_ref": "TEST_AUTHORITY_NOT_ACTIVATION"}},
                  "native_files": {WORKPACK: {file.name: hashlib.sha256(file.read_bytes()).hexdigest() for file in native.iterdir()}}}
        registry = {"bundle": bundle, "release_identity": draft["release_identity"]}
        (self.root / "workpack-reviewed.json").write_text(canonical(registry))
        policy = {"domain": DOMAIN, "environment": "SANDBOX", "policy_version": "saju-public-local-v1",
                  "approval_ref": "TEST_AUTHORITY_NOT_ACTIVATION", "registry_sha256": digest(registry)}
        self.goal.create_goal({"tenant_id": "saju-development", "goal_id": "saju-preparation", "goal_template_id": "TEST_ONLY",
            "goal_name": "Local development artifact readback", "workpack_scope": [WORKPACK], "capability_scope": [CAPABILITY],
            "target_metric_id": "REVIEW_READY_PACK", "target_value": 1, "target_unit": "pack", "quality_rule_ref": "saju-agent:document-exists",
            "start_at": "2026-01-01T00:00:00+00:00", "deadline_at": "2099-01-01T00:00:00+00:00", "budget_state": "KNOWN",
            "budget_currency": "KRW", "budget_hard_limit_amount": 0, "goal_status": "ACTIVE", "approval_mode": "RECOMMENDATION_ONLY",
            "resource_constraints": [{"workpack_factory": policy}]})
        return registry

    def director(self, context):
        self.contexts.append(copy.deepcopy(context))
        snap = context["current_snapshot"]
        if context["task"] == "SELF_ASSESS":
            return {"bottleneck": "TEST_ADVISORY", "unknowns": ["actual model quality", "live effect"], "data_needs": [], "capability_gaps": [], "uncertainty": 1, "rationale": "Fixture director for routing only"}
        has_feedback = bool(snap["artifact_evidence"] and snap["advisory_documents"])
        errors = snap["aggregate"]["error_sessions"]
        next_action = "REVIEW_TIMEOUT_RETRY_HYPOTHESIS" if errors.get("analysis_timeout", 0) else "REVIEW_COPY_HYPOTHESIS"
        if snap["aggregate"]["state"] == "NO_DATA": next_action = "REQUEST_OBSERVATION_COVERAGE"
        return {"mode": "WAIT" if has_feedback else "EXECUTE", "rationale": "Fixture decision based on actual ingested context",
                "expected_value": 1, "expected_cost": 0, "next_action": next_action}

    def agent(self):
        from common_growth.contracts import Scope
        scope = Scope("saju-development", "saju-preparation", DOMAIN, "SANDBOX", 1, "saju-public-local-v1")
        return build_agent(base=self.base, agent_base_root=SOURCES / "agent-base", scope=scope,
            state_parent=self.root / "growth", director=self.director, evaluator=lambda _c: {}, brain=lambda _c: {})

    def stub_model(self):
        original = self.base.load_workpack
        def load(workpack_id):
            manifest, module = original(workpack_id)
            implementation = module._implementation
            def fixture_implementation():
                handler = implementation()
                def fixture_complete(context, prompt):
                    kind = context["payload"]["parameters"]["kind"]
                    self.calls.append((kind, prompt))
                    # Mandatory TEST wording prevents this content being mistaken for a model run.
                    texts = {
                        "draft": "\n".join(f"주제: TEST {i}\n제목: 합성 원고\n게시용 글 초안: 실제 모델 응답이 아닌 연결 검증용 자료입니다.\n공유문구: 합성 자료입니다.\n선택 이유: 구조 검증" for i in range(3)),
                        "review": "최종 판정: TEST 검토\n근거: 합성 자료로 품질을 평가하지 않습니다.\n수정안: 모델 검증 필요\n대표 확인사항: 실제 공개 승인 아님",
                        "improve": "관측: TEST 집계\n한계: 실제 유입 성과 아님\n다음 실험: 승인 후 흐름 관측\n성공 기준: 충분한 세션에서 순서 있는 전환\n대표 확인사항: 배포와 수집 별도 승인",
                    }
                    return {"text": texts[kind], "synthetic": True}
                handler.complete = fixture_complete
                return handler
            module._implementation = fixture_implementation
            return manifest, module
        return patch.object(self.base, "load_workpack", side_effect=load)

    def test_public_compile_execute_ingest_and_next_growth_decision(self):
        self.provision()
        agent, assets = self.agent()
        with self.stub_model():
            result = advance_once(base=self.base, agent=agent, assets=assets, invocation_key="test-one")
            self.assertEqual("LOCAL_REVIEW_READY", result["state"], result)
            self.assertEqual(["draft", "review", "improve"], [kind for kind, _ in self.calls])
            self.assertEqual(3, len(result["evidence_ids"]))
            self.assertEqual("WAIT", result["next_decision"]["status"])
            context = self.contexts[-1]
            self.assertEqual(0, len(context["known_beliefs"]))
            self.assertEqual(3, len(context["current_snapshot"]["artifact_evidence"]))
            self.assertEqual(2, len(context["current_snapshot"]["advisory_documents"]))
            self.assertTrue(all(doc["synthetic"] for doc in context["current_snapshot"]["advisory_documents"]))
            self.assertNotIn("sessionId", canonical(context))
            again = advance_once(base=self.base, agent=agent, assets=assets, invocation_key="test-one")
            self.assertEqual(result["evidence_ids"], again["evidence_ids"])
            self.assertEqual(3, len(self.calls))
        with assets.con() as con:
            self.assertEqual({"RAW"}, {row[0] for row in con.execute("SELECT trust_state FROM growth_evidence_assets")})
        receipts = self.admission.outcomes(self.base, result["run_id"])
        self.assertTrue(all(row["synthetic"] for row in receipts))
        self.assertEqual(0, sum(row["evidence"]["evidence_type"] == "OUTCOME" for row in receipts))
        self.assertEqual("ACTIVE", self.goal.get_goal(agent.scope.tenant_id, agent.scope.goal_id)["goal_status"])
        import autonomous_growth_brain_bridge as bridge
        request = bridge._request_text("META_DECIDE", self.contexts[-1])
        for marker in ("data_quality", "TEST", "funnel_metrics", "quality_advisory", "ADVISORY_NOT_APPROVAL", "local:saju-artifact:"):
            self.assertIn(marker, request)
        self.assertNotIn("sessionId", request)

    def test_actual_aggregate_changes_following_fixture_director_input(self):
        self.provision(sample() + [{**sample()[0], "event": "analysis_timeout", "eventId": "timeout-00000000000001", "receivedAt": "2026-10-12T00:00:09Z"}])
        agent, assets = self.agent()
        with self.stub_model():
            result = advance_once(base=self.base, agent=agent, assets=assets, invocation_key="test-timeout")
        self.assertEqual("REVIEW_TIMEOUT_RETRY_HYPOTHESIS", result["next_decision"]["next_action"])
        self.assertTrue(any('"analysis_timeout":1' in prompt for kind, prompt in self.calls if kind == "improve"))
        import autonomous_growth_brain_bridge as bridge
        request = bridge._request_text("META_DECIDE", self.contexts[-1])
        self.assertIn('"analysis_timeout":1', request)

    def test_absent_data_not_invented_by_next_cycle(self):
        self.provision([])
        agent, assets = self.agent()
        with self.stub_model():
            result = advance_once(base=self.base, agent=agent, assets=assets, invocation_key="test-empty")
        self.assertEqual("REQUEST_OBSERVATION_COVERAGE", result["next_decision"]["next_action"])
        self.assertIsNone(self.contexts[-1]["current_snapshot"]["aggregate"]["counts"])

    def test_default_model_gate_does_not_call_provider(self):
        self.provision()
        agent, assets = self.agent()
        result = advance_once(base=self.base, agent=agent, assets=assets, invocation_key="test-off")
        self.assertEqual("BASE_RECOVERY_REQUIRED", result["state"])
        self.assertFalse(result["evidence_ids"])
        self.assertFalse(self.calls)
        with self.base.connect() as con:
            incidents = [dict(row) for row in con.execute("SELECT * FROM goal_incidents")]
        self.assertIn("APPROVAL_REQUIRED", canonical(incidents))

    def test_existing_brain_default_binding_checks_policy_before_process(self):
        self.provision(); agent, _ = self.agent()
        default, _ = build_agent(base=self.base, agent_base_root=SOURCES / "agent-base", scope=agent.scope, state_parent=self.root / "default-growth")
        with self.assertRaisesRegex(RuntimeError, "ACTIVATION_AND_COST_APPROVAL_REQUIRED"):
            default.step()

    def test_partial_resume_and_foreign_scope_ingestion(self):
        from dataclasses import replace
        self.provision(); agent, assets = self.agent()
        with self.stub_model():
            first = advance_once(base=self.base, agent=agent, assets=assets, invocation_key="resume", max_ticks=1)
            self.assertEqual("BASE_RECOVERY_REQUIRED", first["state"])
            self.assertIsNone(first["next_decision"])
            second = advance_once(base=self.base, agent=agent, assets=assets, invocation_key="resume")
        self.assertEqual("LOCAL_REVIEW_READY", second["state"])
        self.assertEqual(["draft", "review", "improve"], [kind for kind, _ in self.calls])
        with self.assertRaisesRegex(ValueError, "SCOPE_MISMATCH"):
            assets.ingest_base_outcomes(replace(agent.scope, tenant_id="other"), self.base, second["run_id"])

    def test_model_response_loss_enters_base_unknown_without_reexecution(self):
        self.provision(model_enabled=True); agent, _ = self.agent()
        spec = agent.step()["proposal"]["workpack_spec"]
        run = self.admission.admit_workpack(self.base, spec, "unknown-response")
        import agentic_executor
        with patch.object(agentic_executor, "execute_tool_free", side_effect=TimeoutError("fixture response loss")) as provider:
            first = self.base.tick("SANDBOX", factory_run_id=run["run_id"])
            second = self.base.tick("SANDBOX", factory_run_id=run["run_id"])
        self.assertEqual("SUBMIT_UNKNOWN", first["status"], first)
        self.assertEqual("SUBMIT_UNKNOWN", second["status"], second)
        self.assertEqual(1, provider.call_count)
        self.assertEqual([], self.admission.outcomes(self.base, run["run_id"]))

    def test_contract_denies_private_mixed_live_effect_and_missing_public_optin(self):
        registry = self.provision()
        agent, _ = self.agent()
        spec = agent.step()["proposal"]["workpack_spec"]
        trusted = self.admission.trusted_snapshot(self.base, agent.scope.tenant_id, agent.scope.goal_id)
        from workpack_contract import validate_spec, artifact_digest
        for mutation in (lambda s: s["inputs"]["brief"].update(classification="TENANT_PRIVATE"),
                         lambda s: s["inputs"]["brief"].update(classification="SYNTHETIC"),
                         lambda s: s["constraints"]["safety"].update(real_spend_authorized=True),
                         lambda s: s["actions"][0].update(effect="EXTERNAL_WRITE")):
            bad = copy.deepcopy(spec); mutation(bad); bad["release_identity"]["artifact_digest"] = artifact_digest(bad)
            with self.assertRaises(ValueError): validate_spec(bad, trusted, registry["bundle"], registry["bundle"]["schema"])
        bad_bundle = copy.deepcopy(registry["bundle"]); bad_bundle.pop("public_local_only")
        with self.assertRaisesRegex(ValueError, "NATIVE_CAPABILITY"):
            validate_spec(spec, trusted, bad_bundle, bad_bundle["schema"])
        # Existing SYNTHETIC path remains valid without enabling public inputs.
        synthetic = copy.deepcopy(spec)
        for value in synthetic["inputs"].values(): value["classification"] = "SYNTHETIC"
        synthetic["release_identity"]["artifact_digest"] = artifact_digest(synthetic)
        legacy = {**registry["bundle"], "synthetic_only": True, "public_local_only": False}
        validate_spec(synthetic, trusted, legacy, legacy["schema"])

    def test_goal_pin_and_native_dependency_drift_block_claims(self):
        self.provision()
        agent, _ = self.agent()
        spec = agent.step()["proposal"]["workpack_spec"]
        run = self.admission.admit_workpack(self.base, spec, "drift")
        (self.root / "workpacks" / WORKPACK / "telemetry.py").write_text("raise RuntimeError('DRIFT')")
        self.assertEqual("NO_WORK", self.base.tick("SANDBOX", factory_run_id=run["run_id"])["status"])
        registry_path = self.root / "workpack-reviewed.json"
        registry = json.loads(registry_path.read_text()); registry["bundle"]["public_local_only"] = False
        registry_path.write_text(canonical(registry))
        with self.assertRaisesRegex(ValueError, "REGISTRY_AUTHORITY_MISMATCH"):
            agent.step()

    def test_provenance_requires_explicit_false_on_exact_receipt(self):
        self.provision(); agent, assets = self.agent()
        with self.stub_model(): result = advance_once(base=self.base, agent=agent, assets=assets, invocation_key="provenance")
        with self.base.connect() as con:
            rows = con.execute("SELECT id,evidence_json FROM job_items").fetchall()
            for row in rows:
                proof = json.loads(row["evidence_json"]); proof.pop("synthetic")
                con.execute("UPDATE job_items SET evidence_json=? WHERE id=?", (canonical(proof), row["id"]))
        self.assertTrue(all(x["synthetic"] for x in self.admission.outcomes(self.base, result["run_id"])))
        # Exercise attestation projection only; this is not a real model run.
        with self.base.connect() as con:
            for row in rows:
                proof = json.loads(row["evidence_json"]); proof["synthetic"] = False
                con.execute("UPDATE job_items SET evidence_json=? WHERE id=?", (canonical(proof), row["id"]))
        self.assertTrue(all(not x["synthetic"] for x in self.admission.outcomes(self.base, result["run_id"])))
        with self.assertRaisesRegex(ValueError, "LEARNING_SOURCE_CONFLICT"):
            assets.ingest_base_outcomes(agent.scope, self.base, result["run_id"])


if __name__ == "__main__":
    unittest.main()
