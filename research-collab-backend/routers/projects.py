# routers/projects.py
from fastapi import APIRouter, HTTPException, Depends
from schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListItem,
    InviteMember, ProjectInvitationResponse, AcceptInvitation, RejectInvitation,
    RemoveMember, InvitationsResponse, ProjectMemberInfo
)
from db.mongo import db
from bson import ObjectId
from datetime import datetime
from routers.auth import get_current_user
from typing import List

router = APIRouter(prefix="/projects", tags=["projects"])

# ==================== PROJECT CRUD ====================

@router.post("/create", response_model=ProjectResponse)
async def create_project(payload: ProjectCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new project (individual or group)
    """
    try:
        user_id = ObjectId(current_user["id"])
        user_name = current_user.get("name", "Unknown User")
        
        # Create project document
        project_doc = {
            "title": payload.title,
            "description": payload.description,
            "type": payload.type,
            "created_by": user_id,
            "created_by_name": user_name,
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "tags": payload.tags or [],
            "visibility": payload.visibility,
            "member_count": 1
        }
        
        result = await db.projects.insert_one(project_doc)
        project_id = result.inserted_id
        
        # Add creator as admin member
        member_doc = {
            "project_id": project_id,
            "user_id": user_id,
            "user_name": user_name,
            "user_email": current_user.get("email", ""),
            "role": "admin",
            "joined_at": datetime.utcnow(),
            "invited_by": user_id,
            "status": "active"
        }
        await db.project_members.insert_one(member_doc)
        
        # Return created project
        return ProjectResponse(
            id=str(project_id),
            title=project_doc["title"],
            description=project_doc["description"],
            type=project_doc["type"],
            created_by=str(user_id),
            created_by_name=user_name,
            status="active",
            created_at=project_doc["created_at"],
            updated_at=project_doc["updated_at"],
            tags=project_doc["tags"],
            visibility=project_doc["visibility"],
            member_count=1,
            members=[ProjectMemberInfo(
                user_id=str(user_id),
                user_name=user_name,
                user_email=current_user.get("email", ""),
                role="admin",
                joined_at=member_doc["joined_at"]
            )],
            user_role="admin"
        )
        
    except Exception as e:
        print(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

@router.get("/my-projects", response_model=List[ProjectListItem])
async def get_my_projects(
    type: str = None,  # Filter by individual or group
    current_user: dict = Depends(get_current_user)
):
    """
    Get all projects where user is a member
    """
    try:
        user_id = ObjectId(current_user["id"])
        
        # Find all memberships for this user
        memberships = await db.project_members.find({
            "user_id": user_id,
            "status": "active"
        }).to_list(100)
        
        if not memberships:
            return []
        
        # Get all project IDs
        project_ids = [m["project_id"] for m in memberships]
        
        # Build query
        query = {
            "_id": {"$in": project_ids},
            "status": "active"
        }
        if type:
            query["type"] = type
        
        # Get projects
        projects = await db.projects.find(query).sort("updated_at", -1).to_list(100)
        
        # Create membership map for quick lookup
        membership_map = {str(m["project_id"]): m["role"] for m in memberships}
        
        # Format response
        project_list = []
        for project in projects:
            project_id = str(project["_id"])
            project_list.append(ProjectListItem(
                id=project_id,
                title=project["title"],
                description=project.get("description"),
                type=project["type"],
                created_by_name=project["created_by_name"],
                status=project["status"],
                updated_at=project["updated_at"],
                member_count=project.get("member_count", 1),
                user_role=membership_map.get(project_id, "viewer"),
                tags=project.get("tags", [])
            ))
        
        return project_list
        
    except Exception as e:
        print(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch projects: {str(e)}")

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project_details(project_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get detailed project information including members
    """
    try:
        user_id = ObjectId(current_user["id"])
        proj_id = ObjectId(project_id)
        
        # Check if user is a member
        membership = await db.project_members.find_one({
            "project_id": proj_id,
            "user_id": user_id,
            "status": "active"
        })
        
        if not membership:
            raise HTTPException(status_code=403, detail="You are not a member of this project")
        
        # Get project
        project = await db.projects.find_one({"_id": proj_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get all members
        members_cursor = db.project_members.find({
            "project_id": proj_id,
            "status": "active"
        }).sort("joined_at", 1)
        members_list = await members_cursor.to_list(100)
        
        members = [
            ProjectMemberInfo(
                user_id=str(m["user_id"]),
                user_name=m["user_name"],
                user_email=m["user_email"],
                role=m["role"],
                joined_at=m["joined_at"]
            )
            for m in members_list
        ]
        
        return ProjectResponse(
            id=str(project["_id"]),
            title=project["title"],
            description=project.get("description"),
            type=project["type"],
            created_by=str(project["created_by"]),
            created_by_name=project["created_by_name"],
            status=project["status"],
            created_at=project["created_at"],
            updated_at=project["updated_at"],
            tags=project.get("tags", []),
            visibility=project.get("visibility", "private"),
            member_count=len(members),
            members=members,
            user_role=membership["role"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching project details: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch project: {str(e)}")

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    payload: ProjectUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update project details (admin only)
    """
    try:
        user_id = ObjectId(current_user["id"])
        proj_id = ObjectId(project_id)
        
        # Check if user is admin
        membership = await db.project_members.find_one({
            "project_id": proj_id,
            "user_id": user_id,
            "role": "admin",
            "status": "active"
        })
        
        if not membership:
            raise HTTPException(status_code=403, detail="Only admins can update projects")
        
        # Build update document
        update_doc = {"updated_at": datetime.utcnow()}
        if payload.title is not None:
            update_doc["title"] = payload.title
        if payload.description is not None:
            update_doc["description"] = payload.description
        if payload.tags is not None:
            update_doc["tags"] = payload.tags
        if payload.visibility is not None:
            update_doc["visibility"] = payload.visibility
        
        # Update project
        result = await db.projects.update_one(
            {"_id": proj_id},
            {"$set": update_doc}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Return updated project
        return await get_project_details(project_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update project: {str(e)}")

@router.delete("/{project_id}")
async def archive_project(project_id: str, current_user: dict = Depends(get_current_user)):
    """
    Archive a project (admin only, soft delete)
    """
    try:
        user_id = ObjectId(current_user["id"])
        proj_id = ObjectId(project_id)
        
        # Check if user is admin
        membership = await db.project_members.find_one({
            "project_id": proj_id,
            "user_id": user_id,
            "role": "admin",
            "status": "active"
        })
        
        if not membership:
            raise HTTPException(status_code=403, detail="Only admins can archive projects")
        
        # Archive project
        result = await db.projects.update_one(
            {"_id": proj_id},
            {"$set": {"status": "archived", "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return {"success": True, "message": "Project archived successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error archiving project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to archive project: {str(e)}")

# ==================== MEMBER MANAGEMENT ====================

@router.get("/{project_id}/members", response_model=List[ProjectMemberInfo])
async def get_project_members(project_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get all members of a project
    """
    try:
        user_id = ObjectId(current_user["id"])
        proj_id = ObjectId(project_id)
        
        # Check if user is a member
        membership = await db.project_members.find_one({
            "project_id": proj_id,
            "user_id": user_id,
            "status": "active"
        })
        
        if not membership:
            raise HTTPException(status_code=403, detail="You are not a member of this project")
        
        # Get all members
        members_cursor = db.project_members.find({
            "project_id": proj_id,
            "status": "active"
        }).sort("joined_at", 1)
        members_list = await members_cursor.to_list(100)
        
        return [
            ProjectMemberInfo(
                user_id=str(m["user_id"]),
                user_name=m["user_name"],
                user_email=m["user_email"],
                role=m["role"],
                joined_at=m["joined_at"]
            )
            for m in members_list
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching members: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch members: {str(e)}")

@router.post("/{project_id}/invite")
async def invite_member(
    project_id: str,
    payload: InviteMember,
    current_user: dict = Depends(get_current_user)
):
    """
    Invite a user to join the project (admin/editor only for group projects)
    """
    try:
        user_id = ObjectId(current_user["id"])
        proj_id = ObjectId(project_id)
        
        # Check if user has permission to invite (admin or editor)
        membership = await db.project_members.find_one({
            "project_id": proj_id,
            "user_id": user_id,
            "status": "active"
        })
        
        if not membership:
            raise HTTPException(status_code=403, detail="You are not a member of this project")
        
        if membership["role"] not in ["admin", "editor"]:
            raise HTTPException(status_code=403, detail="Only admins and editors can invite members")
        
        # Get project details
        project = await db.projects.find_one({"_id": proj_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Find invitee by email
        invitee = await db.users.find_one({"email": payload.invitee_email})
        if not invitee:
            raise HTTPException(status_code=404, detail="User with that email not found")
        
        invitee_id = invitee["_id"]
        
        # Check if already a member
        existing_member = await db.project_members.find_one({
            "project_id": proj_id,
            "user_id": invitee_id,
            "status": "active"
        })
        if existing_member:
            raise HTTPException(status_code=400, detail="User is already a member")
        
        # Check if invitation already exists
        existing_invitation = await db.project_invitations.find_one({
            "project_id": proj_id,
            "invitee_id": invitee_id,
            "status": "pending"
        })
        if existing_invitation:
            raise HTTPException(status_code=400, detail="Invitation already sent")
        
        # Create invitation
        invitation_doc = {
            "project_id": proj_id,
            "project_title": project["title"],
            "inviter_id": user_id,
            "inviter_name": current_user.get("name", "Unknown"),
            "invitee_id": invitee_id,
            "invitee_name": invitee.get("name", "Unknown"),
            "invitee_email": payload.invitee_email,
            "role": payload.role,
            "message": payload.message,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "responded_at": None
        }
        
        result = await db.project_invitations.insert_one(invitation_doc)
        
        return {
            "success": True,
            "message": f"Invitation sent to {payload.invitee_email}",
            "invitation_id": str(result.inserted_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error inviting member: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send invitation: {str(e)}")

@router.post("/remove-member")
async def remove_member(payload: RemoveMember, current_user: dict = Depends(get_current_user)):
    """
    Remove a member from the project (admin only)
    """
    try:
        user_id = ObjectId(current_user["id"])
        proj_id = ObjectId(payload.project_id)
        target_user_id = ObjectId(payload.user_id)
        
        # Check if user is admin
        membership = await db.project_members.find_one({
            "project_id": proj_id,
            "user_id": user_id,
            "role": "admin",
            "status": "active"
        })
        
        if not membership:
            raise HTTPException(status_code=403, detail="Only admins can remove members")
        
        # Cannot remove yourself if you're the only admin
        if str(target_user_id) == str(user_id):
            admin_count = await db.project_members.count_documents({
                "project_id": proj_id,
                "role": "admin",
                "status": "active"
            })
            if admin_count == 1:
                raise HTTPException(status_code=400, detail="Cannot remove the only admin")
        
        # Remove member
        result = await db.project_members.update_one(
            {"project_id": proj_id, "user_id": target_user_id},
            {"$set": {"status": "removed"}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Member not found")
        
        # Update member count
        active_count = await db.project_members.count_documents({
            "project_id": proj_id,
            "status": "active"
        })
        await db.projects.update_one(
            {"_id": proj_id},
            {"$set": {"member_count": active_count}}
        )
        
        return {"success": True, "message": "Member removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error removing member: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove member: {str(e)}")

# ==================== INVITATION MANAGEMENT ====================

@router.get("/invitations/pending", response_model=InvitationsResponse)
async def get_pending_invitations(current_user: dict = Depends(get_current_user)):
    """
    Get all pending project invitations for current user
    """
    try:
        user_id = ObjectId(current_user["id"])
        
        # Get pending invitations
        invitations_cursor = db.project_invitations.find({
            "invitee_id": user_id,
            "status": "pending"
        }).sort("created_at", -1)
        invitations_list = await invitations_cursor.to_list(100)
        
        invitations = [
            ProjectInvitationResponse(
                id=str(inv["_id"]),
                project_id=str(inv["project_id"]),
                project_title=inv["project_title"],
                inviter_id=str(inv["inviter_id"]),
                inviter_name=inv["inviter_name"],
                invitee_id=str(inv["invitee_id"]),
                invitee_name=inv["invitee_name"],
                invitee_email=inv["invitee_email"],
                role=inv["role"],
                message=inv["message"],
                status=inv["status"],
                created_at=inv["created_at"]
            )
            for inv in invitations_list
        ]
        
        return InvitationsResponse(
            invitations=invitations,
            count=len(invitations)
        )
        
    except Exception as e:
        print(f"Error fetching invitations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch invitations: {str(e)}")

@router.post("/invitations/accept")
async def accept_invitation(payload: AcceptInvitation, current_user: dict = Depends(get_current_user)):
    """
    Accept a project invitation
    """
    try:
        user_id = ObjectId(current_user["id"])
        invitation_id = ObjectId(payload.invitation_id)
        
        # Get invitation
        invitation = await db.project_invitations.find_one({
            "_id": invitation_id,
            "invitee_id": user_id,
            "status": "pending"
        })
        
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        # Add user to project members
        member_doc = {
            "project_id": invitation["project_id"],
            "user_id": user_id,
            "user_name": current_user.get("name", "Unknown"),
            "user_email": current_user.get("email", ""),
            "role": invitation["role"],
            "joined_at": datetime.utcnow(),
            "invited_by": invitation["inviter_id"],
            "status": "active"
        }
        await db.project_members.insert_one(member_doc)
        
        # Update invitation status
        await db.project_invitations.update_one(
            {"_id": invitation_id},
            {"$set": {"status": "accepted", "responded_at": datetime.utcnow()}}
        )
        
        # Update project member count
        member_count = await db.project_members.count_documents({
            "project_id": invitation["project_id"],
            "status": "active"
        })
        await db.projects.update_one(
            {"_id": invitation["project_id"]},
            {"$set": {"member_count": member_count, "updated_at": datetime.utcnow()}}
        )
        
        return {
            "success": True,
            "message": f"You joined {invitation['project_title']}",
            "project_id": str(invitation["project_id"])
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error accepting invitation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to accept invitation: {str(e)}")

@router.post("/invitations/reject")
async def reject_invitation(payload: RejectInvitation, current_user: dict = Depends(get_current_user)):
    """
    Reject a project invitation
    """
    try:
        user_id = ObjectId(current_user["id"])
        invitation_id = ObjectId(payload.invitation_id)
        
        # Update invitation status
        result = await db.project_invitations.update_one(
            {"_id": invitation_id, "invitee_id": user_id, "status": "pending"},
            {"$set": {"status": "rejected", "responded_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        return {"success": True, "message": "Invitation rejected"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error rejecting invitation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reject invitation: {str(e)}")
