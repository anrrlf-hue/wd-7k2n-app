"""Pinned Base entrypoint. Install only with the complete reviewed package."""
import importlib.util
from pathlib import Path


def _implementation():
    # Base validates all four source files + manifest against native_files before
    # loading this handler. Resolve siblings; do not import an ambient app copy.
    spec = importlib.util.spec_from_file_location("saju_pinned_handler", Path(__file__).with_name("handler.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def execute(context):
    return _implementation().execute(context)


def verify(context, result):
    return _implementation().verify(context, result)


def recover_submit_unknown(context, result):
    return _implementation().recover_submit_unknown(context, result)
