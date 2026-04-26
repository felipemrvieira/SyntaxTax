from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI

from routers.orders import router as orders_router
from routers.products import router as products_router
from routers.users import router as users_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    alembic_config = Config(str(Path(__file__).with_name("alembic.ini")))
    command.upgrade(alembic_config, "head")
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(users_router)
app.include_router(products_router)
app.include_router(orders_router)
