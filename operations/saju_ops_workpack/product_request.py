"""Prepare the verified Product /api/jobs DTO; deliberately has no sender."""
from .handler import canonical, digest, review, validate_snapshot


def prepare_product_request(snapshot):
    data = validate_snapshot(snapshot)
    result = review(data)
    if result["state"] == "NO_DATA":
        return {"state": "NO_DATA", "next_action": "WAIT", "request": None, "send_allowed": False}
    command = (
        "사주 앱 운영 점검의 합성 fixture입니다. 실측 성과나 고객 자료가 아닙니다. "
        "아래 점검 상태의 한계와 개선 검토안을 문서로만 정리해주세요. "
        "사주풀이·재무코칭·방문통계 수집·외부 전송·게시·결제·실행·예약은 하지 마세요. "
        "실제 운영 활성화나 완료를 주장하지 마세요.\n" + canonical(data)
    )
    body = {"command": command}
    # Product limits BOTH the JSON request body and command to 4096 UTF-8 bytes.
    if len(canonical(body).encode("utf-8")) > 4096:
        raise ValueError("PRODUCT_COMMAND_BODY_TOO_LARGE")
    return {
        "state": "LOCAL_REQUEST_PREPARED",
        "next_action": "VERIFY_PRODUCT_BINDING_AND_APPROVAL",
        "send_allowed": False,
        "external_execution_performed": False,
        "request": {
            "method": "POST", "path": "/api/jobs",
            "headers": {"Content-Type": "application/json", "Idempotency-Key": "saju_ops_" + digest(body)},
            "body": body,
        },
        "limitations": ["NO_AUTHENTICATION_CONFIGURED", "NO_HTTP_CALL_PERFORMED",
                        "GENERIC_COMMAND_DOES_NOT_REGISTER_FACTORY_WORKPACK"],
    }
