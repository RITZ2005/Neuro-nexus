# schemas/notification.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationBase(BaseModel):
    """Base notification model"""
    type: str  # "connection_request", "connection_accepted", "connection_rejected"
    title: str
    message: str
    read: bool = False

class ConnectionRequestNotification(NotificationBase):
    """Notification for connection request"""
    id: str
    type: str = "connection_request"
    sender_id: str
    sender_name: str
    sender_domain: Optional[str] = None
    sender_avatar: Optional[str] = None
    created_at: datetime
    read: bool = False

class NotificationResponse(BaseModel):
    """Response with notifications"""
    notifications: list
    unread_count: int

class AcceptConnectionRequest(BaseModel):
    """Accept a connection request"""
    notification_id: str

class RejectConnectionRequest(BaseModel):
    """Reject a connection request"""
    notification_id: str
