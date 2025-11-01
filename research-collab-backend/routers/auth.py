# routers/auth.py
from fastapi import APIRouter, HTTPException, Depends, Header
from schemas.auth import SignupIn, LoginIn, TokenOut, UserOut
from db.mongo import db
from core.security import hash_password, verify_password, create_access_token, decode_token
from utils.helpers import fix_id
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=TokenOut)
async def signup(payload: SignupIn):
    # check existing
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "domain": payload.domain,
        "password_hash": hash_password(payload.password),
        "createdAt": None
    }
    res = await db.users.insert_one(user_doc)
    user_out = {"id": str(res.inserted_id), "name": payload.name, "email": payload.email, "domain": payload.domain}
    token = create_access_token(user_out["id"])
    return {"user": user_out, "accessToken": token}

@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn):
    user = await db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user.get("password_hash","")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_out = {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "domain": user.get("domain")}
    token = create_access_token(user_out["id"])
    return {"user": user_out, "accessToken": token}

# Helper dependency to get current user
async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"id": str(user["_id"]), "name": user["name"], "email": user["email"], "domain": user.get("domain")}

@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"], "domain": current_user.get("domain")}
