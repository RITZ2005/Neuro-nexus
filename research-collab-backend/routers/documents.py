# routers/documents.py
from fastapi import APIRouter, HTTPException, Depends
from db.mongo import db
from schemas.document import (
    DocumentCreate, DocumentUpdate, DocumentResponse, 
    DocumentListItem, DocumentsListResponse, DocumentVersion,
    VersionsListResponse, CreateVersionSnapshot, RestoreVersion,
    TemplateListItem, TemplatesListResponse, TemplateResponse,
    TemplateCreate, CreateFromTemplate
)
from bson import ObjectId
from datetime import datetime, timezone
from routers.auth import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])

# Helper function for timezone-aware UTC datetime
def utc_now():
    """Returns current UTC time as timezone-aware datetime"""
    return datetime.now(timezone.utc)

# ==================== HELPER FUNCTIONS ====================

async def check_project_access(project_id: ObjectId, user_id: ObjectId, required_role: str = None):
    """
    Check if user has access to the project
    required_role: 'viewer', 'editor', 'admin' or None (any member)
    """
    membership = await db.project_members.find_one({
        "project_id": project_id,
        "user_id": user_id,
        "status": "active"
    })
    
    if not membership:
        raise HTTPException(status_code=403, detail="You don't have access to this project")
    
    if required_role:
        role_hierarchy = {"viewer": 1, "editor": 2, "admin": 3}
        user_role_level = role_hierarchy.get(membership["role"], 0)
        required_level = role_hierarchy.get(required_role, 0)
        
        if user_role_level < required_level:
            raise HTTPException(status_code=403, detail=f"You need {required_role} access for this action")
    
    return membership

# ==================== DOCUMENT CRUD ====================

