# routers/feed.py
from fastapi import APIRouter, HTTPException, Depends
from db.mongo import db
from schemas.feed import UserFeedProfile, ConnectionRequest, ConnectionResponse, FeedFilters
from routers.auth import get_current_user
from bson import ObjectId
from typing import List, Tuple
from datetime import datetime

router = APIRouter(prefix="/feed", tags=["feed"])

def calculate_match_score(current_user: dict, other_user: dict) -> Tuple[int, List[str]]:
    """
    Calculate how well another user matches the current user
    Returns: (score, mutual_interests)
    """
    score = 0
    mutual_interests = []
    
    # Domain match (highest weight - 50 points)
    try:
        if current_user.get("domain") and other_user.get("domain"):
            current_domain = str(current_user["domain"]).lower() if current_user["domain"] else ""
            other_domain = str(other_user["domain"]).lower() if other_user["domain"] else ""
            if current_domain and other_domain and current_domain == other_domain:
                score += 50
    except Exception as e:
        print(f"Error comparing domains: {e}")
    
    # Research interests overlap (10 points per shared interest)
    try:
        current_interests_raw = current_user.get("research_interests", [])
        other_interests_raw = other_user.get("research_interests", [])
        
        # Ensure we only process strings
        current_interests = set([
            str(i).lower() for i in current_interests_raw 
            if i and isinstance(i, (str, int, float))
        ])
        other_interests = set([
            str(i).lower() for i in other_interests_raw 
            if i and isinstance(i, (str, int, float))
        ])
        
        mutual = current_interests.intersection(other_interests)
        if mutual:
            mutual_interests = list(mutual)
            score += len(mutual) * 10
    except Exception as e:
        print(f"Error comparing research interests: {e}")
    
    # Skills overlap (5 points per shared skill)
    try:
        current_skills_raw = current_user.get("skills", [])
        other_skills_raw = other_user.get("skills", [])
        
        # Extract skill names (handle both string and object formats)
        current_skills = set()
        for skill in current_skills_raw:
            if isinstance(skill, dict) and "name" in skill:
                current_skills.add(str(skill["name"]).lower())
            elif isinstance(skill, (str, int, float)):
                current_skills.add(str(skill).lower())
        
        other_skills = set()
        for skill in other_skills_raw:
            if isinstance(skill, dict) and "name" in skill:
                other_skills.add(str(skill["name"]).lower())
            elif isinstance(skill, (str, int, float)):
                other_skills.add(str(skill).lower())
        
        skill_overlap = current_skills.intersection(other_skills)
        if skill_overlap:
            score += len(skill_overlap) * 5
    except Exception as e:
        print(f"Error comparing skills: {e}")
    
    # Location match (10 points)
    try:
        if current_user.get("location") and other_user.get("location"):
            current_location = str(current_user["location"]).lower() if current_user["location"] else ""
            other_location = str(other_user["location"]).lower() if other_user["location"] else ""
            if current_location and other_location and current_location == other_location:
                score += 10
    except Exception as e:
        print(f"Error comparing locations: {e}")
    
    return score, mutual_interests

