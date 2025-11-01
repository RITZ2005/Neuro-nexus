# routers/posts.py
from fastapi import APIRouter, HTTPException, Depends, Query
from db.mongo import db
from schemas.post import PostCreate, PostUpdate, Post, Comment, CommentCreate, Like, PostResponse, LikeResponse
from routers.auth import get_current_user
from bson import ObjectId
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/posts", tags=["posts"])

def serialize_post(post_doc: dict, current_user_id: str) -> Post:
    """Convert MongoDB post document to Post schema"""
    try:
        # Check if current user liked this post
        likes = post_doc.get("likes", [])
        liked_by_user = any(str(like.get("user_id")) == str(current_user_id) for like in likes)
        
        # Serialize comments
        comments_list = []
        for comment in post_doc.get("comments", []):
            comments_list.append(Comment(
                id=str(comment.get("_id", comment.get("id", ""))),
                post_id=str(post_doc["_id"]),
                author_id=str(comment.get("author_id")),
                author_name=comment.get("author_name", "Unknown"),
                author_avatar=comment.get("author_avatar"),
                author_domain=comment.get("author_domain"),
                content=comment.get("content", ""),
                created_at=comment.get("created_at", datetime.now(timezone.utc))
            ))
        
        # Serialize likes (last 5 for preview)
        likes_list = []
        for like in likes[-5:]:
            likes_list.append(Like(
                user_id=str(like.get("user_id")),
                user_name=like.get("user_name", "Unknown"),
                user_avatar=like.get("user_avatar"),
                created_at=like.get("created_at", datetime.now(timezone.utc))
            ))
        
        return Post(
            id=str(post_doc["_id"]),
            author_id=str(post_doc["author_id"]),
            author_name=post_doc.get("author_name", "Unknown"),
            author_avatar=post_doc.get("author_avatar"),
            author_domain=post_doc.get("author_domain"),
            author_institution=post_doc.get("author_institution"),
            content=post_doc.get("content", ""),
            post_type=post_doc.get("post_type", "text"),
            media_url=post_doc.get("media_url"),
            document_id=post_doc.get("document_id"),
            link_url=post_doc.get("link_url"),
            link_title=post_doc.get("link_title"),
            link_description=post_doc.get("link_description"),
            tags=post_doc.get("tags", []),
            likes_count=len(likes),
            comments_count=len(post_doc.get("comments", [])),
            liked_by_user=liked_by_user,
            comments=comments_list[-10:],  # Latest 10 comments
            likes=likes_list,
            created_at=post_doc.get("created_at", datetime.now(timezone.utc)),
            updated_at=post_doc.get("updated_at")
        )
    except Exception as e:
        print(f"Error serializing post: {e}")
        raise

