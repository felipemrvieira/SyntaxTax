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
SUMMARY_CSV_OUTPUT_PATH = ROOT_DIR / "results" / "summary.csv"
ANALYSIS_CSV_OUTPUT_PATH = ROOT_DIR / "results" / "analysis.csv"


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

ANALYSIS_CSV_FIELDNAMES = [
    "stack_id",
    "language",
    "framework",
    "total_tokens",
    "handwritten_tokens",
    "functional_tokens",
    "operational_tokens",
    "handwritten_ratio",
    "operational_ratio",
    "config_heavy_stack",
    "api_tokens",
    "domain_tokens",
    "persistence_tokens",
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


def require_mapping(value: Any, context: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise CollectionError(f"{context} must be an object")
    return value


def token_count_from_view(payload: dict[str, Any], view_name: str) -> int:
    views = require_mapping(payload["views"], f"{payload['stack_id']}: views")
    view = views.get(view_name)
    if view is None:
        return 0

    view_mapping = require_mapping(view, f"{payload['stack_id']}: view '{view_name}'")
    totals = require_mapping(view_mapping.get("totals"), f"{payload['stack_id']}: view '{view_name}' totals")
    return int(totals.get("tokens", 0))


def token_count_from_category(payload: dict[str, Any], view_name: str, category_name: str) -> int:
    views = require_mapping(payload["views"], f"{payload['stack_id']}: views")
    view = views.get(view_name)
    if view is None:
        return 0

    view_mapping = require_mapping(view, f"{payload['stack_id']}: view '{view_name}'")
    categories = require_mapping(
        view_mapping.get("categories", {}),
        f"{payload['stack_id']}: view '{view_name}' categories",
    )
    category = categories.get(category_name)
    if category is None:
        return 0

    category_mapping = require_mapping(
        category,
        f"{payload['stack_id']}: view '{view_name}' category '{category_name}'",
    )
    totals = require_mapping(
        category_mapping.get("totals"),
        f"{payload['stack_id']}: view '{view_name}' category '{category_name}' totals",
    )
    return int(totals.get("tokens", 0))


def safe_ratio(part: int, whole: int) -> float:
    if whole == 0:
        return 0.0
    return round(part / whole, 6)


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


def build_analysis_row(payload: dict[str, Any]) -> dict[str, Any]:
    metadata = require_mapping(payload["metadata"], f"{payload['stack_id']}: metadata")
    totals = require_mapping(payload["totals"], f"{payload['stack_id']}: totals")

    total_tokens = int(totals.get("tokens", 0))
    handwritten_tokens = token_count_from_view(payload, "handwritten")
    operational_tokens = token_count_from_view(payload, "operational_extras")
    api_tokens = token_count_from_category(payload, "handwritten", "api")
    domain_tokens = token_count_from_category(payload, "handwritten", "domain")
    persistence_tokens = token_count_from_category(payload, "handwritten", "persistence")

    return {
        "stack_id": payload["stack_id"],
        "language": metadata.get("language"),
        "framework": metadata.get("framework"),
        "total_tokens": total_tokens,
        "handwritten_tokens": handwritten_tokens,
        "functional_tokens": handwritten_tokens,
        "operational_tokens": operational_tokens,
        "handwritten_ratio": safe_ratio(handwritten_tokens, total_tokens),
        "operational_ratio": safe_ratio(operational_tokens, total_tokens),
        "config_heavy_stack": operational_tokens > handwritten_tokens,
        "api_tokens": api_tokens,
        "domain_tokens": domain_tokens,
        "persistence_tokens": persistence_tokens,
    }


def collect_payloads() -> list[dict[str, Any]]:
    if not RAW_RESULTS_DIR.exists():
        raise CollectionError("results/raw does not exist. Run benchmark/measure.py first.")

    raw_files = sorted(RAW_RESULTS_DIR.glob("*.json"))
    if not raw_files:
        raise CollectionError("No raw result JSON files found in results/raw.")

    payloads: list[dict[str, Any]] = []
    for path in raw_files:
        payloads.append(load_result(path))

    return payloads


def collect_summary_rows(payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for payload in payloads:
        rows.extend(iter_rows(payload))

    if not rows:
        raise CollectionError("Raw result files were found, but no category rows could be generated.")
    return rows


def collect_analysis_rows(payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = [build_analysis_row(payload) for payload in payloads]
    if not rows:
        raise CollectionError("Raw result files were found, but no analysis rows could be generated.")
    rows.sort(key=lambda row: str(row["stack_id"]))
    return rows


def write_summary_csv(rows: list[dict[str, Any]]) -> Path:
    SUMMARY_CSV_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with SUMMARY_CSV_OUTPUT_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)
    return SUMMARY_CSV_OUTPUT_PATH


def write_analysis_csv(rows: list[dict[str, Any]]) -> Path:
    ANALYSIS_CSV_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with ANALYSIS_CSV_OUTPUT_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=ANALYSIS_CSV_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)
    return ANALYSIS_CSV_OUTPUT_PATH


def print_analysis_summary(rows: list[dict[str, Any]]) -> None:
    ranking_by_functional = sorted(rows, key=lambda row: (-int(row["functional_tokens"]), str(row["stack_id"])))
    ranking_by_total = sorted(rows, key=lambda row: (-int(row["total_tokens"]), str(row["stack_id"])))
    ranking_by_handwritten = sorted(rows, key=lambda row: (-int(row["handwritten_tokens"]), str(row["stack_id"])))
    config_heavy_rows = [row for row in rows if bool(row["config_heavy_stack"])]

    print("Primary ranking by functional_tokens:")
    for index, row in enumerate(ranking_by_functional, start=1):
        print(f"{index}. {row['stack_id']} ({row['functional_tokens']})")

    print("Ranking by total_tokens:")
    for index, row in enumerate(ranking_by_total, start=1):
        print(f"{index}. {row['stack_id']} ({row['total_tokens']})")

    print("Ranking by handwritten_tokens:")
    for index, row in enumerate(ranking_by_handwritten, start=1):
        print(f"{index}. {row['stack_id']} ({row['handwritten_tokens']})")

    print("Config-heavy stacks:")
    if not config_heavy_rows:
        print("- none")
    else:
        for row in sorted(config_heavy_rows, key=lambda item: str(item["stack_id"])):
            operational_ratio_pct = round(float(row["operational_ratio"]) * 100, 2)
            print(f"- {row['stack_id']}")
            print(
                f"  Stack {row['stack_id']} appears inflated by configuration cost "
                f"({operational_ratio_pct}% of total tokens)."
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect raw benchmark JSON files into a consolidated CSV.")
    return parser.parse_args()


def main() -> int:
    parse_args()
    try:
        payloads = collect_payloads()
        summary_rows = collect_summary_rows(payloads)
        analysis_rows = collect_analysis_rows(payloads)
        summary_output_path = write_summary_csv(summary_rows)
        analysis_output_path = write_analysis_csv(analysis_rows)
    except CollectionError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(f"Collected {len(summary_rows)} rows -> {summary_output_path.relative_to(ROOT_DIR).as_posix()}")
    print(f"Collected {len(analysis_rows)} rows -> {analysis_output_path.relative_to(ROOT_DIR).as_posix()}")
    print_analysis_summary(analysis_rows)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
