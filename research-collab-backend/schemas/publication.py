# Backend Publication Schema
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PublicationCreate(BaseModel):
    title: str
    description: str
    domain: str
    keywords: List[str]
    # File will be sent separately as multipart

class PublicationResponse(BaseModel):
    id: str
    title: str
    description: str
    domain: str
    keywords: List[str]
    ipfs_hash: str
    encrypted_key: str  # Encrypted with user's password or master key
    owner_id: str
    owner_name: str
    created_at: str
    file_size: int
    file_type: str
    access_count: int
    status: str  # "published", "draft", "archived"

class PublicationAccessRequest(BaseModel):
    publication_id: str
    private_key: str

class PublicationSearchQuery(BaseModel):
    query: Optional[str] = None
    domain: Optional[str] = None
    keywords: Optional[List[str]] = None
