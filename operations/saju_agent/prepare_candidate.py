"""Create a review archive locally. Never install, register, push or connect.

Requires a clean committed app and pinned local source copies. Every remote path
in the manifest is a PROPOSED destination, not an existence assertion.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

from .sources import BASE_SHA, GROWTH_SHA, verify_sources

APP_BASE = "3f0ddb8adffa62fbfa256966dbee1bac7ef271bf"
HERE = Path(__file__).resolve().parent
APP = HERE.parents[1]
PROPOSED_ROOT = "/home/muk/.openclaw/workspace/automation/saju-agent"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=APP)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def prepare(output, sources):
    verify_sources(sources)
    if git("status", "--porcelain", "--untracked-files=normal").strip():
        raise ValueError("COMMITTED_CLEAN_APP_REQUIRED")
    output = Path(output).resolve()
    if output.exists():
        raise ValueError("NEW_OUTPUT_DIRECTORY_REQUIRED")
    commit = git("rev-parse", "HEAD").decode().strip()
    branch = git("branch", "--show-current").decode().strip()
    source_copy_commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=Path(sources), text=True).strip()
    payload = {}
    for name in git("ls-tree", "-r", "--name-only", "HEAD", "operations/saju_agent").decode().splitlines():
        payload["app/" + name] = git("show", "HEAD:" + name)
    payload["patches/agent-base.patch"] = (HERE / "upstream/public-local.patch").read_bytes()
    payload["patches/wd-7k2n-app.patch"] = git("diff", "--binary", APP_BASE, "HEAD", "--", ".")
    release = PROPOSED_ROOT + "/releases/" + commit
    state = PROPOSED_ROOT + "/state/" + commit
    native_files = {name: sha((HERE / name).read_bytes()) for name in ("manifest.json", "native_handler.py", "handler.py", "telemetry.py", "brief.json")}
    manifest = {
        "schema": "SAJU_INSTALL_CANDIDATE_V2", "status": "PREPARED_NOT_INSTALLED",
        "candidate_id": commit, "automatic_start": False,
        "target_device": {"label": "MiniHQ", "host": "DESKTOP-GF8ODN1", "environment": "Ubuntu-24.04",
                          "identity_basis": "Previously confirmed device; no new remote access in this task"},
        "paths_status": "PROPOSED_NOT_EXISTENCE_VERIFIED",
        "source": {
            "app": {"repository": "anrrlf-hue/wd-7k2n-app", "base": APP_BASE, "commit": commit,
                    "local_branch": branch, "proposed_review_branch": "review/saju-agent-cost-guard"},
            "base": {"repository": "anrrlf-hue/agent-base", "commit": BASE_SHA,
                     "local_source_copy_commit": source_copy_commit,
                     "proposed_review_branch": "review/saju-public-local-model-budget", "patch": "patches/agent-base.patch"},
            "growth": {"repository": "anrrlf-hue/insurance-growth-agent", "commit": GROWTH_SHA, "patch": None},
            "require_complete_repository_snapshots": True, "do_not_use_current_aliases": True,
        },
        "proposed_paths": {"root": PROPOSED_ROOT, "release": release, "app_package": release + "/app",
            "base_source": release + "/sources/agent-base", "growth_source": release + "/sources/insurance-growth-agent",
            "base_runtime_root": state + "/base", "base_db": state + "/base/base-runtime.sqlite",
            "native_workpack": state + "/base/workpacks/saju_agent_prepare", "growth_state": state + "/growth",
            "artifacts": state + "/base/artifacts/saju-agent"},
        "planned_file_install": [
            "Require an unused approved candidate destination; abort on collision, never overwrite",
            "Obtain complete pinned repository snapshots into this separate release; verify commits and file hashes",
            "Apply agent-base.patch only to the separate Base copy; Growth source remains unchanged",
            "Copy app/operations/saju_agent into the release app package and the five pinned native files into its separate runtime",
            "Create a release-local runtime contract link to this candidate Base contract only",
            "Write candidate-local environment template only; do not export into a running service",
        ],
        "native_files_sha256": native_files,
        "manual_environment_template_not_applied": {"AGENT_BASE_ROOT": state + "/base", "AGENT_BASE_DB": state + "/base/base-runtime.sqlite",
            "AGENT_BASE_GOAL_AGENT_V1": "1", "PYTHONPATH": ":".join([release + "/app", release + "/sources/agent-base/contract", release + "/sources/insurance-growth-agent"])},
        "registration": {"performed": False, "tenant_candidate": "saju", "goal_candidate": "saju-preparation",
            "domain": "saju-agent", "environment": "SANDBOX", "initial_goal_status": "DRAFT",
            "registry_review_ref": None, "goal_activation_approval_ref": None, "model_budget_approval_ref": None},
        "budget_proposal_not_approval": json.loads((HERE / "model-policy.pending.json").read_text()),
        "actual_provider_status": "BLOCKED_PROVIDER_HARD_LIMIT_AND_USAGE_UNVERIFIED",
        "registration_and_execution": [
            "No Goal/registry registration occurs during file installation",
            "No service, cron, timer, watcher, port or automatic model run is installed",
            "Manual build_agent + advance_once only after separate reviewed Goal/registry and complete billing approval",
            "Existing reviewed llm-task remains blocked until hard output limit, whole-input counting, complete usage and billing ceilings are proven",
            "Runtime budget tables are created in the separate Base DB only when an approved manual run is opened",
        ],
        "excluded": ["running services", "reviewed original directories", "customer/insurance databases", "credentials", "new permissions",
                     "provider configuration", "Production deployment", "analytics activation", "publishing", "messages"],
        "rollback": [
            "File-only install starts nothing: stop referencing the candidate environment and retain its inert release",
            "If a later approved run is active, stop new Saju claims through its existing tenant/Goal authority; do not affect other Goals",
            "Preserve run reservations, UNKNOWN calls and evidence; never reset budgets or replay unknown submissions",
            "Retain state for review; do not delete or overwrite existing services, sources or databases",
            "App deployment is separate: record and use the actually verified preceding deployment ID; do not assume the development base is Production",
        ],
        "files_sha256": {name: sha(raw) for name, raw in sorted(payload.items())},
    }
    payload["install-manifest.json"] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()
    output.mkdir(parents=True)
    (output / "install-manifest.json").write_bytes(payload["install-manifest.json"])
    archive = output / "saju-agent-candidate.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for name, raw in sorted(payload.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 12, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, raw)
    (output / "SHA256SUMS").write_text("".join(f"{sha(path.read_bytes())}  {path.name}\n" for path in (archive, output / "install-manifest.json")))
    return {"archive": str(archive), "sha256": sha(archive.read_bytes()), "manifest": str(output / "install-manifest.json"), "app_commit": commit}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.output, args.sources), ensure_ascii=False))


if __name__ == "__main__":
    main()
