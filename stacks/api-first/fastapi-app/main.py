from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import Base, engine
from models import order, order_item, product, user  # noqa: F401
from routers.orders import router as orders_router
from routers.products import router as products_router
from routers.users import router as users_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(users_router)
app.include_router(products_router)
app.include_router(orders_router)