@router.get("/personalized", response_model=List[UserFeedProfile])
async def get_personalized_feed(current_user: dict = Depends(get_current_user)):
    """
    Get personalized feed of users with similar domain and research interests
    Excludes the current user and ranks by match score
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        
        # Get current user's full profile
        current_user_doc = await db.users.find_one({"_id": current_user_id})
        
        if not current_user_doc:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Get current user's connections
        connections = current_user_doc.get("connections", [])
        connected_ids = [conn.get("user_id") for conn in connections if conn.get("status") == "connected"]
        
        # Build query to find similar users
        query = {
            "_id": {"$ne": current_user_id}  # Exclude current user
        }
        
        # Build OR conditions for flexible matching
        or_conditions = []
        
        # If user has a domain, prioritize same domain
        if current_user_doc.get("domain"):
            or_conditions.append({"domain": current_user_doc["domain"]})
        
        # If user has research interests, also include users with matching interests
        if current_user_doc.get("research_interests") and len(current_user_doc["research_interests"]) > 0:
            or_conditions.append({
                "research_interests": {
                    "$in": current_user_doc["research_interests"]
                }
            })
        
        # If user has skills, include users with matching skills
        # Skills can be stored as either strings or objects with 'name' field
        if current_user_doc.get("skills") and len(current_user_doc["skills"]) > 0:
            # Extract skill names if skills are objects
            skill_names = []
            for skill in current_user_doc["skills"]:
                if isinstance(skill, dict) and "name" in skill:
                    skill_names.append(skill["name"])
                elif isinstance(skill, str):
                    skill_names.append(skill)
            
            if skill_names:
                or_conditions.append({
                    "$or": [
                        {"skills": {"$in": skill_names}},  # Match if skills are strings
                        {"skills": {"$elemMatch": {"name": {"$in": skill_names}}}}  # Match if skills are objects
                    ]
                })
        
        # If we have any conditions, use them; otherwise get all users
        if or_conditions:
            query["$or"] = or_conditions
        
        # Fetch potential matches
        users = await db.users.find(query).limit(100).to_list(100)
        
        # If no matches found with specific criteria, fetch ALL other users
        # This ensures the feed always shows something (important for new users or unique domains)
        if len(users) == 0:
            print(f"No matches found for user {current_user_doc.get('name')}, fetching all users")
            fallback_query = {"_id": {"$ne": current_user_id}}
            users = await db.users.find(fallback_query).limit(100).to_list(100)
        
        # Calculate match scores and prepare feed profiles
        feed_profiles = []
        for user in users:
            try:
                score, mutual_interests = calculate_match_score(current_user_doc, user)
                
                # Include all users (even with score 0) to show complete network
                # Score 0 means no specific match criteria, but still a potential connection
                
                # Count publications and projects
                publications_count = await db.publications.count_documents({
                    "owner_id": user["_id"],
                    "status": "published"
                })
                
                projects_count = len(user.get("projects", []))
                
                # Check if connected
                is_connected = str(user["_id"]) in [str(uid) for uid in connected_ids]
                
                # Convert skills from dict format to string list if needed
                skills_list = []
                for skill in user.get("skills", []):
                    if isinstance(skill, dict) and "name" in skill:
                        skills_list.append(skill["name"])
                    elif isinstance(skill, str):
                        skills_list.append(skill)
                
                profile = UserFeedProfile(
                    id=str(user["_id"]),
                    name=user.get("name", "Unknown"),
                    email=user.get("email", ""),
                    domain=user.get("domain"),
                    about=user.get("about"),
                    location=user.get("location"),
                    research_interests=user.get("research_interests", []),
                    skills=skills_list,
                    website=user.get("website"),
                    github=user.get("github"),
                    linkedin=user.get("linkedin"),
                    twitter=user.get("twitter"),
                    orcid=user.get("orcid"),
                    is_connected=is_connected,
                    mutual_interests=mutual_interests,
                    connection_score=score,
                    publications_count=publications_count,
                    projects_count=projects_count
                )
                feed_profiles.append(profile)
            except Exception as user_error:
                # Skip this user if there's an error processing their profile
                print(f"Error processing user {user.get('_id')}: {user_error}")
                continue
        
        # Sort by match score (highest first)
        feed_profiles.sort(key=lambda x: x.connection_score, reverse=True)
        
        # Return top 50 matches
        return feed_profiles[:50]
        
    except Exception as e:
        print(f"Error fetching personalized feed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch feed: {str(e)}")

@router.post("/connect", response_model=ConnectionResponse)
async def connect_with_user(
    request: ConnectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Send connection request to another user (like LinkedIn)
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        target_user_id = ObjectId(request.target_user_id)
        
        # Check if target user exists
        target_user = await db.users.find_one({"_id": target_user_id})
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        
        # Get current user's full profile
        current_user_doc = await db.users.find_one({"_id": current_user_id})
        connections = current_user_doc.get("connections", [])
        
        # Check if already connected
        existing = [c for c in connections if str(c.get("user_id")) == str(target_user_id)]
        if existing:
            return ConnectionResponse(
                success=False,
                message="Already connected with this user",
                connection_status=existing[0].get("status", "connected")
            )
        
        # Check if request already sent
        existing_notification = await db.notifications.find_one({
            "type": "connection_request",
            "sender_id": current_user_id,
            "receiver_id": target_user_id
        })
        
        if existing_notification:
            return ConnectionResponse(
                success=False,
                message="Connection request already sent",
                connection_status="pending"
            )
        
        # Create notification for target user
        await db.notifications.insert_one({
            "type": "connection_request",
            "sender_id": current_user_id,
            "sender_name": current_user_doc.get("name"),
            "sender_domain": current_user_doc.get("domain"),
            "sender_avatar": current_user_doc.get("avatar"),
            "receiver_id": target_user_id,
            "title": "New Connection Request",
            "message": f"{current_user_doc.get('name')} wants to connect with you" + (f": {request.message}" if request.message else ""),
            "read": False,
            "created_at": datetime.utcnow()
        })
        
        return ConnectionResponse(
            success=True,
            message="Connection request sent successfully",
            connection_status="pending"
        )
        
    except Exception as e:
        print(f"Error sending connection request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send connection request: {str(e)}")

@router.delete("/disconnect/{user_id}")
async def disconnect_from_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove connection with another user
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        target_user_id = ObjectId(user_id)
        
        # Remove connection from current user
        await db.users.update_one(
            {"_id": current_user_id},
            {"$pull": {"connections": {"user_id": target_user_id}}}
        )
        
        # Remove reverse connection from target user
        await db.users.update_one(
            {"_id": target_user_id},
            {"$pull": {"connections": {"user_id": current_user_id}}}
        )
        
        return ConnectionResponse(
            success=True,
            message="Successfully disconnected",
            connection_status="disconnected"
        )
        
    except Exception as e:
        print(f"Error disconnecting from user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect: {str(e)}")

@router.get("/connections", response_model=List[UserFeedProfile])
async def get_my_connections(current_user: dict = Depends(get_current_user)):
    """
    Get list of all connected users
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        current_user_doc = await db.users.find_one({"_id": current_user_id})
        
        connections = current_user_doc.get("connections", [])
        connected_user_ids = [
            ObjectId(conn["user_id"]) 
            for conn in connections 
            if conn.get("status") == "connected"
        ]
        
        if not connected_user_ids:
            return []
        
        # Fetch connected users
        users = await db.users.find({"_id": {"$in": connected_user_ids}}).to_list(100)
        
        feed_profiles = []
        for user in users:
            try:
                publications_count = await db.publications.count_documents({
                    "owner_id": user["_id"],
                    "status": "published"
                })
                
                # Convert skills from dict format to string list if needed
                skills_list = []
                for skill in user.get("skills", []):
                    if isinstance(skill, dict) and "name" in skill:
                        skills_list.append(skill["name"])
                    elif isinstance(skill, str):
                        skills_list.append(skill)
                
                profile = UserFeedProfile(
                    id=str(user["_id"]),
                    name=user.get("name", "Unknown"),
                    email=user.get("email", ""),
                    domain=user.get("domain"),
                    about=user.get("about"),
                    location=user.get("location"),
                    research_interests=user.get("research_interests", []),
                    skills=skills_list,
                    website=user.get("website"),
                    github=user.get("github"),
                    linkedin=user.get("linkedin"),
                    twitter=user.get("twitter"),
                    orcid=user.get("orcid"),
                    is_connected=True,
                    mutual_interests=[],
                    connection_score=100,
                    publications_count=publications_count,
                    projects_count=len(user.get("projects", []))
                )
                feed_profiles.append(profile)
            except Exception as user_error:
                # Skip this user if there's an error processing their profile
                print(f"Error processing connected user {user.get('_id')}: {user_error}")
                continue
        
        return feed_profiles
        
    except Exception as e:
        print(f"Error fetching connections: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch connections: {str(e)}")

