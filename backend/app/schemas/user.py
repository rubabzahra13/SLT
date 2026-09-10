from pydantic import BaseModel, EmailStr
from typing import Optional

class UserSchema(BaseModel):
    id: str
    name: str
    email: str
    access_level: str  # "Full Access" | "View Only"
    is_active: bool

    class Config:
        from_attributes = True

class LoginRequestSchema(BaseModel):
    email: str
    password: str

class TokenResponseSchema(BaseModel):
    token: str
    user: UserSchema