@router.post("/create", response_model=PostResponse)
async def create_post(
    post_data: PostCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new post (text, image, document, or link)
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        
        # Get current user's full profile
        user_doc = await db.users.find_one({"_id": current_user_id})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Create post document
        post_doc = {
            "author_id": current_user_id,
            "author_name": user_doc.get("name", "Unknown"),
            "author_avatar": user_doc.get("avatar"),
            "author_domain": user_doc.get("domain"),
            "author_institution": user_doc.get("institution"),
            "content": post_data.content,
            "post_type": post_data.post_type,
            "media_url": post_data.media_url,
            "document_id": post_data.document_id,
            "link_url": post_data.link_url,
            "link_title": post_data.link_title,
            "link_description": post_data.link_description,
            "tags": post_data.tags or [],
            "likes": [],
            "comments": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": None
        }
        
        # Insert post
        result = await db.posts.insert_one(post_doc)
        post_doc["_id"] = result.inserted_id
        
        # Serialize post
        post = serialize_post(post_doc, str(current_user_id))
        
        return PostResponse(
            success=True,
            message="Post created successfully",
            post_id=str(result.inserted_id),
            post=post
        )
        
    except Exception as e:
        print(f"Error creating post: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create post: {str(e)}")

@router.get("/feed", response_model=List[Post])
async def get_feed_posts(
    domain_filter: bool = Query(True, description="Filter by user's domain"),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """
    Get posts for feed - filtered by domain if enabled
    Shows posts from users in the same research domain
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        
        # Get current user's domain
        user_doc = await db.users.find_one({"_id": current_user_id})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Build query
        query = {}
        
        if domain_filter and user_doc.get("domain"):
            # Get posts from users in the same domain
            query["author_domain"] = user_doc["domain"]
        
        # Fetch posts sorted by creation date (newest first)
        posts_cursor = db.posts.find(query).sort("created_at", -1).skip(skip).limit(limit)
        posts_docs = await posts_cursor.to_list(length=limit)
        
        # Serialize posts
        posts = [serialize_post(post_doc, str(current_user_id)) for post_doc in posts_docs]
        
        return posts
        
    except Exception as e:
        print(f"Error fetching feed posts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch posts: {str(e)}")

@router.get("/user/{user_id}", response_model=List[Post])
async def get_user_posts(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all posts by a specific user
    """
    try:
        current_user_id = str(current_user["id"])
        target_user_id = ObjectId(user_id)
        
        # Verify target user exists
        user_doc = await db.users.find_one({"_id": target_user_id})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Fetch user's posts
        posts_cursor = db.posts.find({"author_id": target_user_id}).sort("created_at", -1).skip(skip).limit(limit)
        posts_docs = await posts_cursor.to_list(length=limit)
        
        # Serialize posts
        posts = [serialize_post(post_doc, current_user_id) for post_doc in posts_docs]
        
        return posts
        
    except Exception as e:
        print(f"Error fetching user posts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch posts: {str(e)}")

@router.post("/{post_id}/like", response_model=LikeResponse)
async def like_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Like or unlike a post
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        post_obj_id = ObjectId(post_id)
        
        # Get current user info
        user_doc = await db.users.find_one({"_id": current_user_id})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get post
        post_doc = await db.posts.find_one({"_id": post_obj_id})
        if not post_doc:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Check if already liked
        likes = post_doc.get("likes", [])
        already_liked = any(str(like.get("user_id")) == str(current_user_id) for like in likes)
        
        if already_liked:
            # Unlike: Remove like
            await db.posts.update_one(
                {"_id": post_obj_id},
                {"$pull": {"likes": {"user_id": current_user_id}}}
            )
            
            # Get updated count
            updated_post = await db.posts.find_one({"_id": post_obj_id})
            likes_count = len(updated_post.get("likes", []))
            
            return LikeResponse(
                success=True,
                message="Post unliked",
                likes_count=likes_count,
                liked=False
            )
        else:
            # Like: Add like
            like_obj = {
                "user_id": current_user_id,
                "user_name": user_doc.get("name", "Unknown"),
                "user_avatar": user_doc.get("avatar"),
                "created_at": datetime.now(timezone.utc)
            }
            
            await db.posts.update_one(
                {"_id": post_obj_id},
                {"$push": {"likes": like_obj}}
            )
            
            # Get updated count
            updated_post = await db.posts.find_one({"_id": post_obj_id})
            likes_count = len(updated_post.get("likes", []))
            
            # Create notification for post author
            if str(post_doc["author_id"]) != str(current_user_id):
                await db.notifications.insert_one({
                    "type": "post_like",
                    "sender_id": current_user_id,
                    "sender_name": user_doc.get("name"),
                    "sender_avatar": user_doc.get("avatar"),
                    "receiver_id": post_doc["author_id"],
                    "post_id": post_obj_id,
                    "title": "New Like",
                    "message": f"{user_doc.get('name')} liked your post",
                    "read": False,
                    "created_at": datetime.now(timezone.utc)
                })
            
            return LikeResponse(
                success=True,
                message="Post liked",
                likes_count=likes_count,
                liked=True
            )
        
    except Exception as e:
        print(f"Error liking post: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to like post: {str(e)}")

@router.post("/{post_id}/comment", response_model=PostResponse)
async def comment_on_post(
    post_id: str,
    comment_data: CommentCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Add a comment to a post
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        post_obj_id = ObjectId(post_id)
        
        # Get current user info
        user_doc = await db.users.find_one({"_id": current_user_id})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get post
        post_doc = await db.posts.find_one({"_id": post_obj_id})
        if not post_doc:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Create comment object
        comment_obj = {
            "_id": ObjectId(),
            "author_id": current_user_id,
            "author_name": user_doc.get("name", "Unknown"),
            "author_avatar": user_doc.get("avatar"),
            "author_domain": user_doc.get("domain"),
            "content": comment_data.content,
            "created_at": datetime.now(timezone.utc)
        }
        
        # Add comment to post
        await db.posts.update_one(
            {"_id": post_obj_id},
            {"$push": {"comments": comment_obj}}
        )
        
        # Create notification for post author
        if str(post_doc["author_id"]) != str(current_user_id):
            await db.notifications.insert_one({
                "type": "post_comment",
                "sender_id": current_user_id,
                "sender_name": user_doc.get("name"),
                "sender_avatar": user_doc.get("avatar"),
                "receiver_id": post_doc["author_id"],
                "post_id": post_obj_id,
                "title": "New Comment",
                "message": f"{user_doc.get('name')} commented on your post",
                "read": False,
                "created_at": datetime.now(timezone.utc)
            })
        
        # Get updated post
        updated_post = await db.posts.find_one({"_id": post_obj_id})
        post = serialize_post(updated_post, str(current_user_id))
        
        return PostResponse(
            success=True,
            message="Comment added",
            post_id=str(post_obj_id),
            post=post
        )
        
    except Exception as e:
        print(f"Error commenting on post: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to comment: {str(e)}")

@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    post_data: PostUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a post (only author can update)
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        post_obj_id = ObjectId(post_id)
        
        # Get post
        post_doc = await db.posts.find_one({"_id": post_obj_id})
        if not post_doc:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Check if user is author
        if str(post_doc["author_id"]) != str(current_user_id):
            raise HTTPException(status_code=403, detail="Only author can update post")
        
        # Build update document
        update_doc = {"updated_at": datetime.now(timezone.utc)}
        if post_data.content is not None:
            update_doc["content"] = post_data.content
        if post_data.tags is not None:
            update_doc["tags"] = post_data.tags
        
        # Update post
        await db.posts.update_one(
            {"_id": post_obj_id},
            {"$set": update_doc}
        )
        
        # Get updated post
        updated_post = await db.posts.find_one({"_id": post_obj_id})
        post = serialize_post(updated_post, str(current_user_id))
        
        return PostResponse(
            success=True,
            message="Post updated",
            post_id=str(post_obj_id),
            post=post
        )
        
    except Exception as e:
        print(f"Error updating post: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update post: {str(e)}")

@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a post (only author can delete)
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        post_obj_id = ObjectId(post_id)
        
        # Get post
        post_doc = await db.posts.find_one({"_id": post_obj_id})
        if not post_doc:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Check if user is author
        if str(post_doc["author_id"]) != str(current_user_id):
            raise HTTPException(status_code=403, detail="Only author can delete post")
        
        # Delete post
        await db.posts.delete_one({"_id": post_obj_id})
        
        return PostResponse(
            success=True,
            message="Post deleted",
            post_id=str(post_obj_id),
            post=None
        )
        
    except Exception as e:
        print(f"Error deleting post: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete post: {str(e)}")

@router.delete("/{post_id}/comment/{comment_id}")
async def delete_comment(
    post_id: str,
    comment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a comment (only comment author or post author can delete)
    """
    try:
        current_user_id = ObjectId(current_user["id"])
        post_obj_id = ObjectId(post_id)
        comment_obj_id = ObjectId(comment_id)
        
        # Get post
        post_doc = await db.posts.find_one({"_id": post_obj_id})
        if not post_doc:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Find comment
        comment = None
        for c in post_doc.get("comments", []):
            if str(c.get("_id")) == str(comment_obj_id):
                comment = c
                break
        
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        # Check if user is comment author or post author
        is_comment_author = str(comment.get("author_id")) == str(current_user_id)
        is_post_author = str(post_doc["author_id"]) == str(current_user_id)
        
        if not (is_comment_author or is_post_author):
            raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
        
        # Delete comment
        await db.posts.update_one(
            {"_id": post_obj_id},
            {"$pull": {"comments": {"_id": comment_obj_id}}}
        )
        
        return PostResponse(
            success=True,
            message="Comment deleted",
            post_id=str(post_obj_id),
            post=None
        )
        
    except Exception as e:
        print(f"Error deleting comment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete comment: {str(e)}")
