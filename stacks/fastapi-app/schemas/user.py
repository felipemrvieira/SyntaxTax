from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    name: str
    email: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class OrderUserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
