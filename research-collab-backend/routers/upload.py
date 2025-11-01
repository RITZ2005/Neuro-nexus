# routers/upload.py
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from routers.auth import get_current_user
from pathlib import Path
import shutil
import uuid
from datetime import datetime
from typing import Optional
import os

router = APIRouter(prefix="/upload", tags=["upload"])

# Upload directory configuration
UPLOAD_DIR = Path("uploads")
PROFILE_DIR = UPLOAD_DIR / "profiles"
POST_DIR = UPLOAD_DIR / "posts"

# Create directories if they don't exist
UPLOAD_DIR.mkdir(exist_ok=True)
PROFILE_DIR.mkdir(exist_ok=True)
POST_DIR.mkdir(exist_ok=True)

# Allowed image extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def validate_image(file: UploadFile) -> None:
    """Validate image file"""
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check content type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an image"
        )

def generate_unique_filename(original_filename: str) -> str:
    """Generate unique filename with timestamp and UUID"""
    ext = Path(original_filename).suffix.lower()
    unique_id = uuid.uuid4().hex[:8]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{timestamp}_{unique_id}{ext}"

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    image_type: str = "post",  # "post" or "profile"
    current_user: dict = Depends(get_current_user)
):
    """
    Upload an image for posts or profile
    Returns the URL path to access the image
    """
    try:
        # Validate image
        validate_image(file)
        
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        
        # Determine upload directory
        if image_type == "profile":
            upload_dir = PROFILE_DIR
        else:
            upload_dir = POST_DIR
        
        # Generate unique filename
        filename = generate_unique_filename(file.filename)
        file_path = upload_dir / filename
        
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Generate URL path (relative to backend)
        url_path = f"/uploads/{image_type}s/{filename}"
        
        return {
            "success": True,
            "message": "Image uploaded successfully",
            "url": url_path,
            "filename": filename,
            "size": file_size,
            "type": file.content_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading image: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload image: {str(e)}"
        )

@router.delete("/image")
async def delete_image(
    url: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an uploaded image
    Only the uploader can delete their images
    """
    try:
        # Extract filename from URL
        # URL format: /uploads/posts/20241015_abc123.jpg
        parts = url.split("/")
        if len(parts) < 4:
            raise HTTPException(status_code=400, detail="Invalid URL format")
        
        image_type = parts[-2].rstrip('s')  # Remove 's' from 'posts' or 'profiles'
        filename = parts[-1]
        
        # Determine file path
        if image_type == "profile":
            file_path = PROFILE_DIR / filename
        elif image_type == "post":
            file_path = POST_DIR / filename
        else:
            raise HTTPException(status_code=400, detail="Invalid image type")
        
        # Check if file exists
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Delete file
        file_path.unlink()
        
        return {
            "success": True,
            "message": "Image deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting image: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete image: {str(e)}"
        )
