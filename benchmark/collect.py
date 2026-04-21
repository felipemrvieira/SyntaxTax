#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
import sys
from typing import Any


ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_RESULTS_DIR = ROOT_DIR / "results" / "raw"
CSV_OUTPUT_PATH = ROOT_DIR / "results" / "summary.csv"


class CollectionError(Exception):
    pass


REQUIRED_TOP_LEVEL_FIELDS = {
    "stack_id",
    "metadata",
    "tooling",
    "audit",
    "warnings",
    "manifest",
    "totals",
    "views",
}

CSV_FIELDNAMES = [
    "stack_id",
    "language",
    "framework",
    "orm",
    "category_group",
    "view",
    "measurement_category",
    "tokens",
    "loc",
    "file_count",
    "chars",
    "view_tokens",
    "view_loc",
    "view_file_count",
    "view_chars",
    "stack_tokens",
    "stack_loc",
    "stack_file_count",
    "stack_chars",
    "warning_count",
    "manifest_entries",
    "python_version",
    "tokenizer",
    "tiktoken_version",
    "pyyaml_version",
    "tokenization_strategy",
    "file_ordering",
    "manifest_sha256",
    "corpus_sha256",
    "raw_json",
]


def load_result(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    missing = sorted(REQUIRED_TOP_LEVEL_FIELDS - payload.keys())
    if missing:
        raise CollectionError(f"{path.name} is missing required fields: {', '.join(missing)}")
    return payload


def normalize_manifest(payload: dict[str, Any]) -> list[dict[str, Any]]:
    manifest = payload.get("manifest")
    if not isinstance(manifest, list):
        raise CollectionError(f"{payload['stack_id']}: manifest must be a list")

    required_manifest_fields = {
        "path",
        "view",
        "category",
        "tokens",
        "loc",
        "chars",
        "file_count",
        "file_sha256",
        "size_bytes",
    }

    for index, entry in enumerate(manifest):
        if not isinstance(entry, dict):
            raise CollectionError(f"{payload['stack_id']}: manifest entry {index} must be an object")
        missing = sorted(required_manifest_fields - entry.keys())
        if missing:
            raise CollectionError(
                f"{payload['stack_id']}: manifest entry {index} is missing required fields: {', '.join(missing)}"
            )

    return manifest


def iter_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    metadata = payload["metadata"]
    tooling = payload["tooling"]
    totals = payload["totals"]
    audit = payload["audit"]
    manifest = normalize_manifest(payload)
    rows: list[dict[str, Any]] = []

    for view_name, view_data in sorted(payload["views"].items()):
        view_totals = view_data["totals"]
        categories = view_data.get("categories", {})
        for category_name, category_data in sorted(categories.items()):
            category_totals = category_data["totals"]
            rows.append(
                {
                    "stack_id": payload["stack_id"],
                    "language": metadata.get("language"),
                    "framework": metadata.get("framework"),
                    "orm": metadata.get("orm"),
                    "category_group": metadata.get("category"),
                    "view": view_name,
                    "measurement_category": category_name,
                    "tokens": category_totals.get("tokens", 0),
                    "loc": category_totals.get("loc", 0),
                    "file_count": category_totals.get("file_count", 0),
                    "chars": category_totals.get("chars", 0),
                    "view_tokens": view_totals.get("tokens", 0),
                    "view_loc": view_totals.get("loc", 0),
                    "view_file_count": view_totals.get("file_count", 0),
                    "view_chars": view_totals.get("chars", 0),
                    "stack_tokens": totals.get("tokens", 0),
                    "stack_loc": totals.get("loc", 0),
                    "stack_file_count": totals.get("file_count", 0),
                    "stack_chars": totals.get("chars", 0),
                    "warning_count": len(payload.get("warnings", [])),
                    "manifest_entries": len(manifest),
                    "python_version": tooling.get("python_version"),
                    "tokenizer": tooling.get("tokenizer"),
                    "tiktoken_version": tooling.get("tiktoken_version"),
                    "pyyaml_version": tooling.get("pyyaml_version"),
                    "tokenization_strategy": tooling.get("tokenization_strategy"),
                    "file_ordering": tooling.get("file_ordering"),
                    "manifest_sha256": audit.get("manifest_sha256"),
                    "corpus_sha256": audit.get("corpus_sha256"),
                    "raw_json": f"results/raw/{payload['stack_id']}.json",
                }
            )

    return rows


def collect_results() -> list[dict[str, Any]]:
    if not RAW_RESULTS_DIR.exists():
        raise CollectionError("results/raw does not exist. Run benchmark/measure.py first.")

    rows: list[dict[str, Any]] = []
    raw_files = sorted(RAW_RESULTS_DIR.glob("*.json"))
    if not raw_files:
        raise CollectionError("No raw result JSON files found in results/raw.")

    for path in raw_files:
        rows.extend(iter_rows(load_result(path)))

    if not rows:
        raise CollectionError("Raw result files were found, but no category rows could be generated.")
    return rows


def write_csv(rows: list[dict[str, Any]]) -> Path:
    CSV_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CSV_OUTPUT_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)
    return CSV_OUTPUT_PATH


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect raw benchmark JSON files into a consolidated CSV.")
    return parser.parse_args()


def main() -> int:
    parse_args()
    try:
        rows = collect_results()
        output_path = write_csv(rows)
    except CollectionError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(f"Collected {len(rows)} rows -> {output_path.relative_to(ROOT_DIR).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
