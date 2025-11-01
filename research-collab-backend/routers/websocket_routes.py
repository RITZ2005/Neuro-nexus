from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from websocket.manager import manager
from db.mongo import db
from datetime import datetime, timezone
from bson import ObjectId
import logging
import json
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)

def utc_now():
    """Helper to get current UTC time with timezone info"""
    return datetime.now(timezone.utc)


async def get_user_from_token(token: Optional[str] = Query(None)) -> dict:
    """
    Extract user info from JWT token passed as query parameter.
    For now, returns mock user. TODO: Implement proper JWT validation.
    """
    # TODO: Implement proper JWT token validation
    # For now, parse user from token or use default
    if token:
        try:
            # Mock parsing - replace with actual JWT decode
            return {
                "id": "user_123",
                "name": "Test User",
                "email": "test@example.com"
            }
        except Exception as e:
            logger.error(f"Token validation error: {e}")
    
    # Default user for testing
    return {
        "id": "user_default",
        "name": "Anonymous User",
        "email": "anonymous@example.com"
    }


@router.websocket("/ws/document/{document_id}")
async def websocket_document_collaboration(
    websocket: WebSocket,
    document_id: str,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time document collaboration.
    Handles Yjs CRDT synchronization between multiple users editing the same document.
    """
    user = await get_user_from_token(token)
    user_id = user["id"]
    user_name = user["name"]
    room_id = f"doc_{document_id}"
    
    try:
        # Connect user to document room
        await manager.connect(
            websocket, 
            room_id, 
            user_id,
            user_name=user_name,
            user_color=f"#{''.join([hex(hash(user_id))[i] for i in range(2, 8)])}"  # Generate color from user_id
        )
        
        logger.info(f"Document collaboration started: {document_id} by {user_name}")
        
        # Main message loop
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get("type")
                
                if message_type == "sync":
                    # Yjs synchronization message - broadcast to all other clients
                    await manager.broadcast(room_id, message, exclude=websocket)
                    
                elif message_type == "awareness":
                    # Cursor position / selection update - broadcast to others
                    await manager.broadcast(room_id, {
                        "type": "awareness",
                        "user_id": user_id,
                        "user_name": user_name,
                        "data": message.get("data")
                    }, exclude=websocket)
                    
                elif message_type == "cursor":
                    # Explicit cursor update
                    await manager.broadcast(room_id, {
                        "type": "cursor",
                        "user_id": user_id,
                        "user_name": user_name,
                        "position": message.get("position"),
                        "selection": message.get("selection")
                    }, exclude=websocket)
                    
                else:
                    logger.warning(f"Unknown message type: {message_type}")
                    
            except json.JSONDecodeError:
                # Not JSON - might be binary Yjs update
                # Broadcast binary data to all other clients
                await manager.broadcast(room_id, {
                    "type": "binary_update",
                    "data": data
                }, exclude=websocket)
            except Exception as e:
                logger.error(f"Error processing message: {e}")
    
    except WebSocketDisconnect:
        logger.info(f"User {user_name} disconnected from document {document_id}")
    except Exception as e:
        logger.error(f"WebSocket error in document collaboration: {e}")
    finally:
        manager.disconnect(websocket)


@router.websocket("/ws/chat/{project_id}")
async def websocket_chat(
    websocket: WebSocket,
    project_id: str,
    token: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time project chat.
    Handles message sending, typing indicators, and online presence.
    """
    user = await get_user_from_token(token)
    user_id = user["id"]
    user_name = user["name"]
    room_id = f"chat_{project_id}"
    
    try:
        # Connect user to chat room
        await manager.connect(
            websocket, 
            room_id, 
            user_id,
            user_name=user_name
        )
        
        logger.info(f"Chat session started: project {project_id} by {user_name}")
        
        # Main message loop
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "message":
                # Chat message - save to database and broadcast
                content = data.get("content", "").strip()
                
                if content:
                    # Create message document
                    message_doc = {
                        "project_id": project_id,
                        "user_id": user_id,
                        "user_name": user_name,
                        "content": content,
                        "timestamp": utc_now(),
                        "edited": False,
                        "deleted": False
                    }
                    
                    # Save to MongoDB
                    result = await db.chat_messages.insert_one(message_doc)
                    message_doc["_id"] = str(result.inserted_id)
                    message_doc["id"] = str(result.inserted_id)
                    
                    # Broadcast to all users in chat room
                    await manager.broadcast(room_id, {
                        "type": "message",
                        "data": {
                            "id": str(result.inserted_id),
                            "project_id": project_id,
                            "user_id": user_id,
                            "user_name": user_name,
                            "content": content,
                            "timestamp": message_doc["timestamp"].isoformat(),
                            "edited": False,
                            "deleted": False
                        }
                    })
                    
                    logger.info(f"Chat message saved: {project_id} from {user_name}")
            
            elif message_type == "typing":
                # Typing indicator - broadcast to others (don't save)
                is_typing = data.get("is_typing", False)
                
                await manager.broadcast(room_id, {
                    "type": "typing",
                    "user_id": user_id,
                    "user_name": user_name,
                    "is_typing": is_typing
                }, exclude=websocket)
            
            elif message_type == "ping":
                # Keepalive ping
                await websocket.send_json({"type": "pong"})
            
            else:
                logger.warning(f"Unknown chat message type: {message_type}")
    
    except WebSocketDisconnect:
        logger.info(f"User {user_name} disconnected from chat {project_id}")
    except Exception as e:
        logger.error(f"WebSocket error in chat: {e}")
    finally:
        manager.disconnect(websocket)


@router.get("/ws/health")
async def websocket_health():
    """
    Health check endpoint for WebSocket service.
    Returns statistics about active connections.
    """
    return {
        "status": "healthy",
        "active_rooms": len(manager.active_connections),
        "total_connections": sum(
            len(connections) for connections in manager.active_connections.values()
        )
    }