@router.get("/suggestions", response_model=List[UserFeedProfile])
async def get_connection_suggestions(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """
    Get top connection suggestions based on match score
    """
    try:
        # Reuse personalized feed logic but return only top N
        feed = await get_personalized_feed(current_user)
        
        # Filter out already connected users
        suggestions = [user for user in feed if not user.is_connected]
        
        return suggestions[:limit]
        
    except Exception as e:
        print(f"Error fetching suggestions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch suggestions: {str(e)}")

@router.get("/search", response_model=List[UserFeedProfile])
async def search_researchers(
    q: str,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Search for researchers by name, email, domain, research interests, or skills
    """
    try:
        if not q or len(q.strip()) < 2:
            return []
        
        search_term = q.strip()
        current_user_id = ObjectId(current_user["id"])  # Fixed: use "id" not "_id"
        
        # Get current user's full profile for match calculation
        current_user_doc = await db.users.find_one({"_id": current_user_id})
        if not current_user_doc:
            return []
        
        # Build search query with regex for flexible matching
        search_query = {
            "_id": {"$ne": current_user_id},
            "$or": [
                {"name": {"$regex": search_term, "$options": "i"}},
                {"email": {"$regex": search_term, "$options": "i"}},
                {"domain": {"$regex": search_term, "$options": "i"}},
                {"research_interests": {"$regex": search_term, "$options": "i"}},
                {"skills": {"$regex": search_term, "$options": "i"}},
                {"institution": {"$regex": search_term, "$options": "i"}},
                {"bio": {"$regex": search_term, "$options": "i"}}
            ]
        }
        
        # Fetch matching users
        users_cursor = db.users.find(search_query).limit(limit)
        users = await users_cursor.to_list(length=limit)
        
        # Get current user's connections
        current_connections = current_user_doc.get("connections", [])
        connection_ids = [str(conn.get("user_id")) for conn in current_connections]
        
        # Build feed profiles
        feed_profiles = []
        for user in users:
            try:
                user_id = str(user["_id"])
                
                # Calculate match score and mutual interests
                score, mutual = calculate_match_score(current_user_doc, user)
                
                # Count publications
                publications_count = await db.publications.count_documents({"author_id": user_id})
                
                profile = UserFeedProfile(
                    id=user_id,
                    name=user.get("name", ""),
                    email=user.get("email", ""),
                    avatar=user.get("avatar"),
                    domain=user.get("domain"),
                    institution=user.get("institution"),
                    bio=user.get("bio"),
                    research_interests=user.get("research_interests", []),
                    skills=user.get("skills", []),
                    location=user.get("location"),
                    website=user.get("website"),
                    github=user.get("github"),
                    linkedin=user.get("linkedin"),
                    twitter=user.get("twitter"),
                    orcid=user.get("orcid"),
                    is_connected=user_id in connection_ids,
                    mutual_interests=mutual,
                    connection_score=score,
                    publications_count=publications_count,
                    projects_count=len(user.get("projects", []))
                )
                feed_profiles.append(profile)
            except Exception as user_error:
                print(f"Error processing user {user.get('_id')}: {user_error}")
                continue
        
        # Sort by match score
        feed_profiles.sort(key=lambda x: x.connection_score, reverse=True)
        
        return feed_profiles
        
    except Exception as e:
        print(f"Error searching researchers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search researchers: {str(e)}")
