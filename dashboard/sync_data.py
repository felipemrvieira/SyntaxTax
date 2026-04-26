#!/usr/bin/env python3
from __future__ import annotations

import shutil
from pathlib import Path
import sys


ROOT_DIR = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT_DIR / "results"
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

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
