# schemas/post.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class CommentCreate(BaseModel):
    """Create a comment on a post"""
    content: str = Field(..., min_length=1, max_length=1000)

class Comment(BaseModel):
    """Comment model"""
    id: str
    post_id: str
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    author_domain: Optional[str] = None
    content: str
    created_at: datetime

class Like(BaseModel):
    """Like model"""
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    created_at: datetime

class PostCreate(BaseModel):
    """Create a new post"""
    content: str = Field(..., min_length=1, max_length=5000)
    post_type: str = Field(default="text")  # "text", "image", "document", "link"
    media_url: Optional[str] = None  # For images/documents
    document_id: Optional[str] = None  # Link to a document in the system
    link_url: Optional[str] = None  # External link
    link_title: Optional[str] = None
    link_description: Optional[str] = None
    tags: Optional[List[str]] = []

class PostUpdate(BaseModel):
    """Update an existing post"""
    content: Optional[str] = Field(None, min_length=1, max_length=5000)
    tags: Optional[List[str]] = None

class Post(BaseModel):
    """Post model for feed"""
    id: str
    author_id: str
    author_name: str
    author_avatar: Optional[str] = None
    author_domain: Optional[str] = None
    author_institution: Optional[str] = None
    
    content: str
    post_type: str = "text"  # "text", "image", "document", "link"
    media_url: Optional[str] = None
    document_id: Optional[str] = None
    link_url: Optional[str] = None
    link_title: Optional[str] = None
    link_description: Optional[str] = None
    tags: Optional[List[str]] = []
    
    likes_count: int = 0
    comments_count: int = 0
    liked_by_user: bool = False  # Whether current user liked this post
    
    comments: Optional[List[Comment]] = []  # Latest comments
    likes: Optional[List[Like]] = []  # Latest likes (for preview)
    
    created_at: datetime
    updated_at: Optional[datetime] = None

class PostResponse(BaseModel):
    """Response after post action"""
    success: bool
    message: str
    post_id: Optional[str] = None
    post: Optional[Post] = None

class LikeResponse(BaseModel):
    """Response after like/unlike action"""
    success: bool
    message: str
    likes_count: int
    liked: bool
