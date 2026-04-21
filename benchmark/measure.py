#!/usr/bin/env python3
from __future__ import annotations

import argparse
import fnmatch
import hashlib
import importlib.metadata
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import sys
from typing import Any

import yaml

try:
    import tiktoken
except ModuleNotFoundError:  # pragma: no cover - handled at runtime
    tiktoken = None


ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT_DIR / "benchmark_config.yaml"
RAW_RESULTS_DIR = ROOT_DIR / "results" / "raw"


class MeasurementError(Exception):
    pass


@dataclass(frozen=True)
class FileMetrics:
    tokens: int
    loc: int
    chars: int
    size_bytes: int
    file_sha256: str


def load_config() -> dict[str, Any]:
    with CONFIG_PATH.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, dict):
        raise MeasurementError("benchmark_config.yaml must contain a mapping at the top level.")
    return data


def require_tokenizer(config: dict[str, Any]) -> Any:
    if tiktoken is None:
        raise MeasurementError(
            "tiktoken is required to measure tokens. Install it before running benchmark/measure.py."
        )

    tokenizer_name = config["settings"]["tokenizer"]
    try:
        return tiktoken.get_encoding(tokenizer_name)
    except Exception as exc:  # pragma: no cover - defensive runtime handling
        raise MeasurementError(f"Failed to load tokenizer '{tokenizer_name}': {exc}") from exc


def safe_package_version(distribution_name: str) -> str | None:
    try:
        return importlib.metadata.version(distribution_name)
    except importlib.metadata.PackageNotFoundError:
        return None


def stable_relpath(path: Path, root_path: Path) -> str:
    return path.relative_to(root_path).as_posix()


def is_globally_excluded(relpath: str, exclude_patterns: list[str]) -> bool:
    prefixed = f"/{relpath}"
    return any(
        fnmatch.fnmatch(relpath, pattern) or fnmatch.fnmatch(prefixed, pattern)
        for pattern in exclude_patterns
    )


def expand_pattern(
    root_path: Path,
    pattern: str,
    exclude_patterns: list[str],
) -> list[Path]:
    matches = []
    for path in root_path.glob(pattern):
        if not path.is_file():
            continue
        relpath = stable_relpath(path, root_path)
        if is_globally_excluded(relpath, exclude_patterns):
            continue
        matches.append(path)
    matches.sort(key=lambda item: stable_relpath(item, root_path))
    return matches


def read_text_bytes(path: Path) -> tuple[str, bytes]:
    try:
        payload = path.read_bytes()
    except OSError as exc:
        raise MeasurementError(f"Failed to read file: {path}") from exc

    try:
        return payload.decode("utf-8"), payload
    except UnicodeDecodeError as exc:
        raise MeasurementError(f"File is not valid UTF-8: {path}") from exc


def count_raw_text_lines(content: str) -> int:
    # LOC here is a raw text line count for the full file content.
    return len(content.splitlines())


def calculate_file_metrics(content: str, payload: bytes, encoder: Any) -> FileMetrics:
    return FileMetrics(
        tokens=len(encoder.encode(content)),
        loc=count_raw_text_lines(content),
        chars=len(content),
        size_bytes=len(payload),
        file_sha256=hashlib.sha256(payload).hexdigest(),
    )


def empty_metrics() -> dict[str, int]:
    return {"tokens": 0, "loc": 0, "file_count": 0, "chars": 0}


def add_metrics(target: dict[str, int], source: dict[str, int]) -> None:
    for key in ("tokens", "loc", "file_count", "chars"):
        target[key] += source[key]


def calculate_hashes(manifest_entries: list[dict[str, Any]], root_path: Path) -> tuple[str, str]:
    corpus = hashlib.sha256()
    for entry in manifest_entries:
        path = root_path / entry["path"]
        corpus.update(path.read_bytes())

    manifest_payload = json.dumps(manifest_entries, sort_keys=True, separators=(",", ":")).encode("utf-8")
    manifest_sha256 = hashlib.sha256(manifest_payload).hexdigest()
    return corpus.hexdigest(), manifest_sha256


