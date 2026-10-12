"""Offline aggregate preparation only; no installation or model invocation."""
import argparse
import json
from pathlib import Path
from .telemetry import aggregate, canonical, validate_aggregate


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--events", type=Path, help="Explicitly exported V2 JSONL rows. Never passed to Growth.")
    parser.add_argument("--realm", choices=("TEST", "LIVE"), required=True)
    parser.add_argument("--coverage", choices=("DISABLED", "UNKNOWN", "COMPLETE_EXPORT"), default="UNKNOWN")
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    parser.add_argument("--observed-until", required=True)
    args = parser.parse_args()
    # Disabled/unknown coverage does not read raw rows.
    rows = []
    if args.coverage == "COMPLETE_EXPORT" and args.events:
        with args.events.open(encoding="utf-8") as stream:
            rows = [json.loads(line) for line in stream if line.strip()]
    result = aggregate(rows, realm=args.realm, start=args.start, end=args.end,
                       observed_until=args.observed_until, coverage=args.coverage)
    print(canonical(validate_aggregate(result)))


if __name__ == "__main__":
    main()
