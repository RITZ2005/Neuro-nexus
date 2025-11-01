# routers/publications.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import StreamingResponse
from db.mongo import db
from schemas.publication import PublicationCreate, PublicationResponse, PublicationAccessRequest, PublicationSearchQuery
from routers.auth import get_current_user
from utils.encryption import (
    generate_private_key, 
    encrypt_file_content, 
    decrypt_file_content,
    hash_private_key,
    verify_private_key
)
from utils.pinata import get_pinata_client
from bson import ObjectId
from datetime import datetime
from typing import List, Optional
import io

router = APIRouter(prefix="/publications", tags=["publications"])

@router.post("/publish")
async def publish_document(
    title: str = Form(...),
    description: str = Form(...),
    domain: str = Form(...),
    keywords: str = Form(...),  # Comma-separated
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Publish a document securely:
    1. Generate private key
    2. Encrypt file with private key
    3. Upload encrypted file to IPFS via Pinata
    4. Store metadata in MongoDB with key hash
    5. Return private key to user (ONLY ONCE)
    """
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        file_type = file.content_type or "application/octet-stream"
        
        print(f"📄 Publishing document: {title}")
        print(f"📊 File size: {file_size} bytes, Type: {file_type}")
        
        # Generate unique private key for this document
        private_key = generate_private_key()
        print(f"🔑 Private key generated")
        
        # Encrypt file content
        encrypted_content = encrypt_file_content(file_content, private_key)
        print(f"🔒 File encrypted, size: {len(encrypted_content)} bytes")
        
        # Upload to Pinata IPFS
        pinata = get_pinata_client()
        print(f"☁️ Uploading to Pinata IPFS...")
        
        ipfs_result = pinata.pin_file_to_ipfs(
            file_content=encrypted_content,
            file_name=f"encrypted_{file.filename}"
            # Metadata will be stored in MongoDB, not Pinata
        )
        
        ipfs_hash = ipfs_result["IpfsHash"]
        print(f"✅ Uploaded to IPFS: {ipfs_hash}")
        
        # Hash the private key for verification (don't store actual key!)
        key_hash = hash_private_key(private_key)
        
        # Parse keywords
        keywords_list = [k.strip() for k in keywords.split(",") if k.strip()]
        
        # Create publication record in MongoDB
        publication = {
            "title": title,
            "description": description,
            "domain": domain,
            "keywords": keywords_list,
            "ipfs_hash": ipfs_hash,
            "key_hash": key_hash,  # Store hash, not actual key
            "owner_id": ObjectId(current_user["id"]),
            "owner_name": current_user.get("name", "Unknown"),
            "owner_email": current_user["email"],
            "created_at": datetime.utcnow(),
            "file_size": file_size,
            "file_type": file_type,
            "file_name": file.filename,
            "access_count": 0,
            "status": "published"
        }
        
        result = await db.publications.insert_one(publication)
        publication_id = str(result.inserted_id)
        
        # Return publication info with the private key (ONLY SHOWN ONCE!)
        return {
            "success": True,
            "publication_id": publication_id,
            "private_key": private_key,  # ⚠️ CRITICAL: User must save this!
            "ipfs_hash": ipfs_hash,
            "title": title,
            "message": "⚠️ IMPORTANT: Save your private key! It cannot be recovered and is needed to access this document."
        }
        
    except Exception as e:
        print(f"Error publishing document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to publish document: {str(e)}")

@router.get("/my-publications")
async def get_my_publications(current_user: dict = Depends(get_current_user)):
    """
    Get all publications by the current user
    """
    try:
        publications = await db.publications.find({
            "owner_id": ObjectId(current_user["id"])
        }).sort("created_at", -1).to_list(100)
        
        # Serialize
        result = []
        for pub in publications:
            pub["id"] = str(pub["_id"])
            pub["owner_id"] = str(pub["owner_id"])
            pub["created_at"] = pub["created_at"].isoformat()
            del pub["_id"]
            del pub["key_hash"]  # Don't expose key hash
            result.append(pub)
        
        return result
        
    except Exception as e:
        print(f"Error fetching publications: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch publications")

@router.post("/search")
async def search_publications(query: PublicationSearchQuery):
    """
    Search for publications by title, keywords, or domain
    Returns public metadata (not the actual file)
    """
    try:
        # Build search query
        search_filter = {"status": "published"}
        
        if query.query:
            # Text search in title and description
            search_filter["$or"] = [
                {"title": {"$regex": query.query, "$options": "i"}},
                {"description": {"$regex": query.query, "$options": "i"}}
            ]
        
        if query.domain:
            search_filter["domain"] = query.domain
        
        if query.keywords:
            search_filter["keywords"] = {"$in": query.keywords}
        
        publications = await db.publications.find(search_filter).sort("created_at", -1).to_list(50)
        
        # Serialize and remove sensitive info
        result = []
        for pub in publications:
            pub["id"] = str(pub["_id"])
            pub["owner_id"] = str(pub["owner_id"])
            pub["created_at"] = pub["created_at"].isoformat()
            del pub["_id"]
            del pub["key_hash"]  # Don't expose key hash
            del pub["owner_email"]  # Privacy
            result.append(pub)
        
        return result
        
    except Exception as e:
        print(f"Error searching publications: {e}")
        raise HTTPException(status_code=500, detail="Failed to search publications")

@router.post("/access")
async def access_document(request: PublicationAccessRequest):
    """
    Access and download a document using its private key
    1. Verify private key matches stored hash
    2. Retrieve encrypted file from IPFS
    3. Decrypt file with private key
    4. Return decrypted file
    """
    try:
        # Trim whitespace from inputs
        publication_id = request.publication_id.strip()
        private_key = request.private_key.strip()
        
        print(f"🔓 Access request for publication: {publication_id}")
        print(f"🔑 Private key length: {len(private_key)} chars")
        
        # Find publication
        publication = await db.publications.find_one({
            "_id": ObjectId(publication_id)
        })
        
        if not publication:
            print(f"❌ Publication not found: {publication_id}")
            raise HTTPException(status_code=404, detail="Publication not found")
        
        print(f"📄 Found publication: {publication['title']}")
        
        # Verify private key
        provided_hash = hash_private_key(private_key)
        stored_hash = publication["key_hash"]
        
        print(f"🔐 Provided key hash: {provided_hash[:20]}...")
        print(f"🔐 Stored key hash: {stored_hash[:20]}...")
        
        if not verify_private_key(private_key, stored_hash):
            # Increment access count even for failed attempts (security)
            await db.publications.update_one(
                {"_id": ObjectId(publication_id)},
                {"$inc": {"failed_access_attempts": 1}}
            )
            print(f"❌ Private key verification failed!")
            raise HTTPException(status_code=403, detail="Invalid private key")
        
        # Retrieve encrypted file from IPFS
        pinata = get_pinata_client()
        encrypted_content = pinata.get_file_from_ipfs(publication["ipfs_hash"])
        
        # Decrypt file
        try:
            decrypted_content = decrypt_file_content(encrypted_content, request.private_key)
        except ValueError as e:
            raise HTTPException(status_code=403, detail="Decryption failed: Invalid key")
        
        # Increment successful access count
        await db.publications.update_one(
            {"_id": ObjectId(request.publication_id)},
            {"$inc": {"access_count": 1}}
        )
        
        # Return file as streaming response
        return StreamingResponse(
            io.BytesIO(decrypted_content),
            media_type=publication["file_type"],
            headers={
                "Content-Disposition": f'attachment; filename="{publication["file_name"]}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error accessing document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to access document: {str(e)}")

@router.get("/details/{publication_id}")
async def get_publication_details(publication_id: str):
    """
    Get public details of a publication (without file access)
    """
    try:
        publication = await db.publications.find_one({
            "_id": ObjectId(publication_id)
        })
        
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")
        
        # Serialize
        publication["id"] = str(publication["_id"])
        publication["owner_id"] = str(publication["owner_id"])
        publication["created_at"] = publication["created_at"].isoformat()
        del publication["_id"]
        del publication["key_hash"]  # Security
        del publication["owner_email"]  # Privacy
        
        return publication
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching publication details: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch publication details")

@router.delete("/{publication_id}")
async def delete_publication(
    publication_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a publication (only owner can delete)
    Note: This marks as archived but keeps IPFS file
    """
    try:
        # Find publication
        publication = await db.publications.find_one({
            "_id": ObjectId(publication_id)
        })
        
        if not publication:
            raise HTTPException(status_code=404, detail="Publication not found")
        
        # Verify ownership
        if str(publication["owner_id"]) != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete this publication")
        
        # Mark as archived (don't actually delete from IPFS for immutability)
        await db.publications.update_one(
            {"_id": ObjectId(publication_id)},
            {"$set": {"status": "archived", "archived_at": datetime.utcnow()}}
        )
        
        return {"success": True, "message": "Publication archived"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting publication: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete publication")

@router.get("/stats")
async def get_publication_stats(current_user: dict = Depends(get_current_user)):
    """
    Get statistics about user's publications
    """
    try:
        total_publications = await db.publications.count_documents({
            "owner_id": ObjectId(current_user["id"]),
            "status": "published"
        })
        
        # Total access count
        pipeline = [
            {"$match": {"owner_id": ObjectId(current_user["id"]), "status": "published"}},
            {"$group": {"_id": None, "total_access": {"$sum": "$access_count"}}}
        ]
        access_stats = await db.publications.aggregate(pipeline).to_list(1)
        total_access = access_stats[0]["total_access"] if access_stats else 0
        
        return {
            "total_publications": total_publications,
            "total_access": total_access,
            "average_access": round(total_access / total_publications, 2) if total_publications > 0 else 0
        }
        
    except Exception as e:
        print(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")
