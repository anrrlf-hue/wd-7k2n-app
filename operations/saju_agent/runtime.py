"""Thin integration with existing Growth/Factory/Base entrypoints.

No installation, authority creation, scheduler, polling loop or new state schema.
The host supplies existing reviewed scope/registry/Goal and model callbacks.
"""
import copy
import json
import os
from pathlib import Path

from .handler import CAPABILITY, DOMAIN, WORKPACK, public_brief
from .telemetry import digest, validate_aggregate


def target_draft(trusted, registry):
    draft = json.loads(Path(__file__).with_name("unreviewed-draft.json").read_text())
    bundle = registry["bundle"]
    if (bundle.get("public_local_only") is not True or bundle.get("synthetic_only") is not False
            or bundle.get("inputs", {}).get("brief") != public_brief()):
        raise ValueError("SAJU_REVIEWED_PUBLIC_REGISTRY_REQUIRED")
    validate_aggregate(bundle["inputs"]["aggregate"])
    draft["scope"] = copy.deepcopy(trusted["scope"])
    draft["release_identity"] = copy.deepcopy(trusted["release_identity"])
    draft["release_identity"]["artifact_digest"] = None
    def use_reviewed_pins(value):
        if isinstance(value, dict):
            if set(value) == {"ref", "sha256"}:
                if value != trusted["scope"]["authority_ref"]:
                    value["sha256"] = bundle["pins"].get(value["ref"])
            else:
                for child in value.values():
                    use_reviewed_pins(child)
        elif isinstance(value, list):
            for child in value:
                use_reviewed_pins(child)
    use_reviewed_pins(draft)
    for key in draft["inputs"]:
        draft["inputs"][key]["content_sha256"] = digest(bundle["inputs"][key])
    if bundle["inputs"]["model_policy"].get("enabled"):
        from model_run_budget import validate_policy, amount
        billing = validate_policy(bundle["inputs"]["model_policy"])["billing"]
        cap = amount(billing["approved_max_amount"])
        draft["constraints"]["budget"].update(currency=billing["currency"], external_spend_cap=float(cap))
        draft["constraints"]["safety"]["real_spend_authorized"] = cap > 0
    # This marker refers to already installed review; it issues no approval.
    draft["prerequisites"] = [{"id": "REVIEW_PUBLIC_LOCAL_REGISTRY", "status": "PROVEN", "evidence_ref": "base:workpack-reviewed:" + digest(registry)}]
    return draft


