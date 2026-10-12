import argparse
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sqlite3

from .runtime import Runtime, prepare


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def save(path, value):
    # Reviewed packets are immutable. Use a new output path for revisions.
    with Path(path).open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def main():
    parser = argparse.ArgumentParser(description="사주 홍보 초안 — 기존 Base의 수동 실행 진입점")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("prepare", help="비용 없이 업무 요청과 최초 등록안을 준비")
    p.add_argument("--source-root", required=True)
    p.add_argument("--output-dir", required=True)
    for name in ("preflight", "register", "run", "result", "review-request"):
        p = sub.add_parser(name)
        p.add_argument("--base-root", required=True)
        p.add_argument("--database", required=True)
        if name in {"register", "run"}:
            p.add_argument("--packet", required=True)
        if name == "register":
            p.add_argument("--approve-registration", required=True, help="검토·승인한 registration_digest")
        if name == "run":
            p.add_argument("--approve-request", required=True, help="이번 작성/평가를 승인한 request_digest")
            p.add_argument("--confirm-existing-zero-cost-route", required=True,
                           help="기존 경로의 추가 과금 없음을 운영자가 별도 확인한 뒤 같은 digest 입력. 가격 검증 도구가 아님")
        if name in {"result", "review-request"}:
            p.add_argument("--job-id", required=True)
        if name == "review-request":
            p.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        if args.command == "prepare":
            draft = prepare(args.source_root)
            now = datetime.now(timezone.utc)
            registration = Runtime(args.source_root, "/unused").registration_packet(
                now.isoformat(), (now + timedelta(days=30)).isoformat())
            out = Path(args.output_dir)
            out.mkdir(parents=True, exist_ok=False)
            save(out / "draft.request.json", draft)
            save(out / "registration.json", registration)
            result = {"state": "PREPARED_NOT_INSTALLED", "output_dir": str(out.resolve()),
                      "request_digest": draft["request_digest"],
                      "registration_digest": registration["registration_digest"],
                      "model_call_performed": False}
        else:
            runtime = Runtime(args.base_root, args.database)
            if args.command == "preflight":
                result = runtime.check()
            elif args.command == "register":
                result = runtime.register(read_json(args.packet), args.approve_registration)
            elif args.command == "run":
                result = runtime.run(read_json(args.packet), args.approve_request, args.confirm_existing_zero_cost_route)
            elif args.command == "result":
                result = runtime.result(args.job_id)
            else:
                packet = runtime.review_packet(args.job_id)
                save(args.output, packet)
                result = {"state": "REVIEW_REQUEST_PREPARED", "request_digest": packet["request_digest"],
                          "output": args.output, "model_call_performed": False}
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (ValueError, RuntimeError, OSError, KeyError, TypeError, sqlite3.Error) as exc:
        # Never expose an arbitrary runtime exception containing provider credentials.
        code = str(exc).split(":", 1)[0]
        if not code.replace("_", "").isalnum() or code.upper() != code:
            code = "OPERATION_BLOCKED"
        print(json.dumps({"state": "BLOCKED", "reason": code}, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
