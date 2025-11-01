# schemas/project.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Project Models
class ProjectBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    type: str = Field(..., pattern="^(individual|group)$")  # individual or group
    tags: Optional[List[str]] = []
    visibility: str = Field(default="private", pattern="^(private|team)$")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    visibility: Optional[str] = Field(None, pattern="^(private|team)$")

class ProjectMemberInfo(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    role: str  # admin, editor, viewer
    joined_at: datetime

class ProjectResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    type: str
    created_by: str
    created_by_name: str
    status: str
    created_at: datetime
    updated_at: datetime
    tags: List[str]
    visibility: str
    member_count: int
    members: Optional[List[ProjectMemberInfo]] = []
    user_role: Optional[str] = None  # Current user's role in this project

class ProjectListItem(BaseModel):
    id: str
    title: str
    description: Optional[str]
    type: str
    created_by_name: str
    status: str
    updated_at: datetime
    member_count: int
    user_role: str
    tags: List[str]

# Project Member Models
class ProjectMember(BaseModel):
    project_id: str
    user_id: str
    user_name: str
    user_email: str
    role: str
    joined_at: datetime
    invited_by: str
    status: str  # active, removed

# Invitation Models
class InviteMember(BaseModel):
    project_id: str
    invitee_email: str
    role: str = Field(..., pattern="^(editor|viewer)$")  # Cannot invite as admin
    message: Optional[str] = "Join my project!"

class ProjectInvitationResponse(BaseModel):
    id: str
    project_id: str
    project_title: str
    inviter_id: str
    inviter_name: str
    invitee_id: str
    invitee_name: str
    invitee_email: str
    role: str
    message: str
    status: str  # pending, accepted, rejected
    created_at: datetime

class AcceptInvitation(BaseModel):
    invitation_id: str

class RejectInvitation(BaseModel):
    invitation_id: str

class RemoveMember(BaseModel):
    project_id: str
    user_id: str

# Response Models
class InvitationsResponse(BaseModel):
    invitations: List[ProjectInvitationResponse]
    count: int
