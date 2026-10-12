"""Check the two explicitly reviewed source snapshots and local patch only."""
import hashlib
import json
from pathlib import Path

BASE_SHA = "c0f861661f664edd70c45b6a29d20dfded0f5669"
GROWTH_SHA = "dc50636ae97f6f3a9a5d76be2c7968b69cd1f920"


def verify_sources(root):
    root = Path(root).resolve()
    here = Path(__file__).with_name("upstream")
    manifest = json.loads((here / "source-manifest.json").read_text())
    patched = json.loads((here / "patched-sha256.json").read_text())
    for file in manifest:
        relative = file["repo"] + "/" + file["path"]
        expected_commit = BASE_SHA if file["repo"] == "agent-base" else GROWTH_SHA
        if file["commit"] != expected_commit:
            raise ValueError("SAJU_SOURCE_PIN_INVALID")
        raw = (root / relative).read_bytes()
        if relative in patched:
            valid = hashlib.sha256(raw).hexdigest() == patched[relative]
        else:
            valid = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest() == file["blob"]
        if not valid:
            raise ValueError("SAJU_SOURCE_DRIFT:" + relative)
    original_paths = {item["repo"] + "/" + item["path"] for item in manifest}
    for relative in set(patched) - original_paths:
        if hashlib.sha256((root / relative).read_bytes()).hexdigest() != patched[relative]:
            raise ValueError("SAJU_SOURCE_DRIFT:" + relative)
    return root
