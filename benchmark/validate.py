#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Any
from uuid import uuid4

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
    params: dict[str, Any] | None = None,
) -> Any:
    try:
        response = session.request(method, url, json=json_body, params=params, timeout=10)
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


def require_int(value: Any, context: str) -> int:
    expect(isinstance(value, int) and not isinstance(value, bool), f"{context} must be an integer")
    return int(value)


def require_non_empty_string(value: Any, context: str) -> str:
    expect(isinstance(value, str) and value.strip(), f"{context} must be a non-empty string")
    return value


def find_by_id(items: list[Any], item_id: int, context: str) -> dict[str, Any]:
    for item in items:
        if isinstance(item, dict) and item.get("id") == item_id:
            return item
    raise ValidationFailure(f"{context} did not include item with id={item_id}")


def require_created(mapping: dict[str, Any], key: str, context: str) -> dict[str, Any]:
    expect(key in mapping, context)
    return mapping[key]


def assert_order_payload(
    payload: Any,
    context: str,
    *,
    expected_user_id: int | None = None,
    expected_status: str | None = None,
    expected_total: float | None = None,
    expected_item_count: int | None = None,
    expected_product_ids: list[int] | None = None,
) -> dict[str, Any]:
    order = require_object(payload, context)
    require_keys(order, ["id", "user", "items", "item_count", "total", "status", "created_at"], context)

    require_int(order["id"], f"{context} field 'id'")
    require_int(order["item_count"], f"{context} field 'item_count'")
    require_positive_number(order["total"], f"{context} field 'total'")
    require_non_empty_string(order["status"], f"{context} field 'status'")
    require_non_empty_string(order["created_at"], f"{context} field 'created_at'")

    user = require_object(order["user"], f"{context} field 'user'")
    require_keys(user, ["id", "name"], f"{context} field 'user'")
    require_int(user["id"], f"{context} field 'user.id'")
    require_non_empty_string(user["name"], f"{context} field 'user.name'")

    items = require_list(order["items"], f"{context} field 'items'")
    expect(items, f"{context} field 'items' must not be empty")
    expect(order["item_count"] == len(items), f"{context} field 'item_count' must match the number of items")

    returned_product_ids: list[int] = []
    for index, item in enumerate(items):
        item_context = f"{context} item #{index + 1}"
        order_item = require_object(item, item_context)
        require_keys(order_item, ["product_id", "product_name", "quantity", "unit_price"], item_context)
        returned_product_ids.append(require_int(order_item["product_id"], f"{item_context} field 'product_id'"))
        require_non_empty_string(order_item["product_name"], f"{item_context} field 'product_name'")
        require_positive_number(order_item["quantity"], f"{item_context} field 'quantity'")
        require_positive_number(order_item["unit_price"], f"{item_context} field 'unit_price'")

    if expected_user_id is not None:
        expect(user["id"] == expected_user_id, f"{context} embedded user id is incorrect")
    if expected_status is not None:
        expect(order["status"] == expected_status, f"{context} returned unexpected status")
    if expected_total is not None:
        expect(
            abs(float(order["total"]) - expected_total) < 0.000001,
            f"{context} returned incorrect total",
        )
    if expected_item_count is not None:
        expect(order["item_count"] == expected_item_count, f"{context} returned unexpected item_count")
    if expected_product_ids is not None:
        expect(returned_product_ids == expected_product_ids, f"{context} returned unexpected product_ids")

    return order


