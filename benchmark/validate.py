#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Any

import requests


ROOT_DIR = Path(__file__).resolve().parent.parent
REPORT_PATH = ROOT_DIR / "logs" / "validate_report.json"


class ValidationFailure(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate functional equivalence for a benchmark stack.")
    parser.add_argument("base_url", help="Base URL for the stack under validation, for example http://localhost:8000")
    return parser.parse_args()


def join_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationFailure(message)


def request_json(
    session: requests.Session,
    method: str,
    url: str,
    *,
    expected_statuses: set[int],
    json_body: dict[str, Any] | None = None,
) -> Any:
    try:
        response = session.request(method, url, json=json_body, timeout=10)
    except requests.RequestException as exc:
        raise ValidationFailure(f"request failed for {method} {url}: {exc}") from exc

    expect(
        response.status_code in expected_statuses,
        f"{method} {url} returned HTTP {response.status_code}, expected one of {sorted(expected_statuses)}",
    )

    try:
        return response.json()
    except ValueError as exc:
        raise ValidationFailure(f"{method} {url} did not return valid JSON") from exc


def require_object(value: Any, context: str) -> dict[str, Any]:
    expect(isinstance(value, dict), f"{context} must be a JSON object")
    return value


def require_list(value: Any, context: str) -> list[Any]:
    expect(isinstance(value, list), f"{context} must be a JSON array")
    return value


def require_keys(payload: dict[str, Any], keys: list[str], context: str) -> None:
    missing = [key for key in keys if key not in payload]
    expect(not missing, f"{context} is missing required fields: {', '.join(missing)}")


def require_positive_number(value: Any, context: str) -> float:
    expect(isinstance(value, (int, float)) and not isinstance(value, bool), f"{context} must be numeric")
    return float(value)


def run_validation(base_url: str) -> dict[str, Any]:
    session = requests.Session()
    user_id: int | None = None
    product_id: int | None = None
    product_price = 3500.0
    order_id: int | None = None
    expected_total = 7000.0

    failures: list[dict[str, str]] = []
    tests_run = 0
    tests_passed = 0

    def execute(test_name: str, fn: Any) -> None:
        nonlocal tests_run, tests_passed, user_id, product_id, order_id

        tests_run += 1
        try:
            fn()
        except ValidationFailure as exc:
            failures.append({"test": test_name, "message": str(exc)})
            print(f"[FAIL] {test_name}")
            return

        tests_passed += 1
        print(f"[PASS] {test_name}")

    def test_create_user() -> None:
        nonlocal user_id
        payload = request_json(
            session,
            "POST",
            join_url(base_url, "/users"),
            expected_statuses={200, 201},
            json_body={"name": "Felipe", "email": "felipe@example.com"},
        )
        user = require_object(payload, "create_user response")
        require_keys(user, ["id", "name", "email"], "create_user response")
        expect(user["name"] == "Felipe", "create_user response returned unexpected name")
        expect(user["email"] == "felipe@example.com", "create_user response returned unexpected email")
        expect(isinstance(user["id"], int), "create_user response field 'id' must be an integer")
        user_id = user["id"]

    def test_list_users() -> None:
        payload = request_json(
            session,
            "GET",
            join_url(base_url, "/users"),
            expected_statuses={200},
        )
        users = require_list(payload, "list_users response")
        expect(any(isinstance(item, dict) and item.get("id") == user_id for item in users), "list_users did not include created user")

    def test_get_user_by_id() -> None:
        expect(user_id is not None, "create_user must succeed before get_user_by_id")
        payload = request_json(
            session,
            "GET",
            join_url(base_url, f"/users/{user_id}"),
            expected_statuses={200},
        )
        user = require_object(payload, "get_user_by_id response")
        require_keys(user, ["id", "name", "email"], "get_user_by_id response")
        expect(user["id"] == user_id, "get_user_by_id returned unexpected id")

    def test_create_product() -> None:
        nonlocal product_id
        payload = request_json(
            session,
            "POST",
            join_url(base_url, "/products"),
            expected_statuses={200, 201},
            json_body={"name": "Notebook", "price": product_price},
        )
        product = require_object(payload, "create_product response")
        require_keys(product, ["id", "name", "price"], "create_product response")
        expect(product["name"] == "Notebook", "create_product response returned unexpected name")
        returned_price = require_positive_number(product["price"], "create_product response field 'price'")
        expect(abs(returned_price - product_price) < 0.000001, "create_product response returned unexpected price")
        expect(isinstance(product["id"], int), "create_product response field 'id' must be an integer")
        product_id = product["id"]

        list_payload = request_json(
            session,
            "GET",
            join_url(base_url, "/products"),
            expected_statuses={200},
        )
        products = require_list(list_payload, "list_products response")
        expect(
            any(isinstance(item, dict) and item.get("id") == product_id for item in products),
            "list_products did not include created product",
        )

        get_payload = request_json(
            session,
            "GET",
            join_url(base_url, f"/products/{product_id}"),
            expected_statuses={200},
        )
        fetched_product = require_object(get_payload, "get_product_by_id response")
        require_keys(fetched_product, ["id", "name", "price"], "get_product_by_id response")
        expect(fetched_product["id"] == product_id, "get_product_by_id returned unexpected id")

    def test_create_order() -> None:
        nonlocal order_id
        expect(user_id is not None, "create_user must succeed before create_order")
        expect(product_id is not None, "create_product must succeed before create_order")
        payload = request_json(
            session,
            "POST",
            join_url(base_url, "/orders"),
            expected_statuses={200, 201},
            json_body={
                "user_id": user_id,
                "items": [{"product_id": product_id, "quantity": 2}],
            },
        )
        order = require_object(payload, "create_order response")
        require_keys(order, ["id", "user", "items", "total", "status", "created_at"], "create_order response")
        expect(isinstance(order["id"], int), "create_order response field 'id' must be an integer")
        user = require_object(order["user"], "create_order response field 'user'")
        require_keys(user, ["id", "name"], "create_order response field 'user'")
        expect(user["id"] == user_id, "create_order response embedded user id is incorrect")
        items = require_list(order["items"], "create_order response field 'items'")
        expect(len(items) >= 1, "create_order response field 'items' must not be empty")
        first_item = require_object(items[0], "create_order response first item")
        require_keys(first_item, ["product_id", "quantity", "unit_price"], "create_order response first item")
        expect(first_item["product_id"] == product_id, "create_order response first item has unexpected product_id")
        expect(first_item["quantity"] == 2, "create_order response first item has unexpected quantity")
        total = require_positive_number(order["total"], "create_order response field 'total'")
        expect(abs(total - expected_total) < 0.000001, "create_order response total is incorrect")
        expect(order["status"] == "created", "create_order response status must start as 'created'")
        expect(isinstance(order["created_at"], str) and order["created_at"], "create_order response field 'created_at' must be a non-empty string")
        order_id = order["id"]

    def test_create_order_without_items() -> None:
        expect(user_id is not None, "create_user must succeed before create_order_without_items")
        payload = request_json(
            session,
            "POST",
            join_url(base_url, "/orders"),
            expected_statuses={400, 422},
            json_body={"user_id": user_id, "items": []},
        )
        expect(payload is not None, "create_order_without_items must return a JSON body")

    def test_create_order_with_invalid_quantity() -> None:
        expect(user_id is not None, "create_user must succeed before create_order_with_invalid_quantity")
        expect(product_id is not None, "create_product must succeed before create_order_with_invalid_quantity")
        payload = request_json(
            session,
            "POST",
            join_url(base_url, "/orders"),
            expected_statuses={400, 422},
            json_body={
                "user_id": user_id,
                "items": [{"product_id": product_id, "quantity": 0}],
            },
        )
        expect(payload is not None, "create_order_with_invalid_quantity must return a JSON body")

    def test_order_total_and_get_by_id() -> None:
        expect(order_id is not None, "create_order must succeed before order_total_and_get_by_id")
        payload = request_json(
            session,
            "GET",
            join_url(base_url, f"/orders/{order_id}"),
            expected_statuses={200},
        )
        order = require_object(payload, "order_total_and_get_by_id response")
        require_keys(order, ["id", "user", "items", "total", "status", "created_at"], "order_total_and_get_by_id response")
        expect(order["id"] == order_id, "order_total_and_get_by_id returned unexpected order id")
        total = require_positive_number(order["total"], "order_total_and_get_by_id field 'total'")
        expect(abs(total - expected_total) < 0.000001, "order_total_and_get_by_id returned incorrect total")

    def test_update_order_status() -> None:
        expect(order_id is not None, "create_order must succeed before update_order_status")
        payload = request_json(
            session,
            "PATCH",
            join_url(base_url, f"/orders/{order_id}/status"),
            expected_statuses={200},
            json_body={"status": "paid"},
        )
        order = require_object(payload, "update_order_status response")
        require_keys(order, ["id", "status"], "update_order_status response")
        expect(order["id"] == order_id, "update_order_status returned unexpected order id")
        expect(order["status"] == "paid", "update_order_status did not persist the new status")

    def test_list_orders_with_relationships() -> None:
        payload = request_json(
            session,
            "GET",
            join_url(base_url, "/orders"),
            expected_statuses={200},
        )
        orders = require_list(payload, "list_orders_with_relationships response")
        matching_order = next(
            (
                item
                for item in orders
                if isinstance(item, dict) and item.get("id") == order_id
            ),
            None,
        )
        expect(matching_order is not None, "list_orders_with_relationships did not include created order")
        order = require_object(matching_order, "list_orders_with_relationships matched order")
        require_keys(order, ["id", "user", "items", "total", "status", "created_at"], "list_orders_with_relationships matched order")
        user = require_object(order["user"], "list_orders_with_relationships matched order field 'user'")
        require_keys(user, ["id", "name"], "list_orders_with_relationships matched order field 'user'")
        items = require_list(order["items"], "list_orders_with_relationships matched order field 'items'")
        expect(len(items) >= 1, "list_orders_with_relationships matched order field 'items' must not be empty")
        expect(order["status"] == "paid", "list_orders_with_relationships returned unexpected updated status")

    tests = [
        ("create_user", test_create_user),
        ("list_users", test_list_users),
        ("get_user_by_id", test_get_user_by_id),
        ("create_product", test_create_product),
        ("create_order", test_create_order),
        ("create_order_without_items", test_create_order_without_items),
        ("create_order_with_invalid_quantity", test_create_order_with_invalid_quantity),
        ("order_total_and_get_by_id", test_order_total_and_get_by_id),
        ("update_order_status", test_update_order_status),
        ("list_orders_with_relationships", test_list_orders_with_relationships),
    ]

    for test_name, fn in tests:
        execute(test_name, fn)

    result = "PASS" if not failures else "FAIL"
    report = {
        "result": result,
        "tests_run": tests_run,
        "tests_passed": tests_passed,
        "tests_failed": len(failures),
        "failures": failures,
    }
    return report


def write_report(report: dict[str, Any]) -> None:
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with REPORT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def main() -> int:
    args = parse_args()
    report = run_validation(args.base_url)

    print()
    print(f"VALIDATION RESULT: {report['result']}")
    print()
    print("----- VALIDATION REPORT -----")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    print("-----------------------------")

    try:
        write_report(report)
    except OSError as exc:
        print(f"warning: failed to write {REPORT_PATH.relative_to(ROOT_DIR).as_posix()}: {exc}", file=sys.stderr)

    return 0 if report["result"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
