"""Offline reduction. Only the returned allowlisted aggregate may enter Growth.

No network, persistent identifiers, raw-row export, account or person inference.
The caller supplies explicitly exported V2 server rows and collection coverage;
an absent/disabled export is UNKNOWN, never zero visitors.
"""
import hashlib
import json
import re
from collections import defaultdict
from datetime import datetime, timedelta

STAGES = ("landing_viewed", "reading_started", "free_report_completed", "result_viewed")
OPTIONAL = ("premium_report_viewed", "share_intent", "share_sheet_resolved", "share_cancelled",
            "share_failed", "link_copied", "copy_failed")
ERRORS = ("analysis_failed", "analysis_timeout", "analysis_cancelled", "analysis_retry")
EVENTS = set(STAGES + OPTIONAL + ERRORS)
COUNTS = ("sessions", "readings_started", "readings_completed", "results_viewed",
          "unlinked_result_events", "duplicate_events")
IDLE = timedelta(minutes=30)


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def stamp(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("TIMEZONE_REQUIRED")
    return parsed


def validate_row(row):
    if not isinstance(row, dict) or set(row) != {"schema", "realm", "receivedAt", "event", "eventId", "sessionId", "readingId", "path", "props"}:
        raise ValueError("EVENT_SHAPE_INVALID")
    if row["schema"] != "SAJU_EVENT_V2" or row["realm"] not in {"TEST", "LIVE"}:
        raise ValueError("EVENT_SOURCE_INVALID")
    for field in ("eventId", "sessionId", "readingId"):
        if field == "readingId" and row[field] is None:
            continue
        if not isinstance(row[field], str) or not re.fullmatch(r"[a-zA-Z0-9-]{16,80}", row[field]):
            raise ValueError("EVENT_ID_INVALID")
    stamp(row["receivedAt"])
    if row["path"] not in {"/", "/diagnosis", "/diagnosis/palm", "/palm", "/other"} or not isinstance(row["event"], str):
        raise ValueError("EVENT_PATH_INVALID")
    props = row["props"]
    if not isinstance(props, dict) or set(props) - {"flow", "mode", "palmSkipped", "bilateral"}:
        raise ValueError("EVENT_PROPS_INVALID")
    if "flow" in props and props["flow"] not in {"saju", "palm"}:
        raise ValueError("EVENT_PROPS_INVALID")
    if "mode" in props and props["mode"] not in {"detail_focus", "premium_annual"}:
        raise ValueError("EVENT_PROPS_INVALID")
    if any(type(props[key]) is not bool for key in ("palmSkipped", "bilateral") if key in props):
        raise ValueError("EVENT_PROPS_INVALID")
    return row


def aggregate(rows, *, realm, start, end, observed_until, coverage="UNKNOWN"):
    """Closed-session non-progression is descriptive, not proof of abandonment.

    Windows cohort by first observed session event; callers must export complete
    sessions including preceding context and a 30-minute lookahead. Counts are
    tab sessions, not people. Rates use only ordered, linked observations.
    """
    if realm not in {"TEST", "LIVE"} or coverage not in {"COMPLETE_EXPORT", "UNKNOWN", "DISABLED"}:
        raise ValueError("AGGREGATE_SOURCE_INVALID")
    begin, finish, until = map(stamp, (start, end, observed_until))
    if not begin < finish <= until:
        raise ValueError("AGGREGATE_WINDOW_INVALID")
    payload = {"schema": "SAJU_AGGREGATE_V1", "realm": realm, "coverage": coverage,
               "period": {"start": start, "end": end, "observed_until": observed_until},
               "state": "NO_DATA", "sample_status": "NO_DATA", "counts": None,
               "transitions": [], "optional_from_result": {}, "error_sessions": {},
               "people": None, "new_customers": None, "delivered_shares": None,
               "causal_effect": None}
    if coverage != "COMPLETE_EXPORT":
        return {**payload, "digest": digest(payload)}
    events, seen, duplicates = [], {}, 0
    for row in rows:
        validate_row(row)
        if row["realm"] != realm:
            raise ValueError("MIXED_REALM_EXPORT")
        if stamp(row["receivedAt"]) > until:
            continue
        key = row["eventId"]
        if key in seen:
            if seen[key] != row:
                raise ValueError("EVENT_REPLAY_CONFLICT")
            duplicates += 1
            continue
        seen[key] = row
        events.append(row)
    if not events:
        return {**payload, "digest": digest(payload)}
    events.sort(key=lambda item: stamp(item["receivedAt"]))
    sessions = defaultdict(list)
    for row in events:
        sessions[row["sessionId"]].append(row)
    sessions = {key: value for key, value in sessions.items() if begin <= stamp(value[0]["receivedAt"]) < finish}
    if not sessions:
        return {**payload, "digest": digest(payload)}
    counts = dict.fromkeys(COUNTS, 0)
    counts.update(sessions=len(sessions), duplicate_events=duplicates)
    transitions = [{"from": left, "to": right, "eligible": 0, "reached": 0,
                    "closed_not_reached": 0, "pending": 0} for left, right in zip(STAGES, STAGES[1:])]
    optional = {key: {"result_sessions": 0, "action_sessions": 0} for key in OPTIONAL}
    errors = dict.fromkeys(ERRORS, 0)
    for session_rows in sessions.values():
        closed = stamp(session_rows[-1]["receivedAt"]) + IDLE <= until
        names = {row["event"] for row in session_rows}
        for name in ERRORS:
            errors[name] += name in names
        # Landing -> start uses session ordering; analysis -> result uses a reading ID.
        landing = next((i for i, row in enumerate(session_rows) if row["event"] == STAGES[0]), None)
        eligible = landing is not None
        reached = eligible and any(i > landing and row["event"] == STAGES[1] and row["readingId"] for i, row in enumerate(session_rows))
        transitions[0]["eligible"] += eligible
        transitions[0]["reached"] += bool(reached)
        transitions[0]["closed_not_reached"] += bool(eligible and not reached and closed)
        transitions[0]["pending"] += bool(eligible and not reached and not closed)
        readings = defaultdict(list)
        for row in session_rows:
            if row["readingId"]:
                readings[row["readingId"]].append(row)
            elif row["event"] == "result_viewed":
                counts["unlinked_result_events"] += 1
        valid_result = False
        optional_seen = set()
        for reading_rows in readings.values():
            first = next((i for i, row in enumerate(reading_rows) if row["event"] == "reading_started"), None)
            completed = next((i for i, row in enumerate(reading_rows) if first is not None and i > first and row["event"] == "free_report_completed"), None)
            result = next((i for i, row in enumerate(reading_rows) if completed is not None and i > completed and row["event"] == "result_viewed"), None)
            counts["readings_started"] += first is not None
            counts["readings_completed"] += completed is not None
            counts["results_viewed"] += result is not None
            if result is None:
                counts["unlinked_result_events"] += sum(row["event"] == "result_viewed" for row in reading_rows)
            else:
                valid_result = True
                optional_seen.update(row["event"] for row in reading_rows[result + 1:] if row["event"] in OPTIONAL)
            for transition, origin, dest in ((transitions[1], first, completed), (transitions[2], completed, result)):
                transition["eligible"] += origin is not None
                transition["reached"] += dest is not None
                transition["closed_not_reached"] += origin is not None and dest is None and closed
                transition["pending"] += origin is not None and dest is None and not closed
        for name in OPTIONAL:
            optional[name]["result_sessions"] += valid_result
            optional[name]["action_sessions"] += name in optional_seen
    payload.update(state="OBSERVED", sample_status="LOW_SAMPLE" if len(sessions) < 20 else "DESCRIPTIVE_ONLY",
                   counts=counts, transitions=transitions, optional_from_result=optional, error_sessions=errors)
    return {**payload, "digest": digest(payload)}


def validate_aggregate(value):
    """Reject extra free text/identifiers even on an apparently signed aggregate."""
    empty = aggregate([], realm="TEST", start="2026-01-01T00:00:00Z", end="2026-01-02T00:00:00Z", observed_until="2026-01-02T01:00:00Z")
    if not isinstance(value, dict) or set(value) != set(empty):
        raise ValueError("AGGREGATE_SHAPE_INVALID")
    if value["schema"] != empty["schema"] or value["realm"] not in {"TEST", "LIVE"}:
        raise ValueError("AGGREGATE_SOURCE_INVALID")
    if value["coverage"] not in {"COMPLETE_EXPORT", "UNKNOWN", "DISABLED"}:
        raise ValueError("AGGREGATE_COVERAGE_INVALID")
    if set(value["period"]) != set(empty["period"]):
        raise ValueError("AGGREGATE_PERIOD_INVALID")
    begin, finish, until = (stamp(value["period"][key]) for key in ("start", "end", "observed_until"))
    if not begin < finish <= until:
        raise ValueError("AGGREGATE_PERIOD_INVALID")
    for name in ("people", "new_customers", "delivered_shares", "causal_effect"):
        if value[name] is not None:
            raise ValueError("UNSUPPORTED_CLAIM")
    def counts(item, keys):
        if not isinstance(item, dict) or set(item) != set(keys) or any(type(x) is not int or x < 0 for x in item.values()):
            raise ValueError("AGGREGATE_COUNTS_INVALID")
    if value["state"] == "NO_DATA":
        if any(value[key] != empty[key] for key in ("counts", "transitions", "optional_from_result", "error_sessions", "sample_status")):
            raise ValueError("NO_DATA_IS_UNKNOWN")
    elif value["state"] == "OBSERVED" and value["coverage"] == "COMPLETE_EXPORT":
        counts(value["counts"], COUNTS)
        expected_sample = "LOW_SAMPLE" if value["counts"]["sessions"] < 20 else "DESCRIPTIVE_ONLY"
        if not value["counts"]["sessions"] or value["sample_status"] != expected_sample:
            raise ValueError("AGGREGATE_SAMPLE_INVALID")
        if len(value["transitions"]) != 3:
            raise ValueError("AGGREGATE_TRANSITIONS_INVALID")
        for i, item in enumerate(value["transitions"]):
            if item.get("from") != STAGES[i] or item.get("to") != STAGES[i + 1]:
                raise ValueError("AGGREGATE_TRANSITIONS_INVALID")
            counts({k: v for k, v in item.items() if k not in {"from", "to"}}, ("eligible", "reached", "closed_not_reached", "pending"))
            if item["eligible"] != sum(item[k] for k in ("reached", "closed_not_reached", "pending")):
                raise ValueError("AGGREGATE_DENOMINATOR_INVALID")
        if set(value["optional_from_result"]) != set(OPTIONAL):
            raise ValueError("AGGREGATE_OPTIONAL_INVALID")
        for item in value["optional_from_result"].values():
            counts(item, ("result_sessions", "action_sessions"))
            if not item["action_sessions"] <= item["result_sessions"] <= value["counts"]["sessions"]:
                raise ValueError("AGGREGATE_DENOMINATOR_INVALID")
        counts(value["error_sessions"], ERRORS)
    else:
        raise ValueError("AGGREGATE_STATE_INVALID")
    if value["digest"] != digest({k: v for k, v in value.items() if k != "digest"}):
        raise ValueError("AGGREGATE_DIGEST_MISMATCH")
    return json.loads(canonical(value))
