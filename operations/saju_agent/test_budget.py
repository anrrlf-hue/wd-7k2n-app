"""Additional cost-control checks only. All prices/receipts below are fixtures.

No real account terms, approvals, tokens, provider or model process is used.
Actual Base authority/SQLite and the existing model boundary are exercised.
"""
import copy
import importlib
import json
import socket
import subprocess
import sys
import unittest
from unittest.mock import patch, Mock

from . import test_integration as fixtures
from .telemetry import canonical, digest
HERE, SOURCES = fixtures.HERE, fixtures.SOURCES


class FixtureTransport:
    """Artificial contract for testing guard arithmetic; no provider support claim."""
    capabilities = {k: True for k in ("hard_output_limit", "preflight_total_input_tokens", "complete_usage", "single_attempt", "billable_total_ceiling")}
    def __init__(self, *, response=None, failure=None, safe=False, tokens=10, bad_usage=None):
        self.calls = 0; self.failure = failure; self.safe = safe; self.tokens = tokens
        self.response = response or {"ok": True, "output": {"details": {"json": {"result": "TEST transport output"}}}}
        self.bad_usage = bad_usage
    def prepare(self, params, **limits):
        return {**params, "TEST_ONLY_LIMITS": limits}
    def input_tokens(self, request):
        return self.tokens
    def submit(self, request):
        self.calls += 1
        self.last = request
        if self.failure: raise self.failure
        return self.response
    def verify_receipt(self, response, request, billing):
        if self.bad_usage is not None: return self.bad_usage
        return {"input_tokens": self.tokens, "output_tokens": 5, "amount": "0.01", "provider": billing["provider"],
                "model": billing["model"], "account_binding_ref": billing["account_binding_ref"], "complete": True}
    def confirm_not_submitted(self, error):
        return self.safe


class BudgetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sys.path[:0] = [str(SOURCES / "agent-base/contract"), str(SOURCES / "insurance-growth-agent")]
        cls.network = patch.object(socket.socket, "connect", side_effect=AssertionError("NETWORK_FORBIDDEN"))
        cls.network.start(); cls.addClassCleanup(cls.network.stop)
        cls.process = patch.object(subprocess, "run", side_effect=AssertionError("MODEL_PROCESS_FORBIDDEN"))
        cls.process.start(); cls.addClassCleanup(cls.process.stop)

    def setUp(self):
        self.host = fixtures.IntegrationTests("test_public_compile_execute_ingest_and_next_growth_decision")
        self.host.setUp(); self.addCleanup(self.host.doCleanups)
        self.registry = self.host.provision()
        import model_run_budget
        self.budget = importlib.reload(model_run_budget)
        self.base = self.host.base

    def approve_fixture(self, **limits):
        policy = json.loads((HERE / "model-policy.pending.json").read_text())
        policy["enabled"] = True
        policy["limits"].update(max_calls=8, max_input_tokens=80, max_output_tokens=160, per_call_input_tokens=20, per_call_output_tokens=20)
        policy["limits"].update(limits)
        policy["billing"] = {"approval_ref": "TEST_ONLY_NOT_REAL_APPROVAL", "invocation_key": "one-run",
            "account_terms_ref": "fixture:billing-not-real", "account_terms_sha256": "a" * 64,
            "account_binding_ref": "fixture:account-not-real", "provider": "fixture-provider", "model": "fixture-model",
            "currency": "XXX", "approved_max_amount": "25", "input_token_price_ceiling": "0.001",
            "output_token_price_ceiling": "0.002", "per_call_fee_ceiling": "0.01", "all_billable_usage_covered": True,
            "expires_at": "2099-01-01T00:00:00Z"}
        self.install_fixture_policy(policy)
        return policy

    def install_fixture_policy(self, policy):
        self.registry["bundle"]["inputs"]["model_policy"] = copy.deepcopy(policy)
        (self.host.root / "workpack-reviewed.json").write_text(canonical(self.registry))
        with self.base.connect() as con:
            row = con.execute("SELECT resource_constraints_json FROM goal_contracts").fetchone()
            constraints = json.loads(row[0]); factory = constraints[0]["workpack_factory"]
            factory.update(registry_sha256=digest(self.registry), model_budget_approval_ref="TEST_ONLY_NOT_REAL_APPROVAL")
            con.execute("UPDATE goal_contracts SET resource_constraints_json=?,budget_currency='XXX',budget_hard_limit_amount=25", (canonical(constraints),))
        self.scope = self.host.admission.trusted_snapshot(self.base, "saju-development", "saju-preparation")["scope"]

    def open(self):
        return self.budget.open_run(self.base, self.scope, "one-run")

    def invoke(self, binding, name, transport, **kwargs):
        return self.budget.invoke(self.base, binding, {"stage": name, "args": {"input": "TEST_ONLY"}}, transport, **kwargs)

    def test_disabled_and_zero_attestation_cannot_authorize(self):
        scope = self.host.admission.trusted_snapshot(self.base, "saju-development", "saju-preparation")["scope"]
        with self.assertRaisesRegex(ValueError, "ACTIVATION_NOT_APPROVED"):
            self.budget.open_run(self.base, scope, "one-run")
        old = {"enabled": True, "incremental_cost_confirmed_zero": True, "approval_ref": "not-authority"}
        with self.assertRaisesRegex(ValueError, "POLICY_REQUIRED"):
            self.budget.validate_policy(old)

    def test_missing_terms_amount_or_complete_costs_blocks_before_provider(self):
        valid = self.approve_fixture()
        for field in ("approved_max_amount", "account_terms_ref", "account_terms_sha256", "account_binding_ref", "approval_ref", "input_token_price_ceiling"):
            bad = copy.deepcopy(valid); bad["billing"][field] = None
            self.install_fixture_policy(bad)
            with self.subTest(field=field), self.assertRaises(ValueError): self.open()
        bad = copy.deepcopy(valid); bad["billing"]["all_billable_usage_covered"] = False
        self.install_fixture_policy(bad)
        with self.assertRaisesRegex(ValueError, "CEILING_NOT_COMPLETE"): self.open()

    def test_expired_scope_goal_money_and_new_run_key_denied(self):
        valid = self.approve_fixture()
        bad = copy.deepcopy(valid); bad["billing"]["expires_at"] = "2000-01-01T00:00:00Z"
        self.install_fixture_policy(bad)
        with self.assertRaisesRegex(ValueError, "EXPIRED"): self.open()
        self.install_fixture_policy(valid)
        with self.assertRaisesRegex(ValueError, "KEY_NOT_APPROVED"):
            self.budget.open_run(self.base, self.scope, "another-run")
        with self.base.connect() as con: con.execute("UPDATE goal_contracts SET budget_hard_limit_amount=1")
        self.scope = self.host.admission.trusted_snapshot(self.base, "saju-development", "saju-preparation")["scope"]
        with self.assertRaisesRegex(ValueError, "GOAL_MODEL_BUDGET_APPROVAL_REQUIRED"): self.open()

    def test_real_transport_is_blocked_even_with_test_approval(self):
        self.approve_fixture(); binding = self.open(); send = Mock()
        with self.assertRaisesRegex(ValueError, "PROVIDER_HARD_LIMIT_AND_USAGE_UNVERIFIED"):
            self.invoke(binding, "draft", self.budget.ReviewedLLMTaskTransport(send))
        send.assert_not_called()
        with self.base.connect() as con: self.assertEqual(0, con.execute("SELECT calls FROM model_run_budgets").fetchone()[0])

    def test_call_budget_shared_by_draft_review_and_growth_and_reopen(self):
        self.approve_fixture(max_calls=3); binding = self.open(); provider = FixtureTransport()
        for stage in ("growth-assess", "draft", "review"): self.invoke(binding, stage, provider)
        with self.assertRaisesRegex(ValueError, "TOTAL_CALL_LIMIT"):
            self.invoke(self.open(), "growth-next", provider)
        self.assertEqual(3, provider.calls)
        self.invoke(binding, "draft", provider)  # Verified replay is free of another submission.
        self.assertEqual(3, provider.calls)

    def test_input_limit_reserves_before_submit(self):
        self.approve_fixture(max_input_tokens=15)
        binding = self.open(); provider = FixtureTransport()
        self.invoke(binding, "first", provider)
        with self.assertRaisesRegex(ValueError, "TOTAL_INPUT_TOKEN_LIMIT"): self.invoke(binding, "second", provider)
        self.assertEqual(1, provider.calls)

    def test_output_limit_reserved_and_explicitly_forwarded(self):
        self.approve_fixture(max_output_tokens=25); binding = self.open(); provider = FixtureTransport()
        self.invoke(binding, "draft", provider)
        self.assertEqual(20, provider.last["TEST_ONLY_LIMITS"]["max_output_tokens"])
        with self.assertRaisesRegex(ValueError, "TOTAL_OUTPUT_TOKEN_LIMIT"): self.invoke(binding, "growth-next", provider)

    def test_money_ceiling_positive_amount_is_not_free_only(self):
        policy = self.approve_fixture(); policy["billing"]["approved_max_amount"] = "0.07"
        self.install_fixture_policy(policy); binding = self.open(); provider = FixtureTransport()
        self.invoke(binding, "draft", provider)  # 0.01 input + 0.04 output + 0.01 fixed = 0.06 reservation.
        with self.assertRaisesRegex(ValueError, "APPROVED_AMOUNT_LIMIT"): self.invoke(binding, "review", provider)
        self.assertEqual(1, provider.calls)
        # Positive billing passes existing Factory compile/admission with matching Goal authority.
        agent, _ = self.host.agent()
        spec = agent.step()["proposal"]["workpack_spec"]
        self.assertEqual(0.07, spec["constraints"]["budget"]["external_spend_cap"])
        self.host.admission.admit_workpack(self.base, spec, "paid-fixture-admission-only")

    def test_safe_explicit_retry_shares_call_and_token_budget(self):
        self.approve_fixture(max_calls=2, max_input_tokens=20, max_output_tokens=40)
        binding = self.open(); failing = FixtureTransport(failure=ConnectionError("fixture proved not sent"), safe=True)
        with self.assertRaisesRegex(RuntimeError, "EXPLICIT_RETRY_ONLY"): self.invoke(binding, "draft", failing)
        provider = FixtureTransport(); self.invoke(binding, "draft", provider, attempt=1)
        with self.assertRaisesRegex(ValueError, "TOTAL_CALL_LIMIT"): self.invoke(binding, "growth", provider)
        with self.base.connect() as con:
            row = con.execute("SELECT calls,input_tokens,output_tokens FROM model_run_budgets").fetchone()
        self.assertEqual((2, 20, 40), tuple(row))

    def test_unknown_response_blocks_retry_and_other_stage(self):
        self.approve_fixture(); binding = self.open(); provider = FixtureTransport(failure=TimeoutError("fixture response lost"))
        with self.assertRaisesRegex(RuntimeError, "RESPONSE_OR_USAGE_UNKNOWN") as caught: self.invoke(binding, "draft", provider)
        self.assertTrue(caught.exception.submit_unknown)
        for stage in ("draft", "growth-next"):
            with self.assertRaisesRegex(ValueError, "STOPPED_OR_UNRESOLVED"): self.invoke(self.open(), stage, provider, attempt=1)
        self.assertEqual(1, provider.calls)

    def test_missing_usage_blocks_all_followup_calls(self):
        self.approve_fixture(); binding = self.open(); provider = FixtureTransport(bad_usage={})
        with self.assertRaisesRegex(RuntimeError, "RESPONSE_OR_USAGE_UNKNOWN"): self.invoke(binding, "draft", provider)
        with self.assertRaisesRegex(ValueError, "STOPPED_OR_UNRESOLVED"): self.invoke(binding, "review", FixtureTransport())

    def test_unresolved_reservation_after_crash_cannot_reset(self):
        self.approve_fixture(); binding = self.open(); provider = FixtureTransport()
        self.invoke(binding, "draft", provider)
        with self.base.connect() as con: con.execute("UPDATE model_run_calls SET state='SUBMITTED',receipt_json=NULL")
        with self.assertRaisesRegex(ValueError, "STOPPED_OR_UNRESOLVED"): self.invoke(self.open(), "review", provider)
        with self.assertRaisesRegex(ValueError, "RUN_UNRESOLVED"): self.budget.finish_run(self.base, binding)
        self.assertEqual(1, provider.calls)

    def test_finished_run_cannot_reset_by_reopening(self):
        self.approve_fixture(); binding = self.open(); provider = FixtureTransport()
        self.invoke(binding, "draft", provider)
        self.budget.finish_run(self.base, binding)
        self.assertEqual("FINISHED", self.budget.run_state(self.base, self.open()))
        with self.assertRaisesRegex(ValueError, "STOPPED_OR_UNRESOLVED"): self.invoke(self.open(), "next", provider)

    def test_actual_base_boundary_consumes_shared_budget_and_blocks_unbounded_transport(self):
        self.approve_fixture(max_calls=2); binding = self.open()
        import agentic_executor
        provider = FixtureTransport()
        context = {"job_id": "TEST-JOB", "model_run_budget": binding, "payload": {"factory": {"domain": "saju-agent"}}}
        with patch.object(self.budget, "ReviewedLLMTaskTransport", side_effect=lambda _send: provider):
            for stage in ("draft", "growth"):
                agentic_executor._llm_task_synthesis(context, stage, tools=[], purpose="general_tool_free")
            with self.assertRaisesRegex(ValueError, "TOTAL_CALL_LIMIT"):
                agentic_executor._llm_task_synthesis(context, "review", tools=[], purpose="general_tool_free")
        self.assertEqual(2, provider.calls)
        with self.assertRaisesRegex(ValueError, "HARD_LIMIT_AND_USAGE_UNVERIFIED"):
            agentic_executor._llm_task_synthesis(context, "real-route", tools=[], purpose="general_tool_free")

    def test_growth_bridge_forwards_same_binding_and_fails_closed_without_it(self):
        self.approve_fixture(); binding = self.open()
        import autonomous_growth_brain_bridge
        bridge = importlib.reload(autonomous_growth_brain_bridge)
        captured = []
        def synthesis(context, request, **kwargs):
            captured.append(copy.deepcopy(context))
            return canonical({"mode": "WAIT", "rationale": "fixture", "expected_value": 0, "expected_cost": 0, "next_action": "fixture"})
        with patch.object(bridge, "_executor_module", return_value=type("Fixture", (), {"_llm_task_synthesis": staticmethod(synthesis)})()):
            bridge.invoke("META_DECIDE", {"scope": {"domain_id": "saju-agent"}, "model_run_budget": binding})
            bridge.invoke("META_DECIDE", {"scope": {"domain_id": "saju-agent"}})
        self.assertEqual(binding, captured[0]["model_run_budget"])
        self.assertIsNone(captured[1]["model_run_budget"])
        self.assertTrue(captured[1]["payload"]["model_budget_required"])
        import agentic_executor
        with self.assertRaisesRegex(ValueError, "RUN_BINDING_REQUIRED"):
            agentic_executor._llm_task_synthesis(captured[1], "fixture", tools=[], purpose="general_tool_free")

    def test_scope_and_policy_change_are_not_reapproved_by_restart(self):
        policy = self.approve_fixture(); binding = self.open()
        bad = copy.deepcopy(binding); bad["scope"]["tenant_id"] = "foreign"
        with self.assertRaises((ValueError, RuntimeError)): self.invoke(bad, "draft", FixtureTransport())
        policy["limits"]["max_calls"] += 1
        self.install_fixture_policy(policy)
        with self.assertRaisesRegex(ValueError, "SCOPE_MISMATCH|POLICY_CHANGED"): self.invoke(binding, "draft", FixtureTransport())


if __name__ == "__main__":
    unittest.main()
