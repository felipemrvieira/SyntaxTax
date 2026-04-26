from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models.order import Order
from models.order_item import OrderItem
from models.product import Product
from models.user import User
from schemas.order import OrderCreate, OrderRead, OrderStatus, OrderStatusUpdate


router = APIRouter(prefix="/orders", tags=["orders"])
DbSession = Annotated[Session, Depends(get_db)]
VALID_ORDER_STATUSES: tuple[OrderStatus, ...] = ("created", "paid", "shipped", "cancelled")
ALLOWED_STATUS_TRANSITIONS: dict[str, set[str]] = {
    "created": {"paid", "cancelled"},
    "paid": {"shipped", "cancelled"},
    "shipped": set(),
    "cancelled": set(),
}


def serialize_order(order: Order) -> dict:
    return {
        "id": order.id,
        "user": {
            "id": order.user.id,
            "name": order.user.name,
        },
        "items": [
            {
                "product_id": item.product_id,
                "product_name": item.product.name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
            }
            for item in order.items
        ],
        "item_count": len(order.items),
        "total": order.total,
        "status": order.status,
        "created_at": order.created_at,
    }


def load_order(db: Session, order_id: int) -> Order | None:
    statement = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.user),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
    )
    return db.scalars(statement).first()


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: DbSession) -> dict:
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    order = Order(user_id=user.id, status="created", total=0.0)
    db.add(order)
    db.flush()

    total = 0.0
    for item_payload in payload.items:
        product = db.get(Product, item_payload.product_id)
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        unit_price = product.price
        total += unit_price * item_payload.quantity
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=item_payload.quantity,
                unit_price=unit_price,
            )
        )

    order.total = total
    db.commit()

    created_order = load_order(db, order.id)
    if created_order is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Order not created")
    return serialize_order(created_order)


@router.get("", response_model=list[OrderRead])
def list_orders(
    db: DbSession,
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    user_id: int | None = Query(default=None, gt=0),
) -> list[dict]:
    statement = select(Order)

    if status_filter is not None:
        statement = statement.where(Order.status == status_filter)
    if user_id is not None:
        statement = statement.where(Order.user_id == user_id)

    statement = statement.order_by(Order.id).options(
        selectinload(Order.user),
        selectinload(Order.items).selectinload(OrderItem.product),
    )
    return [serialize_order(order) for order in db.scalars(statement)]


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: DbSession) -> dict:
    order = load_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return serialize_order(order)


@router.patch("/{order_id}/status", response_model=OrderRead)
def update_order_status(order_id: int, payload: OrderStatusUpdate, db: DbSession) -> dict:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    current_status = order.status
    next_status = payload.status
    if next_status not in ALLOWED_STATUS_TRANSITIONS.get(current_status, set()):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invalid order status transition")

    order.status = next_status
    db.commit()

    updated_order = load_order(db, order_id)
    if updated_order is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Order not updated")
    return serialize_order(updated_order)
