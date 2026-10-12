"""Local preview only. Omitting --fixture yields NO_DATA/WAIT."""
import argparse
import json
from pathlib import Path

from .handler import review
from .product_request import prepare_product_request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--fixture", type=Path)
args = parser.parse_args()
snapshot = json.loads(args.fixture.read_text()) if args.fixture else None
print(json.dumps({"review": review(snapshot), "product_handoff": prepare_product_request(snapshot)}, ensure_ascii=False, indent=2))