@router.post("/create", response_model=DocumentResponse)
async def create_document(
    payload: DocumentCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new document in a project (editor/admin only)
    """
    try:
        user_id = ObjectId(current_user["id"])
        proj_id = ObjectId(payload.project_id)
        
        # Check if user has editor/admin access
        await check_project_access(proj_id, user_id, "editor")
        
        # Create document
        doc = {
            "title": payload.title,
            "content": payload.content,
            "project_id": proj_id,
            "created_by": user_id,
            "created_by_name": current_user.get("name", "Unknown"),
            "created_at": utc_now(),
            "updated_at": utc_now(),
            "version": 1,
            "last_edited_by": user_id,
            "last_edited_by_name": current_user.get("name", "Unknown"),
            "document_type": payload.document_type or "tiptap"
        }
        
        result = await db.documents.insert_one(doc)
        
        # Create initial version snapshot
        version_doc = {
            "document_id": result.inserted_id,
            "version": 1,
            "title": payload.title,
            "content": payload.content,
            "created_by": user_id,
            "created_by_name": current_user.get("name", "Unknown"),
            "created_at": utc_now(),
            "change_description": "Initial version"
        }
        await db.document_versions.insert_one(version_doc)
        
        return DocumentResponse(
            id=str(result.inserted_id),
            title=doc["title"],
            content=doc["content"],
            project_id=str(proj_id),
            created_by=str(user_id),
            created_by_name=doc["created_by_name"],
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
            version=doc["version"],
            last_edited_by=str(user_id),
            last_edited_by_name=doc["last_edited_by_name"],
            document_type=doc.get("document_type", "tiptap")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create document: {str(e)}")

@router.post("", response_model=DocumentResponse)
@router.post("/", response_model=DocumentResponse)
async def create_document_alt(
    payload: DocumentCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new document in a project (alternative endpoint for POST /documents)
    This is an alias for /documents/create to support both routes
    """
    return await create_document(payload, current_user)

@router.get("/project/{project_id}", response_model=DocumentsListResponse)
async def list_project_documents(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all documents in a project
    """
    try:
        user_id = ObjectId(current_user["id"])
        proj_id = ObjectId(project_id)
        
        # Check if user has access
        await check_project_access(proj_id, user_id)
        
        # Get documents
        documents_cursor = db.documents.find({
            "project_id": proj_id
        }).sort("updated_at", -1)
        
        documents_list = await documents_cursor.to_list(1000)
        
        documents = [
            DocumentListItem(
                id=str(doc["_id"]),
                title=doc["title"],
                project_id=str(doc["project_id"]),
                created_by_name=doc["created_by_name"],
                created_at=doc["created_at"],
                updated_at=doc["updated_at"],
                version=doc["version"],
                last_edited_by_name=doc["last_edited_by_name"],
                document_type=doc.get("document_type", "tiptap")
            )
            for doc in documents_list
        ]
        
        return DocumentsListResponse(
            documents=documents,
            count=len(documents)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")

# ==================== TEMPLATE ENDPOINTS ====================
# IMPORTANT: These must come BEFORE /{document_id} route to avoid conflicts

@router.get("/templates/test")
async def test_templates():
    """Test endpoint to check if templates exist"""
    try:
        count = await db.templates.count_documents({})
        templates = await db.templates.find({}).to_list(10)
        return {
            "status": "ok",
            "count": count,
            "templates": [{"title": t.get("title"), "id": str(t["_id"])} for t in templates]
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/templates", response_model=dict)
async def get_templates(
    category: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all available templates (predefined + user-created)
    """
    try:
        # Build query
        query = {}
        if category:
            query["category"] = category
        
        # Get all templates (predefined + user's custom ones)
        templates_cursor = db.templates.find(query).sort("created_at", -1)
        templates = await templates_cursor.to_list(length=100)
        
        template_list = []
        for template in templates:
            template_list.append(TemplateListItem(
                id=str(template["_id"]),
                title=template["title"],
                description=template.get("description", ""),
                category=template.get("category", "general"),
                is_predefined=template.get("is_predefined", False),
                created_by_name=template.get("created_by_name")
            ))
        
        return TemplatesListResponse(
            templates=template_list,
            count=len(template_list)
        ).dict()
        
    except Exception as e:
        print(f"❌ Error fetching templates: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch templates: {str(e)}")

@router.get("/templates/{template_id}", response_model=dict)
async def get_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get full template content
    """
    try:
        template = await db.templates.find_one({"_id": ObjectId(template_id)})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return TemplateResponse(
            id=str(template["_id"]),
            title=template["title"],
            description=template.get("description", ""),
            content=template.get("content", ""),
            category=template.get("category", "general"),
            is_predefined=template.get("is_predefined", False),
            created_by=str(template["created_by"]) if template.get("created_by") else None,
            created_by_name=template.get("created_by_name"),
            created_at=template["created_at"]
        ).dict()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch template: {str(e)}")

@router.post("/templates", response_model=dict)
async def create_template(
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a custom template from scratch or save existing document as template
    """
    try:
        template_data = TemplateCreate(**payload)
        
        template_doc = {
            "title": template_data.title,
            "description": template_data.description,
            "content": template_data.content,
            "category": template_data.category,
            "is_predefined": False,  # User-created templates are never predefined
            "created_by": ObjectId(current_user["id"]),
            "created_by_name": current_user.get("name", "Unknown"),
            "created_at": utc_now()
        }
        
        result = await db.templates.insert_one(template_doc)
        template_doc["_id"] = result.inserted_id
        
        return TemplateResponse(
            id=str(template_doc["_id"]),
            title=template_doc["title"],
            description=template_doc["description"],
            content=template_doc["content"],
            category=template_doc["category"],
            is_predefined=False,
            created_by=str(template_doc["created_by"]),
            created_by_name=template_doc["created_by_name"],
            created_at=template_doc["created_at"]
        ).dict()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")

@router.post("/from-template", response_model=dict)
async def create_from_template(
    payload: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new document from a template
    """
    try:
        create_data = CreateFromTemplate(**payload)
        
        # Get template
        template = await db.templates.find_one({"_id": ObjectId(create_data.template_id)})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Check project access
        user_id = ObjectId(current_user["id"])
        project_id = ObjectId(create_data.project_id)
        await check_project_access(project_id, user_id, required_role="editor")
        
        # Create document from template
        doc_title = create_data.title if create_data.title else template["title"]
        
        document = {
            "title": doc_title,
            "content": template.get("content", ""),
            "project_id": project_id,
            "created_by": user_id,
            "created_by_name": current_user.get("name", "Unknown"),
            "created_at": utc_now(),
            "updated_at": utc_now(),
            "version": 1,
            "save_count": 0,
            "last_edited_by": user_id,
            "last_edited_by_name": current_user.get("name", "Unknown")
        }
        
        result = await db.documents.insert_one(document)
        document["_id"] = result.inserted_id
        
        # Create initial version snapshot
        version = {
            "document_id": document["_id"],
            "version": 1,
            "title": document["title"],
            "content": document["content"],
            "created_by": user_id,
            "created_by_name": current_user.get("name", "Unknown"),
            "created_at": utc_now(),
            "change_description": f"Created from template: {template['title']}"
        }
        await db.document_versions.insert_one(version)
        
        return DocumentResponse(
            id=str(document["_id"]),
            title=document["title"],
            content=document["content"],
            project_id=str(document["project_id"]),
            created_by=str(document["created_by"]),
            created_by_name=document["created_by_name"],
            created_at=document["created_at"],
            updated_at=document["updated_at"],
            version=document["version"],
            last_edited_by=str(document["last_edited_by"]),
            last_edited_by_name=document["last_edited_by_name"]
        ).dict()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create document from template: {str(e)}")

@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a custom template (only if user created it)
    """
    try:
        template = await db.templates.find_one({"_id": ObjectId(template_id)})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Can't delete predefined templates
        if template.get("is_predefined", False):
            raise HTTPException(status_code=403, detail="Cannot delete predefined templates")
        
        # Can only delete own templates
        if str(template.get("created_by")) != current_user["id"]:
            raise HTTPException(status_code=403, detail="You can only delete your own templates")
        
        await db.templates.delete_one({"_id": ObjectId(template_id)})
        
        return {"message": "Template deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")

# ==================== DOCUMENT ENDPOINTS ====================

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific document with full content
    """
    try:
        user_id = ObjectId(current_user["id"])
        doc_id = ObjectId(document_id)
        
        # Get document
        document = await db.documents.find_one({"_id": doc_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if user has access to the project
        await check_project_access(document["project_id"], user_id)
        
        return DocumentResponse(
            id=str(document["_id"]),
            title=document["title"],
            content=document["content"],
            project_id=str(document["project_id"]),
            created_by=str(document["created_by"]),
            created_by_name=document["created_by_name"],
            created_at=document["created_at"],
            updated_at=document["updated_at"],
            version=document["version"],
            last_edited_by=str(document["last_edited_by"]),
            last_edited_by_name=document["last_edited_by_name"],
            document_type=document.get("document_type", "tiptap")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch document: {str(e)}")

@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    payload: DocumentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update document content (editor/admin only)
    Auto-creates version snapshot every 5 saves
    """
    try:
        user_id = ObjectId(current_user["id"])
        doc_id = ObjectId(document_id)
        
        # Get document
        document = await db.documents.find_one({"_id": doc_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if user has editor/admin access
        await check_project_access(document["project_id"], user_id, "editor")
        
        # Build update
        update_doc = {
            "updated_at": utc_now(),
            "last_edited_by": user_id,
            "last_edited_by_name": current_user.get("name", "Unknown")
        }
        
        if payload.title is not None:
            update_doc["title"] = payload.title
        if payload.content is not None:
            update_doc["content"] = payload.content
        
        # Increment version
        new_version = document["version"] + 1
        update_doc["version"] = new_version
        
        # Update document
        await db.documents.update_one(
            {"_id": doc_id},
            {"$set": update_doc}
        )
        
        # Auto-create version snapshot every 5 saves
        if new_version % 5 == 0:
            version_doc = {
                "document_id": doc_id,
                "version": new_version,
                "title": payload.title if payload.title else document["title"],
                "content": payload.content if payload.content else document["content"],
                "created_by": user_id,
                "created_by_name": current_user.get("name", "Unknown"),
                "created_at": utc_now(),
                "change_description": f"Auto-save snapshot (version {new_version})"
            }
            await db.document_versions.insert_one(version_doc)
        
        # Get updated document
        updated_doc = await db.documents.find_one({"_id": doc_id})
        
        return DocumentResponse(
            id=str(updated_doc["_id"]),
            title=updated_doc["title"],
            content=updated_doc["content"],
            project_id=str(updated_doc["project_id"]),
            created_by=str(updated_doc["created_by"]),
            created_by_name=updated_doc["created_by_name"],
            created_at=updated_doc["created_at"],
            updated_at=updated_doc["updated_at"],
            version=updated_doc["version"],
            last_edited_by=str(updated_doc["last_edited_by"]),
            last_edited_by_name=updated_doc["last_edited_by_name"],
            document_type=updated_doc.get("document_type", "tiptap")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update document: {str(e)}")

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a document (editor/admin only)
    """
    try:
        user_id = ObjectId(current_user["id"])
        doc_id = ObjectId(document_id)
        
        # Get document
        document = await db.documents.find_one({"_id": doc_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if user has editor/admin access
        await check_project_access(document["project_id"], user_id, "editor")
        
        # Delete document and all its versions
        await db.documents.delete_one({"_id": doc_id})
        await db.document_versions.delete_many({"document_id": doc_id})
        
        return {"success": True, "message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

# ==================== VERSION MANAGEMENT ====================

@router.get("/{document_id}/versions", response_model=VersionsListResponse)
async def get_document_versions(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all version snapshots for a document
    """
    try:
        user_id = ObjectId(current_user["id"])
        doc_id = ObjectId(document_id)
        
        # Get document
        document = await db.documents.find_one({"_id": doc_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check access
        await check_project_access(document["project_id"], user_id)
        
        # Get versions (sorted by created_at descending - newest first)
        versions_cursor = db.document_versions.find({
            "document_id": doc_id
        }).sort("created_at", -1)
        
        versions_list = await versions_cursor.to_list(1000)
        
        versions = [
            DocumentVersion(
                id=str(ver["_id"]),
                document_id=str(ver["document_id"]),
                version=ver["version"],
                title=ver["title"],
                content=ver["content"],
                created_by=str(ver["created_by"]),
                created_by_name=ver["created_by_name"],
                created_at=ver["created_at"],
                change_description=ver.get("change_description")
            )
            for ver in versions_list
        ]
        
        return VersionsListResponse(
            versions=versions,
            count=len(versions)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching versions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch versions: {str(e)}")

@router.post("/versions/create", response_model=DocumentVersion)
async def create_version_snapshot(
    payload: CreateVersionSnapshot,
    current_user: dict = Depends(get_current_user)
):
    """
    Manually create a version snapshot
    """
    try:
        user_id = ObjectId(current_user["id"])
        doc_id = ObjectId(payload.document_id)
        
        # Get document
        document = await db.documents.find_one({"_id": doc_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check access
        await check_project_access(document["project_id"], user_id, "editor")
        
        # Create version snapshot
        version_doc = {
            "document_id": doc_id,
            "version": document["version"],
            "title": document["title"],
            "content": document["content"],
            "created_by": user_id,
            "created_by_name": current_user.get("name", "Unknown"),
            "created_at": utc_now(),
            "change_description": payload.change_description
        }
        
        result = await db.document_versions.insert_one(version_doc)
        
        return DocumentVersion(
            id=str(result.inserted_id),
            document_id=str(doc_id),
            version=document["version"],
            title=document["title"],
            content=document["content"],
            created_by=str(user_id),
            created_by_name=current_user.get("name", "Unknown"),
            created_at=version_doc["created_at"],
            change_description=payload.change_description
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating version: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create version: {str(e)}")

@router.post("/versions/restore", response_model=DocumentResponse)
async def restore_document_version(
    payload: RestoreVersion,
    current_user: dict = Depends(get_current_user)
):
    """
    Restore a document to a previous version
    """
    try:
        user_id = ObjectId(current_user["id"])
        doc_id = ObjectId(payload.document_id)
        version_id = ObjectId(payload.version_id)
        
        # Get document
        document = await db.documents.find_one({"_id": doc_id})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check access
        await check_project_access(document["project_id"], user_id, "editor")
        
        # Get version to restore
        version = await db.document_versions.find_one({"_id": version_id})
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
        
        # Update document with version content
        new_version = document["version"] + 1
        update_doc = {
            "title": version["title"],
            "content": version["content"],
            "updated_at": utc_now(),
            "version": new_version,
            "last_edited_by": user_id,
            "last_edited_by_name": current_user.get("name", "Unknown")
        }
        
        await db.documents.update_one(
            {"_id": doc_id},
            {"$set": update_doc}
        )
        
        # Create new version snapshot for restore
        restore_version_doc = {
            "document_id": doc_id,
            "version": new_version,
            "title": version["title"],
            "content": version["content"],
            "created_by": user_id,
            "created_by_name": current_user.get("name", "Unknown"),
            "created_at": utc_now(),
            "change_description": f"Restored from version {version['version']}"
        }
        await db.document_versions.insert_one(restore_version_doc)
        
        # Get updated document
        updated_doc = await db.documents.find_one({"_id": doc_id})
        
        return DocumentResponse(
            id=str(updated_doc["_id"]),
            title=updated_doc["title"],
            content=updated_doc["content"],
            project_id=str(updated_doc["project_id"]),
            created_by=str(updated_doc["created_by"]),
            created_by_name=updated_doc["created_by_name"],
            created_at=updated_doc["created_at"],
            updated_at=updated_doc["updated_at"],
            version=updated_doc["version"],
            last_edited_by=str(updated_doc["last_edited_by"]),
            last_edited_by_name=updated_doc["last_edited_by_name"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error restoring version: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to restore version: {str(e)}")

