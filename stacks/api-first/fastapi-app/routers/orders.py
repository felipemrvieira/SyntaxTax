from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models.order import Order
from models.order_item import OrderItem
from models.product import Product
from models.user import User
from schemas.order import OrderCreate, OrderRead, OrderStatusUpdate


router = APIRouter(prefix="/orders", tags=["orders"])
DbSession = Annotated[Session, Depends(get_db)]


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
def create_order(payload: OrderCreate, db: DbSession) -> Order:
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
    return created_order


@router.get("", response_model=list[OrderRead])
def list_orders(db: DbSession) -> list[Order]:
    statement = select(Order).order_by(Order.id).options(
        selectinload(Order.user),
        selectinload(Order.items).selectinload(OrderItem.product),
    )
    return list(db.scalars(statement))


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: DbSession) -> Order:
    order = load_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


@router.patch("/{order_id}/status", response_model=OrderRead)
def update_order_status(order_id: int, payload: OrderStatusUpdate, db: DbSession) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order.status = payload.status
    db.commit()

    updated_order = load_order(db, order_id)
    if updated_order is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Order not updated")
    return updated_order
