# routers/versions.py
from fastapi import APIRouter, HTTPException, Depends
from schemas.document import VersionCreate
from db.mongo import db
from bson import ObjectId
from routers.auth import get_current_user

router = APIRouter(prefix="/versions", tags=["versions"])

@router.post("/")
async def create_version(payload: VersionCreate, current_user: dict = Depends(get_current_user)):
    # Create a new version for the document
    version_doc = {
        "document_id": ObjectId(payload.document_id),
        "author_id": payload.author_id,
        "message": payload.message,
        "content": payload.content,
        "file_path": payload.file_path,
        "createdAt": None,
        "parentVersionId": None
    }
    res = await db.versions.insert_one(version_doc)
    # update doc latestVersionId
    await db.documents.update_one({"_id": ObjectId(payload.document_id)}, {"$set": {"latestVersionId": res.inserted_id}})
    return {"version_id": str(res.inserted_id)}

@router.get("/history/{document_id}")
async def version_history(document_id: str):
    items = await db.versions.find({"document_id": ObjectId(document_id)}).to_list(200)
    out = []
    for v in items:
        v["id"] = str(v["_id"])
        v["document_id"] = str(v["document_id"])
        if v.get("parentVersionId"):
            v["parentVersionId"] = str(v["parentVersionId"])
        del v["_id"]
        out.append(v)
    return out

@router.get("/{version_id}")
async def get_version(version_id: str):
    v = await db.versions.find_one({"_id": ObjectId(version_id)})
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    v["id"] = str(v["_id"])
    v["document_id"] = str(v["document_id"])
    del v["_id"]
    return v
