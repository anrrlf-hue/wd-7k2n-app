"""Attach to existing Growth callbacks and proposal-only Factory extension.

The host must supply its existing scope and reviewed target draft. No registry,
Goal, pin, database, timer, HTTP route or automatic consumer is created here.
"""
import copy
import os
from pathlib import Path

from .handler import CAPABILITY, DOMAIN, WORKPACK, digest, review, validate_snapshot


def build_growth_adapter(*, snapshot, scope, state_root, agent_base_root, reviewed_draft=None):
    data = validate_snapshot(snapshot)
    if scope.domain_id != DOMAIN or scope.environment not in {"TEST", "SANDBOX"}:
        raise ValueError("OPS_SANDBOX_SCOPE_REQUIRED")
    from common_growth.contracts import DomainProfile
    from common_growth.factory_execution import build_factory_execution_proposer
    from common_growth.workpack import GrowthWorkpackAdapter

    profile = DomainProfile(
        domain_id=DOMAIN, target_metric="OPS_REVIEW_COVERAGE", funnel_stages=("OBSERVATION", "REVIEW"),
        qualification_rule_ref="saju-ops:synthetic-review-only", maturity_min_observations=1,
        policy_constraints=("SYNTHETIC_ONLY", "RECOMMENDATION_ONLY", "NO_REAL_BUSINESS_PROOF"),
    )
    draft = copy.deepcopy(reviewed_draft)

    def propose(meta, context):
        current = review(data)
        if current["state"] == "NO_DATA":
            return {**current, "workpack_spec": None}
        if draft is None:
            return {"state": "FACTORY_TARGET_DRAFT_REQUIRED", "next_action": "WAIT",
                    "workpack_spec": None, "external_execution_performed": False}
        expected_scope = {"tenant_id": scope.tenant_id, "goal_id": scope.goal_id,
                          "goal_version": scope.goal_version, "domain": scope.domain_id,
                          "environment": scope.environment, "policy_version": scope.policy_version}
        if (draft.get("artifact_kind") != "DRAFT" or draft.get("workpack_id") != "SAJU_OPERATIONS_REVIEW_V1"
                or any(draft.get("scope", {}).get(key) != value for key, value in expected_scope.items())):
            raise ValueError("OPS_TARGET_DRAFT_SCOPE_INVALID")
        inputs = draft.get("inputs", {})
        if (set(inputs) != {"ops_snapshot"} or inputs["ops_snapshot"].get("classification") != "SYNTHETIC"
                or inputs["ops_snapshot"].get("content_sha256") != digest(data)):
            raise ValueError("OPS_DRAFT_INPUT_DIGEST_MISMATCH")
        actions = draft.get("actions", [])
        if len(actions) != 1:
            raise ValueError("OPS_REVIEW_ACTION_REQUIRED")
        action = actions[0]
        if (action.get("capability_id") != CAPABILITY or action.get("base", {}).get("workpack_id") != WORKPACK
                or action.get("effect") != "NONE" or action.get("parameters") != {}
                or action.get("expected_outputs") != ["review_report"]
                or action.get("input_bindings") != {"snapshot": {"kind": "INPUT", "ref": "ops_snapshot", "field": None}}):
            raise ValueError("OPS_REVIEW_ACTION_REQUIRED")
        # Base's SQLite connect can create a missing file. Require an explicitly
        # configured existing runtime before its proposal-only authority read.
        root_path, db_path = os.environ.get("AGENT_BASE_ROOT"), os.environ.get("AGENT_BASE_DB")
        if (not root_path or not db_path or not Path(db_path).is_file()
                or not (Path(root_path) / "workpack-reviewed.json").is_file()):
            return {"state": "FACTORY_REVIEWED_REGISTRY_OR_AUTHORITY_REQUIRED", "next_action": "WAIT",
                    "reason": "EXISTING_SANDBOX_RUNTIME_REQUIRED", "workpack_spec": None,
                    "external_execution_performed": False, "live_enabled": False}
        factory = build_factory_execution_proposer(
            scope=scope, target_profile=profile, state_root=state_root, agent_base_root=agent_base_root,
            target_draft_provider=lambda _meta, _context: copy.deepcopy(draft),
        )
        # Existing Factory owns reuse selection, trusted Base readback, pins and compile.
        # Context is not forwarded: callers cannot smuggle candidate approvals or raw data.
        try:
            result = factory({}, {})
        except ValueError as exc:
            if str(exc) not in {"UNREVIEWED_PIN", "PREREQUISITE_UNPROVEN", "TEMPLATE_NOT_REVIEWED",
                               "REUSE_REVIEWED_PIN_REQUIRED", "REUSE_REVIEWED_PIN_CONFLICT"}:
                raise
            result = {"state": "FACTORY_REVIEW_REQUIRED", "reason": str(exc),
                      "workpack_spec": None, "external_execution_performed": False}
        return {**result, "next_action": "REVIEW_LOCAL_PROPOSAL" if result.get("workpack_spec") else "WAIT",
                "live_enabled": False, "measurement_status": "DEFERRED_UNTIL_DOMAIN_LAUNCH"}

    return GrowthWorkpackAdapter(
        workpack_id=DOMAIN, profile=profile, snapshot_provider=lambda: review(data),
        researcher=lambda _question, _snapshot, _context: (),
        # Presence of this source file is not proof that a capability is installed.
        available_capabilities=(), execution_proposer=propose,
        context_provider=lambda: {"source_kind": "SYNTHETIC" if data else "NONE", "real_data_available": False},
    ).validate()
