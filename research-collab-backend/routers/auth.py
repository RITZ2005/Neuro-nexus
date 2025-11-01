# routers/auth.py
from fastapi import APIRouter, HTTPException, Depends, Header
from schemas.auth import SignupIn, LoginIn, TokenOut, UserOut, GoogleAuthRequest
from db.mongo import db
from core.security import hash_password, verify_password, create_access_token, decode_token
from utils.helpers import fix_id
from bson import ObjectId
from google.oauth2 import id_token
from google.auth.transport import requests
import os

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

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

@router.post("/google", response_model=TokenOut)
async def google_auth(payload: GoogleAuthRequest):
    """
    Authenticate user with Google OAuth token
    Verifies the token and creates/updates user account
    """
    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            payload.credential, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Extract user information from Google
        email = idinfo.get('email')
        name = idinfo.get('name')
        google_id = idinfo.get('sub')
        picture = idinfo.get('picture')
        email_verified = idinfo.get('email_verified', False)
        
        if not email_verified:
            raise HTTPException(status_code=400, detail="Email not verified by Google")
        
        # Check if user exists
        user = await db.users.find_one({"email": email})
        
        if user:
            # Update existing user with Google info if not already set
            update_data = {}
            if not user.get('google_id'):
                update_data['google_id'] = google_id
            if not user.get('avatar') and picture:
                update_data['avatar'] = picture
            
            if update_data:
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": update_data}
                )
            
            user_out = {
                "id": str(user["_id"]), 
                "name": user["name"], 
                "email": user["email"], 
                "domain": user.get("domain", "General")
            }
        else:
            # Create new user from Google data
            user_doc = {
                "name": name,
                "email": email,
                "google_id": google_id,
                "avatar": picture,
                "domain": "General",  # Default domain, can be updated later
                "password_hash": None,  # No password for Google auth users
                "email_verified": True,
                "auth_provider": "google",
                "createdAt": None
            }
            res = await db.users.insert_one(user_doc)
            user_out = {
                "id": str(res.inserted_id), 
                "name": name, 
                "email": email, 
                "domain": "General"
            }
        
        # Create JWT token
        token = create_access_token(user_out["id"])
        
        return {"user": user_out, "accessToken": token}
        
    except ValueError as e:
        # Invalid token
        print(f"Google token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        print(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")