def build_measurement(stack_id: str) -> dict[str, Any]:
    config = load_config()
    settings = config.get("settings", {})
    stacks = config.get("stacks", {})
    exclude_patterns = list(config.get("global_exclude", []))

    if stack_id not in stacks:
        available = ", ".join(sorted(stacks))
        raise MeasurementError(f"Unknown stack '{stack_id}'. Available stacks: {available}")

    encoder = require_tokenizer(config)
    stack_config = stacks[stack_id]
    root_path = (ROOT_DIR / stack_config["root_path"]).resolve()
    if not root_path.exists():
        raise MeasurementError(f"Stack root path does not exist: {root_path}")

    warnings: list[str] = []
    manifest_entries: list[dict[str, Any]] = []
    seen_files: dict[str, tuple[str, str]] = {}
    view_payload: dict[str, Any] = {}
    overall_totals = empty_metrics()

    for view_name in ("handwritten", "operational_extras"):
        categories = stack_config.get(view_name, {})
        view_totals = empty_metrics()
        category_payload: dict[str, Any] = {}

        for category_name, patterns in categories.items():
            category_totals = empty_metrics()
            category_files: list[dict[str, Any]] = []
            matched_in_category: set[str] = set()

            for pattern in patterns:
                matches = expand_pattern(root_path, pattern, exclude_patterns)
                if not matches:
                    warnings.append(
                        f"stack={stack_id} view={view_name} category={category_name} pattern={pattern} produced no matches"
                    )
                for path in matches:
                    relpath = stable_relpath(path, root_path)
                    if relpath in matched_in_category:
                        continue

                    if relpath in seen_files:
                        existing_view, existing_category = seen_files[relpath]
                        raise MeasurementError(
                            "Duplicate file detected across categories: "
                            f"{relpath} already assigned to {existing_view}/{existing_category}, "
                            f"cannot also assign to {view_name}/{category_name}"
                        )

                    content, payload = read_text_bytes(path)
                    metrics = calculate_file_metrics(content, payload, encoder)
                    file_totals = {
                        "tokens": metrics.tokens,
                        "loc": metrics.loc,
                        "file_count": 1,
                        "chars": metrics.chars,
                    }
                    add_metrics(category_totals, file_totals)

                    category_files.append(
                        {
                            "path": relpath,
                            "view": view_name,
                            "category": category_name,
                            "tokens": metrics.tokens,
                            "loc": metrics.loc,
                            "chars": metrics.chars,
                            "file_count": 1,
                            "file_sha256": metrics.file_sha256,
                            "size_bytes": metrics.size_bytes,
                        }
                    )
                    manifest_entries.append(category_files[-1])
                    matched_in_category.add(relpath)
                    seen_files[relpath] = (view_name, category_name)

            if patterns and not category_files:
                warnings.append(f"stack={stack_id} view={view_name} category={category_name} is empty")

            category_payload[category_name] = {
                "totals": category_totals,
                "files": sorted(category_files, key=lambda item: item["path"]),
            }
            add_metrics(view_totals, category_totals)

        view_payload[view_name] = {
            "totals": view_totals,
            "categories": category_payload,
        }
        add_metrics(overall_totals, view_totals)

    manifest_entries.sort(key=lambda item: item["path"])
    corpus_sha256, manifest_sha256 = calculate_hashes(manifest_entries, root_path)

    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    return {
        "stack_id": stack_id,
        "metadata": dict(stack_config.get("metadata", {})),
        "tooling": {
            "python_version": sys.version.split()[0],
            "tokenizer": settings.get("tokenizer"),
            "tiktoken_version": safe_package_version("tiktoken"),
            "pyyaml_version": safe_package_version("PyYAML"),
            "metrics": list(settings.get("metrics", [])),
            "tokenization_strategy": settings.get("tokenization_strategy"),
            "file_ordering": settings.get("file_ordering"),
            "loc_semantics": "raw_text_lines",
        },
        "audit": {
            "generated_at": generated_at,
            "config_path": CONFIG_PATH.relative_to(ROOT_DIR).as_posix(),
            "stack_root": root_path.relative_to(ROOT_DIR).as_posix(),
            "corpus_sha256": corpus_sha256,
            "manifest_sha256": manifest_sha256,
        },
        "warnings": warnings,
        "manifest": manifest_entries,
        "totals": overall_totals,
        "views": view_payload,
    }


def write_measurement(payload: dict[str, Any]) -> Path:
    RAW_RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = RAW_RESULTS_DIR / f"{payload['stack_id']}.json"
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    return output_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Measure a benchmark stack defined in benchmark_config.yaml.")
    parser.add_argument("stack_id", help="Stack identifier from benchmark_config.yaml")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        payload = build_measurement(args.stack_id)
        output_path = write_measurement(payload)
    except MeasurementError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(f"Measured stack '{args.stack_id}' -> {output_path.relative_to(ROOT_DIR).as_posix()}")
    if payload["warnings"]:
        print(f"Warnings: {len(payload['warnings'])}")
        for warning in payload["warnings"]:
            print(f"- {warning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