def build_agent(*, base, agent_base_root, scope, state_parent, director=None, evaluator=None, brain=None, synthetic_test_callbacks=False):
    from .sources import verify_sources, BASE_SHA, GROWTH_SHA
    verified = verify_sources(Path(agent_base_root).parent)
    if (Path(agent_base_root).resolve() != verified / "agent-base"
            or Path(os.environ.get("AGENT_BASE_ROOT", ".")).resolve() != base.ROOT.resolve()
            or Path(os.environ.get("AGENT_BASE_DB", ".")).resolve() != base.DB.resolve()):
        raise ValueError("SAJU_EXPLICIT_BASE_BINDING_REQUIRED")
    from common_growth.agent import PurposeAutonomousAgent
    from common_growth.autonomy import AutonomyStore
    from common_growth.contracts import DomainProfile, bind_state_root, scoped_state_root
    from common_growth.factory_execution import build_factory_execution_proposer
    from common_growth.learning import LearningStore
    from common_growth.learning_assets import LearningAssetStore
    from common_growth.methods import MethodStore
    from common_growth.self_direction import SelfDirectionController, SelfDirectionStore
    from common_growth.workpack import GrowthWorkpackAdapter
    import workpack_admission
    import inspect
    if (Path(base.__file__).resolve() != verified / "agent-base/contract/base_runtime.py"
            or Path(inspect.getfile(PurposeAutonomousAgent)).resolve() != verified / "insurance-growth-agent/common_growth/agent.py"):
        raise ValueError("SAJU_LOADED_ENGINE_MISMATCH")

    if scope.domain_id != DOMAIN or scope.environment not in {"TEST", "SANDBOX"}:
        raise ValueError("SAJU_LOCAL_SCOPE_REQUIRED")
    if not base.DB.is_file() or not (base.ROOT / "workpack-reviewed.json").is_file():
        raise ValueError("EXISTING_REVIEWED_BASE_REQUIRED")
    profile = DomainProfile(DOMAIN, "REVIEW_READY_PACK", ("DRAFT", "REVIEW", "IMPROVEMENT"),
                            "saju-agent:local-artifact-only", 1, policy_constraints=(
                                "NO_PUBLISHING", "NO_CUSTOMER_DATA", "NO_UNAPPROVED_COST", "NO_SELF_PROMOTION", "TEST_IS_NOT_LIVE"))
    def authority():
        trusted = workpack_admission.trusted_snapshot(base, scope.tenant_id, scope.goal_id)
        if trusted["release_identity"]["base_sha"] != BASE_SHA or trusted["release_identity"]["growth_sha"] != GROWTH_SHA:
            raise ValueError("SAJU_REVIEWED_RELEASE_REQUIRED")
        expected = {"tenant_id": scope.tenant_id, "goal_id": scope.goal_id, "goal_version": scope.goal_version,
                    "domain": scope.domain_id, "environment": scope.environment, "policy_version": scope.policy_version}
        if any(trusted["scope"].get(k) != v for k, v in expected.items()):
            raise ValueError("SAJU_SCOPE_CHANGED")
        return trusted
    authority()
    run_budget = {"binding": None, "synthetic_test_callbacks": synthetic_test_callbacks}
    if any(callback is not None for callback in (director, evaluator, brain)) and not synthetic_test_callbacks:
        raise ValueError("CUSTOM_CALLBACKS_REQUIRE_EXPLICIT_SYNTHETIC_TEST_MODE")
    if any(callback is None for callback in (director, evaluator, brain)):
        if not all(callback is None for callback in (director, evaluator, brain)):
            raise ValueError("SAJU_COMPLETE_BRAIN_BINDING_REQUIRED")
        # Reuse the reviewed Growth -> Base model transport, with no new model,
        # provider override, credential or retry implementation. Construction
        # is inert; every actual call must pass the pinned policy guard.
        import sys
        from common_growth.brain_runtime import AgentBaseBrainCommandClient, AutonomousGrowthBrain
        def model_authority():
            authority()
            from model_run_budget import require_supported, ReviewedLLMTaskTransport
            if not run_budget["binding"]:
                raise RuntimeError("MODEL_RUN_BINDING_REQUIRED_USE_ADVANCE_ONCE")
            require_supported(ReviewedLLMTaskTransport(None))
        transport = AgentBaseBrainCommandClient(
            [sys.executable, str(verified / "agent-base/contract/autonomous_growth_brain_bridge.py")],
            max_attempts=1, provider_recovery_attempts=0, attempt_guard=model_authority)
        existing_brain = AutonomousGrowthBrain(transport)
        director, evaluator, brain = existing_brain.director, existing_brain.evaluator, existing_brain.choose_research
    state = bind_state_root(scoped_state_root(state_parent, scope), scope)
    assets = LearningAssetStore(state / "assets.sqlite")

    def draft_provider(_meta, _context):
        trusted = authority()
        registry = workpack_admission.registry(base)
        draft = target_draft(trusted, registry)
        with base.connect() as con:
            _, _, policy = workpack_admission._snapshot(base, con, scope.tenant_id, scope.goal_id, registry)
        draft["constraints"]["budget"]["approval_ref"] = policy["approval_ref"]
        return draft

    factory = build_factory_execution_proposer(scope=scope, target_profile=profile, state_root=state,
                agent_base_root=agent_base_root, target_draft_provider=draft_provider)

    def snapshot():
        authority()
        registry = workpack_admission.registry(base)
        aggregate = validate_aggregate(registry["bundle"]["inputs"]["aggregate"])
        # Export only exact-scope verified artifacts, not raw telemetry or all jobs.
        documents = []
        with base.connect() as con:
            rows = con.execute("SELECT r.run_id,r.scope_json FROM workpack_runs r ORDER BY r.run_id").fetchall() if con.execute("SELECT 1 FROM sqlite_master WHERE name='workpack_runs'").fetchone() else []
            for row in rows:
                if json.loads(row["scope_json"]) != authority()["scope"]:
                    continue
                for item in con.execute("SELECT i.result_json FROM job_items i JOIN jobs j ON j.job_id=i.job_id WHERE j.factory_run_id=? AND i.status='SUCCESS_VERIFIED' ORDER BY j.created_at", (row["run_id"],)):
                    result = json.loads(item["result_json"])
                    doc = result.get("document", {})
                    if doc.get("kind") in {"review", "improve"}:
                        documents.append({"kind": doc["kind"], "text": doc["text"], "synthetic": doc["synthetic"],
                                          "evidence_ref": "local:saju-artifact:" + result["artifact_sha256"],
                                          "quality": "ADVISORY_NOT_HUMAN_APPROVAL", "input_digest": doc["input_digest"]})
        with assets.con() as con:
            evidence = [dict(row) for row in con.execute(
                "SELECT evidence_id,source_ref,claim,trust_state FROM growth_evidence_assets WHERE tenant_id=? AND goal_id=? ORDER BY created_at,evidence_id DESC LIMIT 18",
                (scope.tenant_id, scope.goal_id))]
        # The reviewed model bridge intentionally omits large nested values.
        # Keep audited full evidence in state and supply small domain summaries
        # that survive its actual request compaction without changing Core.
        counts = aggregate["counts"] or {}
        data_quality = {"realm": aggregate["realm"], "state": aggregate["state"], "coverage": aggregate["coverage"],
                        "sample": aggregate["sample_status"], "aggregate_ref": aggregate["digest"],
                        "limits": "tab sessions, not people; optional paths not dropout; copy/share is not delivery; no causal proof"}
        funnel_metrics = {"sessions": counts.get("sessions"), "readings": counts.get("readings_started"),
                          "completed": counts.get("readings_completed"), "viewed": counts.get("results_viewed"),
                          "ordered": [{"eligible": t["eligible"], "reached": t["reached"], "closed_not_reached": t["closed_not_reached"], "pending": t["pending"]} for t in aggregate["transitions"]],
                          "order": "landing>start>complete>view", "errors": aggregate["error_sessions"]}
        optional_metrics = {name: [value["action_sessions"], value["result_sessions"]]
                            for name, value in aggregate["optional_from_result"].items()}
        quality_advisory = {"recent_ingested_count": len(evidence), "status": "ADVISORY_NOT_APPROVAL",
                            "synthetic": documents[-1]["synthetic"] if documents else None,
                            "ref": documents[-1]["evidence_ref"] if documents else None,
                            "excerpt": documents[-1]["text"][:160] if documents else None}
        return {"data_quality": data_quality, "funnel_metrics": funnel_metrics, "optional_metrics": optional_metrics,
                "quality_advisory": quality_advisory,
                "aggregate": aggregate, "advisory_documents": documents[-6:], "artifact_evidence": evidence,
                "business_effect": "UNPROVEN", "collection_activation": "SEPARATE_APPROVAL_REQUIRED"}

    adapter = GrowthWorkpackAdapter(DOMAIN, profile, snapshot, lambda *_args: (),
                available_capabilities=(CAPABILITY,), execution_proposer=factory,
                context_provider=lambda: {"proposal_only": True, "external_execution_allowed": False,
                                          "model_run_budget": copy.deepcopy(run_budget["binding"])})
    controller = SelfDirectionController(scope=scope, director=director, evaluator=evaluator,
        store=SelfDirectionStore(state / "direction.sqlite"), immutable_boundaries=profile.policy_constraints)
    agent = PurposeAutonomousAgent(scope=scope, locked_goal={"goal_id": scope.goal_id, "target": "Review-ready documents; business effect unproven"},
        workpack=adapter, brain=brain, direction_controller=controller,
        learning_store=LearningStore(state / "learning.sqlite"), method_store=MethodStore(state / "methods.sqlite"),
        autonomy_store=AutonomyStore(state / "autonomy.sqlite"), learning_assets=assets,
        goal_guard=authority, immutable_boundaries=profile.policy_constraints,
        resource_envelope={"model_cost_control": "APPROVED_ONE_RUN_BUDGET", "external_execution": False})
    agent._saju_run_budget = run_budget
    return agent, assets


