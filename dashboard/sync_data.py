#!/usr/bin/env python3
from __future__ import annotations

import shutil
from pathlib import Path
import sys
import json


ROOT_DIR = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT_DIR / "results"
RAW_RESULTS_DIR = RESULTS_DIR / "raw"
DASHBOARD_DATA_DIR = ROOT_DIR / "dashboard" / "data"
FILES = ("analysis.csv", "summary.csv")


def main() -> int:
    DASHBOARD_DATA_DIR.mkdir(parents=True, exist_ok=True)

    for filename in FILES:
        source = RESULTS_DIR / filename
        target = DASHBOARD_DATA_DIR / filename

        if not source.exists():
            print(f"missing source file: {source}", file=sys.stderr)
            return 1

        shutil.copy2(source, target)
        print(f"synced {source.relative_to(ROOT_DIR)} -> {target.relative_to(ROOT_DIR)}")

    metadata = build_metadata()
    metadata_path = DASHBOARD_DATA_DIR / "metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"synced metadata -> {metadata_path.relative_to(ROOT_DIR)}")

    return 0


def build_metadata() -> dict[str, object]:
    generated_at_values: list[str] = []
    stack_ids: list[str] = []
    warning_count = 0

    for path in sorted(RAW_RESULTS_DIR.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        stack_ids.append(payload["stack_id"])
        generated_at_values.append(payload["audit"]["generated_at"])
        warning_count += len(payload.get("warnings", []))

    return {
        "stack_count": len(stack_ids),
        "stacks": stack_ids,
        "latest_generated_at": max(generated_at_values) if generated_at_values else None,
        "warning_count": warning_count,
    }


if __name__ == "__main__":
    raise SystemExit(main())
