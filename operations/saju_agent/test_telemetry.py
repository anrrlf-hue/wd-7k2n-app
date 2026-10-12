import copy
import json
import unittest
from .telemetry import aggregate, validate_aggregate, digest

WINDOW = {"realm": "TEST", "start": "2026-10-12T00:00:00Z", "end": "2026-10-12T01:00:00Z", "observed_until": "2026-10-12T01:30:00Z", "coverage": "COMPLETE_EXPORT"}


def event(name, n, *, session="s" * 20, reading="r" * 20, minute=0, realm="TEST"):
    return {"schema": "SAJU_EVENT_V2", "realm": realm, "receivedAt": f"2026-10-12T00:{minute:02d}:{n % 60:02d}Z",
            "event": name, "eventId": f"event-{n:016}", "sessionId": session, "readingId": reading,
            "path": "/palm", "props": {}}


def sample():
    return [event(name, i) for i, name in enumerate(("landing_viewed", "reading_started", "free_report_completed", "result_viewed", "share_intent", "share_cancelled", "link_copied"))]


class TelemetryTests(unittest.TestCase):
    def test_disabled_absent_are_unknown_not_zero(self):
        for coverage in ("DISABLED", "UNKNOWN", "COMPLETE_EXPORT"):
            value = validate_aggregate(aggregate([], **{**WINDOW, "coverage": coverage}))
            self.assertEqual("NO_DATA", value["state"])
            self.assertIsNone(value["counts"])

    def test_ordered_funnel_duplicate_optional_and_no_people_claim(self):
        rows = sample()
        rows += [copy.deepcopy(rows[1])]
        value = validate_aggregate(aggregate(rows, **WINDOW))
        self.assertEqual(1, value["counts"]["sessions"])
        self.assertEqual(1, value["counts"]["duplicate_events"])
        self.assertTrue(all(t["reached"] == 1 and t["closed_not_reached"] == 0 for t in value["transitions"]))
        self.assertEqual({"result_sessions": 1, "action_sessions": 0}, value["optional_from_result"]["premium_report_viewed"])
        self.assertEqual(1, value["optional_from_result"]["link_copied"]["action_sessions"])
        self.assertIsNone(value["delivered_shares"])
        self.assertIsNone(value["people"])
        self.assertNotIn("sessionId", json.dumps(value))
        self.assertNotIn("r" * 20, json.dumps(value))

    def test_unlinked_or_out_of_order_is_not_conversion(self):
        rows = [event("result_viewed", 1), event("reading_started", 2), event("free_report_completed", 3)]
        value = aggregate(rows, **WINDOW)
        self.assertEqual(0, value["counts"]["results_viewed"])
        self.assertEqual(1, value["counts"]["unlinked_result_events"])
        self.assertEqual(1, value["transitions"][2]["closed_not_reached"])

    def test_retry_stays_single_reading_and_pending_session_not_dropout(self):
        rows = [event(name, i, minute=59) for i, name in enumerate(("landing_viewed", "reading_started", "analysis_timeout", "analysis_retry", "reading_started"))]
        value = aggregate(rows, **{**WINDOW, "observed_until": "2026-10-12T01:01:00Z"})
        self.assertEqual(1, value["counts"]["readings_started"])
        self.assertEqual(1, value["transitions"][1]["pending"])
        self.assertEqual(0, value["transitions"][1]["closed_not_reached"])
        self.assertEqual(1, value["error_sessions"]["analysis_timeout"])

    def test_realms_conflicts_private_data_and_fake_denominator_rejected(self):
        for bad in [event("landing_viewed", 1, realm="LIVE"), {**event("landing_viewed", 1), "birthDate": "PRIVATE"}]:
            with self.assertRaises(ValueError):
                aggregate([bad], **WINDOW)
        rows = sample()
        with self.assertRaisesRegex(ValueError, "REPLAY_CONFLICT"):
            aggregate(rows + [{**rows[0], "event": "link_copied"}], **WINDOW)
        value = aggregate(rows, **WINDOW)
        for mutate in (lambda x: x.update(raw="PRIVATE"), lambda x: x.update(people=1),
                       lambda x: x["transitions"][0].update(reached=99)):
            bad = copy.deepcopy(value); mutate(bad)
            bad["digest"] = digest({k: v for k, v in bad.items() if k != "digest"})
            with self.assertRaises(ValueError):
                validate_aggregate(bad)

    def test_live_observation_is_descriptive_not_business_proof(self):
        rows = [{**row, "realm": "LIVE"} for row in sample()]
        value = validate_aggregate(aggregate(rows, **{**WINDOW, "realm": "LIVE"}))
        self.assertEqual("LIVE", value["realm"])
        self.assertEqual("LOW_SAMPLE", value["sample_status"])
        self.assertIsNone(value["causal_effect"])
        self.assertIsNone(value["new_customers"])


if __name__ == "__main__":
    unittest.main()