def advance_once(*, base, agent, assets, invocation_key, max_ticks=3):
    """One explicitly invoked bounded cycle; Base remains the only retry owner.

    Persist the invocation key in the host's existing cycle record. Reusing it
    ingests the prior run rather than creating duplicate work. Incomplete runs
    return to the host for normal Base recovery; there is no autonomous daemon.
    """
    import workpack_admission
    from workpack_contract import canonical
    if not 1 <= max_ticks <= 3:
        raise ValueError("BOUNDED_BASE_TICKS_REQUIRED")
    scope = agent.scope
    trusted = workpack_admission.trusted_snapshot(base, scope.tenant_id, scope.goal_id)
    # Ensure a forged/mismatched agent cannot drive another tenant's run.
    expected = {"tenant_id": scope.tenant_id, "goal_id": scope.goal_id, "goal_version": scope.goal_version,
                "domain": scope.domain_id, "environment": scope.environment, "policy_version": scope.policy_version}
    if any(trusted["scope"][k] != v for k, v in expected.items()) or scope.domain_id != DOMAIN or scope.environment not in {"TEST", "SANDBOX"}:
        raise ValueError("SAJU_SCOPE_CHANGED")
    budget = agent._saju_run_budget
    if not budget["synthetic_test_callbacks"]:
        from model_run_budget import open_run, run_state
        budget["binding"] = open_run(base, trusted["scope"], invocation_key)
        if run_state(base, budget["binding"]) == "FINISHED":
            return {"state": "ALREADY_FINISHED", "run_id": budget["binding"]["run_id"], "publishing_performed": False}
    workpack_admission.init_schema(base)
    with base.connect() as con:
        existing = con.execute("SELECT * FROM workpack_runs WHERE scope_json=? AND invocation_key=?", (canonical(trusted["scope"]), invocation_key)).fetchone()
    decision = None
    if existing:
        run = dict(existing)
    else:
        decision = agent.step()
        spec = decision.get("proposal", {}).get("workpack_spec")
        if decision["status"] != "EXECUTE_PROPOSAL" or not spec:
            if budget["binding"]:
                from model_run_budget import finish_run
                finish_run(base, budget["binding"])
            return {"state": "NO_EXECUTION", "decision": decision, "external_execution_performed": False}
        if spec["scope"] != trusted["scope"]:
            raise ValueError("SAJU_PROPOSAL_SCOPE_CHANGED")
        run = workpack_admission.admit_workpack(base, spec, invocation_key)
    ticks = []
    for _ in range(max_ticks):
        tick = base.tick(scope.environment, factory_run_id=run["run_id"])
        ticks.append(tick)
        if tick["status"] != "SUCCESS_VERIFIED":
            break
    evidence_ids = assets.ingest_base_outcomes(scope, base, run["run_id"])
    with base.connect() as con:
        states = [row[0] for row in con.execute("SELECT i.status FROM job_items i JOIN jobs j ON j.job_id=i.job_id WHERE j.factory_run_id=?", (run["run_id"],))]
    complete = bool(states) and all(status == "SUCCESS_VERIFIED" for status in states)
    next_decision = agent.step() if complete else None
    if complete and budget["binding"]:
        from model_run_budget import finish_run
        finish_run(base, budget["binding"])
    return {"state": "LOCAL_REVIEW_READY" if complete else "BASE_RECOVERY_REQUIRED", "run_id": run["run_id"],
            "decision": decision, "ticks": ticks, "evidence_ids": evidence_ids, "next_decision": next_decision,
            "publishing_performed": False, "business_effect_verified": False}
