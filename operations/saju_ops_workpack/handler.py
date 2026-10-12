"""Synthetic operational review, using the existing Base native handler API.

This is domain logic, not a runner. No network, persistence, model, customer
reading, telemetry or execution authority is owned here.
"""
import hashlib
import json
import re

DOMAIN = "saju-operations"
WORKPACK = "saju_operations_review"
CAPABILITY = "saju.synthetic_operations_review"
CHECKS = {
    "palm_pipeline": "REVIEW_CANCELLATION_AND_PRESERVED_HAND_RETRY",
    "premium_annual": "REVIEW_EVIDENCE_ACTION_MONTH_CONNECTION",
    "service_share": "REVIEW_GENERIC_LINK_AND_SHARE_STATUS",
    "device_camera": "REQUEST_REAL_DEVICE_VALIDATION",
}


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def validate_snapshot(value):
    """Allowlist complete shapes; reject unknown fields without echoing values."""
    if value is None:
        return None
    if not isinstance(value, dict) or set(value) != {"schema_version", "source_kind", "release_sha", "checks"}:
        raise ValueError("OPS_SNAPSHOT_SHAPE_INVALID")
    if value["schema_version"] != "SAJU_OPS_SNAPSHOT_V1" or value["source_kind"] != "SYNTHETIC":
        raise ValueError("OPS_SYNTHETIC_ONLY")
    if not isinstance(value["release_sha"], str) or not re.fullmatch(r"[a-f0-9]{40}", value["release_sha"]):
        raise ValueError("OPS_RELEASE_SHA_INVALID")
    rows = value["checks"]
    if not isinstance(rows, list) or len(rows) > len(CHECKS):
        raise ValueError("OPS_CHECKS_INVALID")
    seen = set()
    clean = []
    for row in rows:
        if not isinstance(row, dict) or set(row) != {"check_id", "status", "evidence_ref"}:
            raise ValueError("OPS_CHECK_SHAPE_INVALID")
        name = row["check_id"]
        if not isinstance(name, str) or name not in CHECKS or name in seen:
            raise ValueError("OPS_CHECK_ID_INVALID")
        if not isinstance(row["status"], str) or row["status"] not in {"PASS", "FAIL", "UNVERIFIED"}:
            raise ValueError("OPS_CHECK_STATUS_INVALID")
        if row["evidence_ref"] != "fixture:saju-ops:" + name:
            raise ValueError("OPS_FIXTURE_REFERENCE_REQUIRED")
        seen.add(name)
        clean.append(dict(row))
    return {**value, "checks": sorted(clean, key=lambda row: row["check_id"])}


def review(snapshot):
    data = validate_snapshot(snapshot)
    rows = data["checks"] if data else []
    return {
        "state": "SYNTHETIC_REVIEW_READY" if rows else "NO_DATA",
        "next_action": "HUMAN_REVIEW" if rows else "WAIT",
        "source_kind": "SYNTHETIC" if data else "NONE",
        "input_digest": digest(data) if data else None,
        "release_sha": data["release_sha"] if data else None,
        "findings": [
            {"check_id": row["check_id"], "observed_status": row["status"],
             "evidence_ref": row["evidence_ref"], "proposal_code": CHECKS[row["check_id"]]}
            for row in rows if row["status"] != "PASS"
        ],
        "reviewed_fixture_checks": len(rows) if rows else None,
        "measurement_status": "DEFERRED_UNTIL_DOMAIN_LAUNCH",
        "observed_business_outcome": None,
        "business_outcome_verified": False,
        "external_execution_performed": False,
        "live_enabled": False,
    }


def _snapshot_from_context(context):
    if context.get("environment") not in {"TEST", "SANDBOX"}:
        raise ValueError("OPS_SANDBOX_SCOPE_REQUIRED")
    payload = context.get("payload", {})
    if (payload.get("factory", {}).get("domain") != DOMAIN
            or payload.get("factory", {}).get("expected_outputs") != ["review_report"]
            or payload.get("parameters") != {}):
        raise ValueError("OPS_NATIVE_BINDING_INVALID")
    inputs = payload.get("factory_inputs")
    if not isinstance(inputs, dict) or set(inputs) != {"snapshot"}:
        raise ValueError("OPS_NATIVE_INPUT_INVALID")
    return inputs["snapshot"]


def execute(context):
    return {"review_report": review(_snapshot_from_context(context))}


def verify(context, result):
    """Recompute this pure local operation; never attest a business outcome."""
    expected = execute(context)
    ok = (result == expected and expected["review_report"]["state"] == "SYNTHETIC_REVIEW_READY")
    return {
        "ok": ok,
        "synthetic": True,
        "readback_ref": "fixture:saju-ops:deterministic:" + digest(expected),
        "verification_issues": [] if ok else ["OPS_NO_DATA_OR_READBACK_MISMATCH"],
        "business_evidence": [],
    }


def recover_submit_unknown(context, result):
    # Recomputing an effect-free function is safe; Base owns the retry decision.
    return execute(context)