def run_validation(base_url: str) -> dict[str, Any]:
    session = requests.Session()
    unique = uuid4().hex[:8]

    users: dict[str, dict[str, Any]] = {}
    products: dict[str, dict[str, Any]] = {}
    orders: dict[str, dict[str, Any]] = {}

    failures: list[dict[str, str]] = []
    tests_run = 0
    tests_passed = 0

    def execute(test_name: str, fn: Any) -> None:
        nonlocal tests_run, tests_passed

        tests_run += 1
        try:
            fn()
        except ValidationFailure as exc:
            failures.append({"test": test_name, "message": str(exc)})
            print(f"[FAIL] {test_name}")
            return

        tests_passed += 1
        print(f"[PASS] {test_name}")

    def test_create_users() -> None:
        payload_1 = request_json(
            session,
            "POST",
            join_url(base_url, "/users"),
            expected_statuses={200, 201},
            json_body={"name": "Felipe", "email": f"felipe-{unique}@example.com"},
        )
        user_1 = require_object(payload_1, "create_users first response")
        require_keys(user_1, ["id", "name", "email"], "create_users first response")
        require_int(user_1["id"], "create_users first response field 'id'")
        expect(user_1["name"] == "Felipe", "create_users first response returned unexpected name")
        users["primary"] = user_1

        payload_2 = request_json(
            session,
            "POST",
            join_url(base_url, "/users"),
            expected_statuses={200, 201},
            json_body={"name": "Ana", "email": f"ana-{unique}@example.com"},
        )
        user_2 = require_object(payload_2, "create_users second response")
        require_keys(user_2, ["id", "name", "email"], "create_users second response")
        require_int(user_2["id"], "create_users second response field 'id'")
        expect(user_2["name"] == "Ana", "create_users second response returned unexpected name")
        users["secondary"] = user_2

    def test_list_users() -> None:
        primary = require_created(users, "primary", "create_users must succeed before list_users")
        secondary = require_created(users, "secondary", "create_users must succeed before list_users")
        payload = request_json(session, "GET", join_url(base_url, "/users"), expected_statuses={200})
        returned_users = require_list(payload, "list_users response")
        primary_id = primary["id"]
        secondary_id = secondary["id"]
        expect(any(isinstance(item, dict) and item.get("id") == primary_id for item in returned_users), "list_users did not include primary user")
        expect(any(isinstance(item, dict) and item.get("id") == secondary_id for item in returned_users), "list_users did not include secondary user")

    def test_get_user_by_id() -> None:
        user_id = require_created(users, "primary", "create_users must succeed before get_user_by_id")["id"]
        payload = request_json(
            session,
            "GET",
            join_url(base_url, f"/users/{user_id}"),
            expected_statuses={200},
        )
        user = require_object(payload, "get_user_by_id response")
        require_keys(user, ["id", "name", "email"], "get_user_by_id response")
        expect(user["id"] == user_id, "get_user_by_id returned unexpected id")

    def test_user_not_found() -> None:
        payload = request_json(
            session,
            "GET",
            join_url(base_url, "/users/999999"),
            expected_statuses={404},
        )
        expect(payload is not None, "user_not_found must return a JSON body")

    def test_reject_duplicate_user_email() -> None:
        primary = require_created(users, "primary", "create_users must succeed before reject_duplicate_user_email")
        payload = request_json(
            session,
            "POST",
            join_url(base_url, "/users"),
            expected_statuses={409},
            json_body={"name": "Felipe Clone", "email": primary["email"]},
        )
        expect(payload is not None, "reject_duplicate_user_email must return a JSON body")

    def test_reject_user_with_missing_required_fields() -> None:
        payload_1 = request_json(
            session,
            "POST",
            join_url(base_url, "/users"),
            expected_statuses={400, 422},
            json_body={"email": f"missing-name-{unique}@example.com"},
        )
        expect(payload_1 is not None, "reject_user_with_missing_required_fields missing name must return a JSON body")

        payload_2 = request_json(
            session,
            "POST",
            join_url(base_url, "/users"),
            expected_statuses={400, 422},
            json_body={"name": "Missing Email"},
        )
        expect(payload_2 is not None, "reject_user_with_missing_required_fields missing email must return a JSON body")

    def test_create_products() -> None:
        definitions = [
          ("mouse", {"name": f"Mouse {unique}", "price": 50.0}),
          ("keyboard", {"name": f"Keyboard {unique}", "price": 120.0}),
          ("notebook", {"name": f"Notebook {unique}", "price": 3500.0}),
        ]

        for key, body in definitions:
            payload = request_json(
                session,
                "POST",
                join_url(base_url, "/products"),
                expected_statuses={200, 201},
                json_body=body,
            )
            product = require_object(payload, f"create_products response for {key}")
            require_keys(product, ["id", "name", "price"], f"create_products response for {key}")
            require_int(product["id"], f"create_products response for {key} field 'id'")
            returned_price = require_positive_number(product["price"], f"create_products response for {key} field 'price'")
            expect(abs(returned_price - body["price"]) < 0.000001, f"create_products response for {key} returned unexpected price")
            products[key] = product

        list_payload = request_json(session, "GET", join_url(base_url, "/products"), expected_statuses={200})
        returned_products = require_list(list_payload, "list_products response")
        for key in ("mouse", "keyboard", "notebook"):
            find_by_id(returned_products, products[key]["id"], f"list_products response")

        get_payload = request_json(
            session,
            "GET",
            join_url(base_url, f"/products/{products['notebook']['id']}"),
            expected_statuses={200},
        )
        product = require_object(get_payload, "get_product_by_id response")
        require_keys(product, ["id", "name", "price"], "get_product_by_id response")
        expect(product["id"] == products["notebook"]["id"], "get_product_by_id returned unexpected id")

    def test_product_not_found() -> None:
        payload = request_json(
            session,
            "GET",
            join_url(base_url, "/products/999999"),
            expected_statuses={404},
        )
        expect(payload is not None, "product_not_found must return a JSON body")

    def test_reject_product_with_invalid_price() -> None:
        payload = request_json(
            session,
            "POST",
            join_url(base_url, "/products"),
            expected_statuses={422},
            json_body={"name": f"Broken Price {unique}", "price": 0},
        )
        expect(payload is not None, "reject_product_with_invalid_price must return a JSON body")

    def test_reject_product_with_missing_required_fields() -> None:
        payload_1 = request_json(
            session,
            "POST",
            join_url(base_url, "/products"),
            expected_statuses={400, 422},
            json_body={"price": 100.0},
        )
        expect(payload_1 is not None, "reject_product_with_missing_required_fields missing name must return a JSON body")

        payload_2 = request_json(
            session,
            "POST",
            join_url(base_url, "/products"),
            expected_statuses={400, 422},
            json_body={"name": f"Missing Price {unique}"},
        )
        expect(payload_2 is not None, "reject_product_with_missing_required_fields missing price must return a JSON body")

    def test_filter_products_by_min_price() -> None:
        notebook = require_created(products, "notebook", "create_products must succeed before filter_products_by_min_price")
        keyboard = require_created(products, "keyboard", "create_products must succeed before filter_products_by_min_price")
        mouse = require_created(products, "mouse", "create_products must succeed before filter_products_by_min_price")
        payload = request_json(
            session,
            "GET",
            join_url(base_url, "/products"),
            expected_statuses={200},
            params={"min_price": 100},
        )
        returned_products = require_list(payload, "filter_products_by_min_price response")
        expect(returned_products, "filter_products_by_min_price returned an empty list")
        returned_ids: set[int] = set()
        for item in returned_products:
            product = require_object(item, "filter_products_by_min_price item")
            require_keys(product, ["id", "name", "price"], "filter_products_by_min_price item")
            returned_ids.add(require_int(product["id"], "filter_products_by_min_price item field 'id'"))
            expect(require_positive_number(product["price"], "filter_products_by_min_price item field 'price'") >= 100, "filter_products_by_min_price returned a product below the lower bound")
        expect(mouse["id"] not in returned_ids, "filter_products_by_min_price included the cheap product")
        expect(keyboard["id"] in returned_ids, "filter_products_by_min_price did not include the middle product")
        expect(notebook["id"] in returned_ids, "filter_products_by_min_price did not include the expensive product")

    def test_filter_products_by_max_price() -> None:
        notebook = require_created(products, "notebook", "create_products must succeed before filter_products_by_max_price")
        keyboard = require_created(products, "keyboard", "create_products must succeed before filter_products_by_max_price")
        mouse = require_created(products, "mouse", "create_products must succeed before filter_products_by_max_price")
        payload = request_json(
            session,
            "GET",
            join_url(base_url, "/products"),
            expected_statuses={200},
            params={"max_price": 200},
        )
        returned_products = require_list(payload, "filter_products_by_max_price response")
        expect(returned_products, "filter_products_by_max_price returned an empty list")
        returned_ids: set[int] = set()
        for item in returned_products:
            product = require_object(item, "filter_products_by_max_price item")
            require_keys(product, ["id", "name", "price"], "filter_products_by_max_price item")
            returned_ids.add(require_int(product["id"], "filter_products_by_max_price item field 'id'"))
            expect(require_positive_number(product["price"], "filter_products_by_max_price item field 'price'") <= 200, "filter_products_by_max_price returned a product above the upper bound")
        expect(notebook["id"] not in returned_ids, "filter_products_by_max_price included the expensive product")
        expect(mouse["id"] in returned_ids, "filter_products_by_max_price did not include the cheap product")
        expect(keyboard["id"] in returned_ids, "filter_products_by_max_price did not include the middle product")

    def test_filter_products_by_price_range() -> None:
        notebook = require_created(products, "notebook", "create_products must succeed before filter_products_by_price_range")
        keyboard = require_created(products, "keyboard", "create_products must succeed before filter_products_by_price_range")
        mouse = require_created(products, "mouse", "create_products must succeed before filter_products_by_price_range")
        payload = request_json(
            session,
            "GET",
            join_url(base_url, "/products"),
            expected_statuses={200},
            params={"min_price": 100, "max_price": 200},
        )
        returned_products = require_list(payload, "filter_products_by_price_range response")
        expect(returned_products, "filter_products_by_price_range returned an empty list")
        returned_ids: set[int] = set()
        for item in returned_products:
            product = require_object(item, "filter_products_by_price_range item")
            require_keys(product, ["id", "name", "price"], "filter_products_by_price_range item")
            price = require_positive_number(product["price"], "filter_products_by_price_range item field 'price'")
            expect(100 <= price <= 200, "filter_products_by_price_range returned an item outside the requested range")
            returned_ids.add(require_int(product["id"], "filter_products_by_price_range item field 'id'"))
        expect(keyboard["id"] in returned_ids, "filter_products_by_price_range did not include the middle product")
        expect(mouse["id"] not in returned_ids, "filter_products_by_price_range included the cheap product")
        expect(notebook["id"] not in returned_ids, "filter_products_by_price_range included the expensive product")

    def test_reject_invalid_product_filters() -> None:
        payload_1 = request_json(
            session,
            "GET",
            join_url(base_url, "/products"),
            expected_statuses={422},
            params={"min_price": "invalid"},
        )
        expect(payload_1 is not None, "reject_invalid_product_filters min_price must return a JSON body")

        payload_2 = request_json(
            session,
            "GET",
            join_url(base_url, "/products"),
            expected_statuses={422},
            params={"max_price": "invalid"},
        )
        expect(payload_2 is not None, "reject_invalid_product_filters max_price must return a JSON body")

    def test_create_orders() -> None:
        primary_user = require_created(users, "primary", "create_users must succeed before create_orders")
        secondary_user = require_created(users, "secondary", "create_users must succeed before create_orders")
        mouse = require_created(products, "mouse", "create_products must succeed before create_orders")
        keyboard = require_created(products, "keyboard", "create_products must succeed before create_orders")
        notebook = require_created(products, "notebook", "create_products must succeed before create_orders")
        order_definitions = [
            (
                "shippable",
                {
                    "user_id": primary_user["id"],
                    "items": [
                        {"product_id": mouse["id"], "quantity": 2},
                        {"product_id": keyboard["id"], "quantity": 1},
                    ],
                },
                220.0,
                2,
                [mouse["id"], keyboard["id"]],
            ),
            (
                "cancellable",
                {
                    "user_id": primary_user["id"],
                    "items": [{"product_id": notebook["id"], "quantity": 1}],
                },
                3500.0,
                1,
                [notebook["id"]],
            ),
            (
                "created_secondary",
                {
                    "user_id": secondary_user["id"],
                    "items": [{"product_id": keyboard["id"], "quantity": 3}],
                },
                360.0,
                1,
                [keyboard["id"]],
            ),
        ]

        for key, body, total, item_count, product_ids in order_definitions:
            payload = request_json(
                session,
                "POST",
                join_url(base_url, "/orders"),
                expected_statuses={200, 201},
                json_body=body,
            )
            order = assert_order_payload(
                payload,
                f"create_orders response for {key}",
                expected_user_id=body["user_id"],
                expected_status="created",
                expected_total=total,
                expected_item_count=item_count,
                expected_product_ids=product_ids,
            )
            orders[key] = order

    def test_create_order_without_items() -> None:
        primary_user = require_created(users, "primary", "create_users must succeed before create_order_without_items")
        payload = request_json(
            session,
            "POST",
            join_url(base_url, "/orders"),
            expected_statuses={400, 422},
            json_body={"user_id": primary_user["id"], "items": []},
        )
        expect(payload is not None, "create_order_without_items must return a JSON body")

    def test_create_order_with_invalid_quantity() -> None:
        primary_user = require_created(users, "primary", "create_users must succeed before create_order_with_invalid_quantity")
        mouse = require_created(products, "mouse", "create_products must succeed before create_order_with_invalid_quantity")
        payload = request_json(
            session,
            "POST",
            join_url(base_url, "/orders"),
            expected_statuses={400, 422},
            json_body={
                "user_id": primary_user["id"],
                "items": [{"product_id": mouse["id"], "quantity": 0}],
            },
        )
        expect(payload is not None, "create_order_with_invalid_quantity must return a JSON body")

    def test_order_total_and_get_by_id() -> None:
        shippable = require_created(orders, "shippable", "create_orders must succeed before order_total_and_get_by_id")
        primary_user = require_created(users, "primary", "create_users must succeed before order_total_and_get_by_id")
        mouse = require_created(products, "mouse", "create_products must succeed before order_total_and_get_by_id")
        keyboard = require_created(products, "keyboard", "create_products must succeed before order_total_and_get_by_id")
        payload = request_json(
            session,
            "GET",
            join_url(base_url, f"/orders/{shippable['id']}"),
            expected_statuses={200},
        )
        order = assert_order_payload(
            payload,
            "order_total_and_get_by_id response",
            expected_user_id=primary_user["id"],
            expected_status="created",
            expected_total=220.0,
            expected_item_count=2,
            expected_product_ids=[mouse["id"], keyboard["id"]],
        )
        expect(order["id"] == shippable["id"], "order_total_and_get_by_id returned unexpected order id")

    def test_order_not_found() -> None:
        payload = request_json(
            session,
            "GET",
            join_url(base_url, "/orders/999999"),
            expected_statuses={404},
        )
        expect(payload is not None, "order_not_found must return a JSON body")

    def test_reject_order_with_missing_required_fields() -> None:
        primary_user = require_created(users, "primary", "create_users must succeed before reject_order_with_missing_required_fields")
        mouse = require_created(products, "mouse", "create_products must succeed before reject_order_with_missing_required_fields")

        payload_1 = request_json(
            session,
            "POST",
            join_url(base_url, "/orders"),
            expected_statuses={400, 422},
            json_body={"items": [{"product_id": mouse["id"], "quantity": 1}]},
        )
        expect(payload_1 is not None, "reject_order_with_missing_required_fields missing user_id must return a JSON body")

        payload_2 = request_json(
            session,
            "POST",
            join_url(base_url, "/orders"),
            expected_statuses={400, 422},
            json_body={"user_id": primary_user["id"]},
        )
        expect(payload_2 is not None, "reject_order_with_missing_required_fields missing items must return a JSON body")

        payload_3 = request_json(
            session,
            "POST",
            join_url(base_url, "/orders"),
            expected_statuses={400, 422},
            json_body={
                "user_id": primary_user["id"],
                "items": [{"quantity": 1}],
            },
        )
        expect(payload_3 is not None, "reject_order_with_missing_required_fields missing product_id must return a JSON body")

        payload_4 = request_json(
            session,
            "POST",
            join_url(base_url, "/orders"),
            expected_statuses={400, 422},
            json_body={
                "user_id": primary_user["id"],
                "items": [{"product_id": mouse["id"]}],
            },
        )
        expect(payload_4 is not None, "reject_order_with_missing_required_fields missing quantity must return a JSON body")

    def test_update_order_status_to_paid() -> None:
        shippable = require_created(orders, "shippable", "create_orders must succeed before update_order_status_to_paid")
        payload = request_json(
            session,
            "PATCH",
            join_url(base_url, f"/orders/{shippable['id']}/status"),
            expected_statuses={200},
            json_body={"status": "paid"},
        )
        order = assert_order_payload(
            payload,
            "update_order_status_to_paid response",
            expected_status="paid",
            expected_total=220.0,
            expected_item_count=2,
        )
        orders["shippable"] = order

    def test_update_order_status_to_shipped() -> None:
        shippable = require_created(orders, "shippable", "update_order_status_to_paid must succeed before update_order_status_to_shipped")
        payload = request_json(
            session,
            "PATCH",
            join_url(base_url, f"/orders/{shippable['id']}/status"),
            expected_statuses={200},
            json_body={"status": "shipped"},
        )
        order = assert_order_payload(
            payload,
            "update_order_status_to_shipped response",
            expected_status="shipped",
            expected_total=220.0,
            expected_item_count=2,
        )
        orders["shippable"] = order

    def test_cancel_second_order() -> None:
        cancellable = require_created(orders, "cancellable", "create_orders must succeed before cancel_second_order")
        payload = request_json(
            session,
            "PATCH",
            join_url(base_url, f"/orders/{cancellable['id']}/status"),
            expected_statuses={200},
            json_body={"status": "cancelled"},
        )
        order = assert_order_payload(
            payload,
            "cancel_second_order response",
            expected_status="cancelled",
            expected_total=3500.0,
            expected_item_count=1,
        )
        orders["cancellable"] = order

    def test_reject_invalid_order_status_value() -> None:
        created_secondary = require_created(orders, "created_secondary", "create_orders must succeed before reject_invalid_order_status_value")
        payload = request_json(
            session,
            "PATCH",
            join_url(base_url, f"/orders/{created_secondary['id']}/status"),
            expected_statuses={422},
            json_body={"status": "refunded"},
        )
        expect(payload is not None, "reject_invalid_order_status_value must return a JSON body")

    def test_reject_order_status_update_with_missing_status() -> None:
        created_secondary = require_created(orders, "created_secondary", "create_orders must succeed before reject_order_status_update_with_missing_status")
        payload = request_json(
            session,
            "PATCH",
            join_url(base_url, f"/orders/{created_secondary['id']}/status"),
            expected_statuses={400, 422},
            json_body={},
        )
        expect(payload is not None, "reject_order_status_update_with_missing_status must return a JSON body")

    def test_reject_invalid_order_status_transition() -> None:
        shippable = require_created(orders, "shippable", "update_order_status_to_shipped must succeed before reject_invalid_order_status_transition")
        payload = request_json(
            session,
            "PATCH",
            join_url(base_url, f"/orders/{shippable['id']}/status"),
            expected_statuses={409},
            json_body={"status": "created"},
        )
        expect(payload is not None, "reject_invalid_order_status_transition must return a JSON body")

    def test_order_status_update_not_found() -> None:
        payload = request_json(
            session,
            "PATCH",
            join_url(base_url, "/orders/999999/status"),
            expected_statuses={404},
            json_body={"status": "paid"},
        )
        expect(payload is not None, "order_status_update_not_found must return a JSON body")

    def test_filter_orders_by_status() -> None:
        created_secondary = require_created(orders, "created_secondary", "create_orders must succeed before filter_orders_by_status")
        shippable = require_created(orders, "shippable", "create_orders must succeed before filter_orders_by_status")
        cancellable = require_created(orders, "cancellable", "create_orders must succeed before filter_orders_by_status")
        payload = request_json(
            session,
            "GET",
            join_url(base_url, "/orders"),
            expected_statuses={200},
            params={"status": "created"},
        )
        returned_orders = require_list(payload, "filter_orders_by_status response")
        expect(returned_orders, "filter_orders_by_status returned an empty list")
        returned_ids: set[int] = set()
        for item in returned_orders:
            order = assert_order_payload(item, "filter_orders_by_status item", expected_status="created")
            returned_ids.add(order["id"])
        expect(created_secondary["id"] in returned_ids, "filter_orders_by_status did not include the created order")
        expect(shippable["id"] not in returned_ids, "filter_orders_by_status included the shipped order")
        expect(cancellable["id"] not in returned_ids, "filter_orders_by_status included the cancelled order")

    def test_filter_orders_by_user_id() -> None:
        primary_user = require_created(users, "primary", "create_users must succeed before filter_orders_by_user_id")
        shippable = require_created(orders, "shippable", "create_orders must succeed before filter_orders_by_user_id")
        cancellable = require_created(orders, "cancellable", "create_orders must succeed before filter_orders_by_user_id")
        created_secondary = require_created(orders, "created_secondary", "create_orders must succeed before filter_orders_by_user_id")
        user_id = primary_user["id"]
        payload = request_json(
            session,
            "GET",
            join_url(base_url, "/orders"),
            expected_statuses={200},
            params={"user_id": user_id},
        )
        returned_orders = require_list(payload, "filter_orders_by_user_id response")
        expect(returned_orders, "filter_orders_by_user_id returned an empty list")
        returned_ids: set[int] = set()
        for item in returned_orders:
            order = assert_order_payload(item, "filter_orders_by_user_id item", expected_user_id=user_id)
            returned_ids.add(order["id"])
        expect(shippable["id"] in returned_ids, "filter_orders_by_user_id did not include the first primary-user order")
        expect(cancellable["id"] in returned_ids, "filter_orders_by_user_id did not include the second primary-user order")
        expect(created_secondary["id"] not in returned_ids, "filter_orders_by_user_id included the secondary-user order")

    def test_filter_orders_by_status_and_user_id() -> None:
        primary_user = require_created(users, "primary", "create_users must succeed before filter_orders_by_status_and_user_id")
        cancellable = require_created(orders, "cancellable", "create_orders must succeed before filter_orders_by_status_and_user_id")
        shippable = require_created(orders, "shippable", "create_orders must succeed before filter_orders_by_status_and_user_id")
        created_secondary = require_created(orders, "created_secondary", "create_orders must succeed before filter_orders_by_status_and_user_id")
        payload = request_json(
            session,
            "GET",
            join_url(base_url, "/orders"),
            expected_statuses={200},
            params={"status": "cancelled", "user_id": primary_user["id"]},
        )
        returned_orders = require_list(payload, "filter_orders_by_status_and_user_id response")
        expect(returned_orders, "filter_orders_by_status_and_user_id returned an empty list")
        returned_ids: set[int] = set()
        for item in returned_orders:
            order = assert_order_payload(
                item,
                "filter_orders_by_status_and_user_id item",
                expected_user_id=primary_user["id"],
                expected_status="cancelled",
            )
            returned_ids.add(order["id"])
        expect(cancellable["id"] in returned_ids, "filter_orders_by_status_and_user_id did not include the cancelled primary-user order")
        expect(shippable["id"] not in returned_ids, "filter_orders_by_status_and_user_id included the shipped order")
        expect(created_secondary["id"] not in returned_ids, "filter_orders_by_status_and_user_id included the secondary-user order")

    def test_reject_invalid_order_filters() -> None:
        payload_1 = request_json(
            session,
            "GET",
            join_url(base_url, "/orders"),
            expected_statuses={422},
            params={"status": "invalid"},
        )
        expect(payload_1 is not None, "reject_invalid_order_filters status must return a JSON body")

        payload_2 = request_json(
            session,
            "GET",
            join_url(base_url, "/orders"),
            expected_statuses={422},
            params={"user_id": "invalid"},
        )
        expect(payload_2 is not None, "reject_invalid_order_filters user_id must return a JSON body")

    def test_list_orders_with_relationships() -> None:
        shippable = require_created(orders, "shippable", "create_orders must succeed before list_orders_with_relationships")
        cancellable = require_created(orders, "cancellable", "create_orders must succeed before list_orders_with_relationships")
        created_secondary = require_created(orders, "created_secondary", "create_orders must succeed before list_orders_with_relationships")
        primary_user = require_created(users, "primary", "create_users must succeed before list_orders_with_relationships")
        secondary_user = require_created(users, "secondary", "create_users must succeed before list_orders_with_relationships")
        payload = request_json(
            session,
            "GET",
            join_url(base_url, "/orders"),
            expected_statuses={200},
        )
        returned_orders = require_list(payload, "list_orders_with_relationships response")

        shippable = assert_order_payload(
            find_by_id(returned_orders, shippable["id"], "list_orders_with_relationships response"),
            "list_orders_with_relationships shipped order",
            expected_user_id=primary_user["id"],
            expected_status="shipped",
            expected_total=220.0,
            expected_item_count=2,
        )
        cancelled = assert_order_payload(
            find_by_id(returned_orders, cancellable["id"], "list_orders_with_relationships response"),
            "list_orders_with_relationships cancelled order",
            expected_user_id=primary_user["id"],
            expected_status="cancelled",
            expected_total=3500.0,
            expected_item_count=1,
        )
        created = assert_order_payload(
            find_by_id(returned_orders, created_secondary["id"], "list_orders_with_relationships response"),
            "list_orders_with_relationships created order",
            expected_user_id=secondary_user["id"],
            expected_status="created",
            expected_total=360.0,
            expected_item_count=1,
        )
        expect(shippable["id"] != cancelled["id"] != created["id"], "list_orders_with_relationships returned duplicated order identities")

    tests = [
        ("create_users", test_create_users),
        ("list_users", test_list_users),
        ("get_user_by_id", test_get_user_by_id),
        ("user_not_found", test_user_not_found),
        ("reject_duplicate_user_email", test_reject_duplicate_user_email),
        ("reject_user_with_missing_required_fields", test_reject_user_with_missing_required_fields),
        ("create_products", test_create_products),
        ("product_not_found", test_product_not_found),
        ("reject_product_with_invalid_price", test_reject_product_with_invalid_price),
        ("reject_product_with_missing_required_fields", test_reject_product_with_missing_required_fields),
        ("filter_products_by_min_price", test_filter_products_by_min_price),
        ("filter_products_by_max_price", test_filter_products_by_max_price),
        ("filter_products_by_price_range", test_filter_products_by_price_range),
        ("reject_invalid_product_filters", test_reject_invalid_product_filters),
        ("create_orders", test_create_orders),
        ("create_order_without_items", test_create_order_without_items),
        ("create_order_with_invalid_quantity", test_create_order_with_invalid_quantity),
        ("order_total_and_get_by_id", test_order_total_and_get_by_id),
        ("order_not_found", test_order_not_found),
        ("reject_order_with_missing_required_fields", test_reject_order_with_missing_required_fields),
        ("update_order_status_to_paid", test_update_order_status_to_paid),
        ("update_order_status_to_shipped", test_update_order_status_to_shipped),
        ("cancel_second_order", test_cancel_second_order),
        ("reject_invalid_order_status_value", test_reject_invalid_order_status_value),
        ("reject_order_status_update_with_missing_status", test_reject_order_status_update_with_missing_status),
        ("reject_invalid_order_status_transition", test_reject_invalid_order_status_transition),
        ("order_status_update_not_found", test_order_status_update_not_found),
        ("filter_orders_by_status", test_filter_orders_by_status),
        ("filter_orders_by_user_id", test_filter_orders_by_user_id),
        ("filter_orders_by_status_and_user_id", test_filter_orders_by_status_and_user_id),
        ("reject_invalid_order_filters", test_reject_invalid_order_filters),
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
