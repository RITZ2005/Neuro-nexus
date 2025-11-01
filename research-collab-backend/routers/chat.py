from fastapi import APIRouter, Depends, HTTPException, Query
from schemas.chat import ChatMessage, ChatHistoryResponse
from db.mongo import db
from routers.auth import get_current_user
from bson import ObjectId
from typing import Optional
import logging

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


@router.get("/project/{project_id}/messages", response_model=ChatHistoryResponse)
async def get_chat_history(
    project_id: str,
    limit: int = Query(50, ge=1, le=100),
    before: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get chat message history for a project.
    Messages are returned in reverse chronological order (newest first).
    
    Args:
        project_id: ID of the project
        limit: Maximum number of messages to return (1-100)
        before: Message ID to get messages before (for pagination)
        current_user: Authenticated user
    """
    try:
        # Verify user has access to project
        project = await db.projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Check if user is project member
        is_member = await db.project_members.find_one({
            "project_id": project_id,
            "user_id": current_user["id"]
        })
        
        if not is_member and str(project["created_by"]) != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this chat")
        
        # Build query
        query = {
            "project_id": project_id,
            "deleted": {"$ne": True}
        }
        
        # Add pagination if before parameter provided
        if before:
            try:
                before_message = await db.chat_messages.find_one({"_id": ObjectId(before)})
                if before_message:
                    query["timestamp"] = {"$lt": before_message["timestamp"]}
            except Exception:
                pass
        
        # Fetch messages
        cursor = db.chat_messages.find(query).sort("timestamp", -1).limit(limit + 1)
        messages = await cursor.to_list(limit + 1)
        
        # Check if there are more messages
        has_more = len(messages) > limit
        if has_more:
            messages = messages[:limit]
        
        # Format messages
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "id": str(msg["_id"]),
                "project_id": msg["project_id"],
                "user_id": msg["user_id"],
                "user_name": msg["user_name"],
                "content": msg["content"],
                "timestamp": msg["timestamp"]
            })
        
        return {
            "messages": formatted_messages,
            "count": len(formatted_messages),
            "has_more": has_more
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch chat history")


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Soft delete a chat message (marks as deleted, doesn't remove from database).
    Only the message author can delete their own messages.
    """
    try:
        message = await db.chat_messages.find_one({"_id": ObjectId(message_id)})
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Check if user is the message author
        if message["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Can only delete your own messages")
        
        # Soft delete
        await db.chat_messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"deleted": True}}
        )
        
        return {"message": "Message deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting message: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete message")


@router.get("/project/{project_id}/stats")
async def get_chat_stats(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get chat statistics for a project (total messages, active users, etc.).
    """
    try:
        # Verify user has access
        project = await db.projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        is_member = await db.project_members.find_one({
            "project_id": project_id,
            "user_id": current_user["id"]
        })
        
        if not is_member and str(project["created_by"]) != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get statistics
        total_messages = await db.chat_messages.count_documents({
            "project_id": project_id,
            "deleted": {"$ne": True}
        })
        
        # Get unique participants
        participants = await db.chat_messages.distinct("user_id", {
            "project_id": project_id,
            "deleted": {"$ne": True}
        })
        
        return {
            "total_messages": total_messages,
            "unique_participants": len(participants),
            "project_id": project_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching chat stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch chat statistics")
