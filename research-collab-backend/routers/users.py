# routers/users.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from schemas.user_profile import ProfileUpdate
from schemas.auth import UserOut
from routers.auth import get_current_user
from core.security import verify_password, hash_password
from db.mongo import db
from bson import ObjectId
from typing import Dict, Any

router = APIRouter(prefix="/users", tags=["users"])

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class NotificationPreferences(BaseModel):
    collaboration_requests: bool = True
    project_updates: bool = True
    publication_alerts: bool = True
    weekly_digest: bool = False

def serialize_profile(user_doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document to serializable profile dict"""
    profile = {
        "id": str(user_doc["_id"]),
        "name": user_doc.get("name", ""),
        "email": user_doc.get("email", ""),
        "domain": user_doc.get("domain", ""),
        "bio": user_doc.get("bio", ""),
        "institution": user_doc.get("institution", ""),
        "profile_pic_url": user_doc.get("profile_pic_url", ""),
        "researchInterests": user_doc.get("researchInterests", []),
        "publications": user_doc.get("publications", []),
        "projects": user_doc.get("projects", []),
        "skills": user_doc.get("skills", []),
        "education": user_doc.get("education", []),
        "certifications": user_doc.get("certifications", []),
        "experience": user_doc.get("experience", []),
        "languages": user_doc.get("languages", []),
        "volunteer": user_doc.get("volunteer", []),
        "achievements": user_doc.get("achievements", []),
    }
    return profile

@router.get("/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get the current user's complete profile"""
    try:
        user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return serialize_profile(user)
    except Exception as e:
        print(f"Error fetching profile: {e}")
        raise HTTPException(status_code=500, detail="Error fetching profile")

@router.put("/me")
async def update_my_profile(
    profile_update: dict,  # Accept dict instead of ProfileUpdate for flexibility
    current_user: dict = Depends(get_current_user)
):
    """Update the current user's profile - supports partial updates"""
    try:
        # Prepare update data - only include fields that were provided
        update_data = {}
        
        # Work directly with the dict
        update_dict = profile_update
        
        # Simply copy all fields from the dict - they're already in the right format from frontend
        # Frontend sends data as plain dicts/arrays, not Pydantic models
        update_data = update_dict
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        # Update the user document
        result = await db.users.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": update_data}
        )
        
        if result.modified_count == 0 and result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Fetch and return updated profile
        updated_user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        return serialize_profile(updated_user)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")

@router.get("/{user_id}")
async def get_user_profile(user_id: str):
    """Get any user's public profile (for viewing other researchers)"""
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Return profile without sensitive info like password_hash
        return serialize_profile(user)
    except Exception as e:
        print(f"Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail="Error fetching user profile")

@router.post("/me/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """Change the current user's password"""
    try:
        # Get user from database
        user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not verify_password(password_data.current_password, user.get("password_hash", "")):
            raise HTTPException(status_code=403, detail="Current password is incorrect")
        
        # Hash new password
        new_password_hash = hash_password(password_data.new_password)
        
        # Update password
        await db.users.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": {"password_hash": new_password_hash}}
        )
        
        return {"success": True, "message": "Password updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error changing password: {e}")
        raise HTTPException(status_code=500, detail="Error changing password")

@router.get("/me/notification-preferences")
async def get_notification_preferences(current_user: dict = Depends(get_current_user)):
    """Get user's notification preferences"""
    try:
        user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Return preferences with defaults
        prefs = user.get("notification_preferences", {})
        return {
            "collaboration_requests": prefs.get("collaboration_requests", True),
            "project_updates": prefs.get("project_updates", True),
            "publication_alerts": prefs.get("publication_alerts", True),
            "weekly_digest": prefs.get("weekly_digest", False)
        }
    except Exception as e:
        print(f"Error fetching notification preferences: {e}")
        raise HTTPException(status_code=500, detail="Error fetching preferences")

@router.put("/me/notification-preferences")
async def update_notification_preferences(
    preferences: NotificationPreferences,
    current_user: dict = Depends(get_current_user)
):
    """Update user's notification preferences"""
    try:
        await db.users.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": {"notification_preferences": preferences.dict()}}
        )
        
        return {"success": True, "message": "Notification preferences updated"}
        
    except Exception as e:
        print(f"Error updating notification preferences: {e}")
        raise HTTPException(status_code=500, detail="Error updating preferences")

@router.get("/me/stats")
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """Get user's dashboard statistics"""
    try:
        user_id = ObjectId(current_user["id"])
        user = await db.users.find_one({"_id": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Count collaborators (connections)
        connections = user.get("connections", [])
        collaborators_count = len([c for c in connections if c.get("status") == "connected"])
        
        # Count publications
        publications_count = await db.publications.count_documents({
            "owner_id": user_id,
            "status": "published"
        })
        
        # Count projects
        projects_count = len(user.get("projects", []))
        
        # Count posts for activity
        posts_count = await db.posts.count_documents({
            "author_id": str(user_id)
        })
        
        # Calculate research impact (sum of post likes + publication access count)
        total_likes = await db.posts.aggregate([
            {"$match": {"author_id": str(user_id)}},
            {"$group": {"_id": None, "total": {"$sum": {"$size": "$likes"}}}}
        ]).to_list(1)
        
        likes_count = total_likes[0]["total"] if total_likes else 0
        
        total_pub_access = await db.publications.aggregate([
            {"$match": {"owner_id": user_id}},
            {"$group": {"_id": None, "total": {"$sum": "$access_count"}}}
        ]).to_list(1)
        
        pub_access = total_pub_access[0]["total"] if total_pub_access else 0
        
        research_impact = likes_count + (pub_access * 10)  # Weight publications more
        
        return {
            "collaborators": collaborators_count,
            "publications": publications_count,
            "projects": projects_count,
            "research_impact": research_impact,
            "posts_count": posts_count
        }
        
    except Exception as e:
        print(f"Error fetching user stats: {e}")
        raise HTTPException(status_code=500, detail="Error fetching statistics")
