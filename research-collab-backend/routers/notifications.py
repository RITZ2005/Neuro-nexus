# routers/notifications.py
from fastapi import APIRouter, HTTPException, Depends
from db.mongo import db
from schemas.notification import (
    ConnectionRequestNotification,
    NotificationResponse,
    AcceptConnectionRequest,
    RejectConnectionRequest
)
from routers.auth import get_current_user
from bson import ObjectId
from datetime import datetime
from typing import List

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=NotificationResponse)
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """
    Get all notifications for current user
    """
    try:
        user_id = ObjectId(current_user["id"])
        
        # Get all notifications for this user
        notifications = await db.notifications.find({
            "receiver_id": user_id
        }).sort("created_at", -1).to_list(100)
        
        # Format notifications
        notification_list = []
        for notif in notifications:
            notification_list.append({
                "id": str(notif["_id"]),
                "type": notif.get("type"),
                "title": notif.get("title"),
                "message": notif.get("message"),
                "sender_id": str(notif.get("sender_id")),
                "sender_name": notif.get("sender_name"),
                "sender_domain": notif.get("sender_domain"),
                "sender_avatar": notif.get("sender_avatar"),
                "created_at": notif.get("created_at"),
                "read": notif.get("read", False)
            })
        
        # Count unread
        unread_count = len([n for n in notification_list if not n["read"]])
        
        return NotificationResponse(
            notifications=notification_list,
            unread_count=unread_count
        )
        
    except Exception as e:
        print(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch notifications: {str(e)}")

@router.post("/mark-read/{notification_id}")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a notification as read
    """
    try:
        user_id = ObjectId(current_user["id"])
        notif_id = ObjectId(notification_id)
        
        # Update notification
        result = await db.notifications.update_one(
            {"_id": notif_id, "receiver_id": user_id},
            {"$set": {"read": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"success": True, "message": "Notification marked as read"}
        
    except Exception as e:
        print(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/accept-connection")
async def accept_connection_request(
    request: AcceptConnectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Accept a connection request
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        notification_id = ObjectId(request.notification_id)
        
        # Get the notification
        notification = await db.notifications.find_one({
            "_id": notification_id,
            "receiver_id": current_user_id,
            "type": "connection_request"
        })
        
        if not notification:
            raise HTTPException(status_code=404, detail="Connection request not found")
        
        sender_id = notification["sender_id"]
        
        # Get both users
        current_user_doc = await db.users.find_one({"_id": current_user_id})
        sender_user = await db.users.find_one({"_id": sender_id})
        
        if not sender_user:
            raise HTTPException(status_code=404, detail="Sender user not found")
        
        # Add connection for current user
        current_connections = current_user_doc.get("connections", [])
        if not any(str(c.get("user_id")) == str(sender_id) for c in current_connections):
            await db.users.update_one(
                {"_id": current_user_id},
                {"$push": {
                    "connections": {
                        "user_id": sender_id,
                        "user_name": sender_user.get("name"),
                        "status": "connected",
                        "connected_at": datetime.utcnow()
                    }
                }}
            )
        
        # Add connection for sender (bidirectional)
        sender_connections = sender_user.get("connections", [])
        if not any(str(c.get("user_id")) == str(current_user_id) for c in sender_connections):
            await db.users.update_one(
                {"_id": sender_id},
                {"$push": {
                    "connections": {
                        "user_id": current_user_id,
                        "user_name": current_user_doc.get("name"),
                        "status": "connected",
                        "connected_at": datetime.utcnow()
                    }
                }}
            )
        
        # Delete the connection request notification
        await db.notifications.delete_one({"_id": notification_id})
        
        # Create acceptance notification for sender
        await db.notifications.insert_one({
            "type": "connection_accepted",
            "receiver_id": sender_id,
            "sender_id": current_user_id,
            "sender_name": current_user_doc.get("name"),
            "sender_domain": current_user_doc.get("domain"),
            "sender_avatar": current_user_doc.get("avatar"),
            "title": "Connection Accepted",
            "message": f"{current_user_doc.get('name')} accepted your connection request",
            "read": False,
            "created_at": datetime.utcnow()
        })
        
        return {
            "success": True,
            "message": "Connection request accepted",
            "connection_status": "connected"
        }
        
    except Exception as e:
        print(f"Error accepting connection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to accept connection: {str(e)}")

@router.post("/reject-connection")
async def reject_connection_request(
    request: RejectConnectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Reject a connection request
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        notification_id = ObjectId(request.notification_id)
        
        # Get the notification
        notification = await db.notifications.find_one({
            "_id": notification_id,
            "receiver_id": current_user_id,
            "type": "connection_request"
        })
        
        if not notification:
            raise HTTPException(status_code=404, detail="Connection request not found")
        
        # Delete the notification
        await db.notifications.delete_one({"_id": notification_id})
        
        return {
            "success": True,
            "message": "Connection request rejected"
        }
        
    except Exception as e:
        print(f"Error rejecting connection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reject connection: {str(e)}")

@router.delete("/clear-all")
async def clear_all_notifications(current_user: dict = Depends(get_current_user)):
    """
    Clear all read notifications
    """
    try:
        user_id = ObjectId(current_user["id"])
        
        result = await db.notifications.delete_many({
            "receiver_id": user_id,
            "read": True
        })
        
        return {
            "success": True,
            "message": f"Deleted {result.deleted_count} notifications"
        }
        
    except Exception as e:
        print(f"Error clearing notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))
