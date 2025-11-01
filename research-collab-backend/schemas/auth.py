# schemas/auth.py
from pydantic import BaseModel, EmailStr
from typing import Optional

class SignupIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    domain: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    domain: Optional[str] = None

class TokenOut(BaseModel):
    user: UserOut
    accessToken: str

class GoogleAuthRequest(BaseModel):
    credential: str  # Google OAuth token
