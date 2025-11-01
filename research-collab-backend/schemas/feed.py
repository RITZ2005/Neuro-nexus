# schemas/feed.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserFeedProfile(BaseModel):
    """User profile information for feed display"""
    id: str
    name: str
    email: str
    domain: Optional[str] = None
    about: Optional[str] = None
    location: Optional[str] = None
    research_interests: Optional[List[str]] = []
    skills: Optional[List[str]] = []
    
    # Social links
    website: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    orcid: Optional[str] = None
    
    # Connection info
    is_connected: bool = False
    mutual_interests: Optional[List[str]] = []
    connection_score: Optional[int] = 0  # How well they match
    
    # Stats
    publications_count: Optional[int] = 0
    projects_count: Optional[int] = 0

class ConnectionRequest(BaseModel):
    """Request to connect with another user"""
    target_user_id: str
    message: Optional[str] = None

class ConnectionResponse(BaseModel):
    """Response after connection action"""
    success: bool
    message: str
    connection_status: str  # "pending", "connected", "disconnected"

class FeedFilters(BaseModel):
    """Filters for personalized feed"""
    domain: Optional[str] = None
    research_interests: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    location: Optional[str] = None
    min_score: Optional[int] = 0  # Minimum match score
    limit: Optional[int] = 20
    offset: Optional[int] = 0
