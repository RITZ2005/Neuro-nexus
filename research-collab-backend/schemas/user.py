# schemas/user.py
from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    domain: Optional[str] = None

class UserDB(UserCreate):
    password_hash: str
