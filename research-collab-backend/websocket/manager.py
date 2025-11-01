from typing import Dict, Set, Optional
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Manages WebSocket connections for real-time collaboration.
    Tracks connections per room (document or chat) and user presence.
    """
    
    def __init__(self):
        # Room ID -> Set of active WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        
        # Room ID -> User ID -> User info (name, color, status)
        self.user_presence: Dict[str, Dict[str, dict]] = {}
        
        # WebSocket -> (room_id, user_id) for cleanup
        self.connection_registry: Dict[WebSocket, tuple] = {}
    
    async def connect(
        self, 
        websocket: WebSocket, 
        room_id: str, 
        user_id: str,
        user_name: str = "Anonymous",
        user_color: str = "#3b82f6"
    ):
        """
        Accept WebSocket connection and add to room.
        """
        await websocket.accept()
        
        # Add connection to room
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
        self.active_connections[room_id].add(websocket)
        
        # Register user presence
        if room_id not in self.user_presence:
            self.user_presence[room_id] = {}
        
        self.user_presence[room_id][user_id] = {
            "name": user_name,
            "color": user_color,
            "status": "online"
        }
        
        # Register for cleanup
        self.connection_registry[websocket] = (room_id, user_id)
        
        logger.info(f"User {user_id} ({user_name}) connected to room {room_id}")
        
        # Notify others about new user
        await self.broadcast(room_id, {
            "type": "user_joined",
            "user_id": user_id,
            "user_name": user_name,
            "user_color": user_color
        }, exclude=websocket)
        
        # Send current presence to new user
        await websocket.send_json({
            "type": "presence",
            "users": self.user_presence[room_id]
        })
    
    def disconnect(self, websocket: WebSocket):
        """
        Remove WebSocket connection and clean up user presence.
        """
        if websocket not in self.connection_registry:
            return
        
        room_id, user_id = self.connection_registry[websocket]
        
        # Remove connection
        if room_id in self.active_connections:
            self.active_connections[room_id].discard(websocket)
            
            # Clean up empty rooms
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
        
        # Remove user presence
        if room_id in self.user_presence and user_id in self.user_presence[room_id]:
            user_name = self.user_presence[room_id][user_id].get("name", "Anonymous")
            del self.user_presence[room_id][user_id]
            
            # Clean up empty presence
            if not self.user_presence[room_id]:
                del self.user_presence[room_id]
            
            logger.info(f"User {user_id} ({user_name}) disconnected from room {room_id}")
            
            # Notify others about user leaving (only if room still exists)
            if room_id in self.active_connections:
                import asyncio
                asyncio.create_task(
                    self.broadcast(room_id, {
                        "type": "user_left",
                        "user_id": user_id,
                        "user_name": user_name
                    })
                )
        
        # Remove from registry
        del self.connection_registry[websocket]
    
    async def broadcast(
        self, 
        room_id: str, 
        message: dict,
        exclude: Optional[WebSocket] = None
    ):
        """
        Broadcast message to all connections in a room.
        Optionally exclude a specific connection (e.g., sender).
        """
        if room_id not in self.active_connections:
            return
        
        # Send to all connections except excluded one
        dead_connections = []
        for connection in self.active_connections[room_id]:
            if connection != exclude:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to connection: {e}")
                    dead_connections.append(connection)
        
        # Clean up dead connections
        for connection in dead_connections:
            self.disconnect(connection)
    
    async def send_to_user(
        self, 
        room_id: str, 
        user_id: str, 
        message: dict
    ):
        """
        Send message to a specific user in a room.
        """
        if room_id not in self.active_connections:
            return
        
        # Find connections for this user
        for connection, (conn_room_id, conn_user_id) in self.connection_registry.items():
            if conn_room_id == room_id and conn_user_id == user_id:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}: {e}")
                    self.disconnect(connection)
    
    def get_room_users(self, room_id: str) -> Dict[str, dict]:
        """
        Get all users currently in a room.
        """
        return self.user_presence.get(room_id, {})
    
    def get_connection_count(self, room_id: str) -> int:
        """
        Get number of active connections in a room.
        """
        return len(self.active_connections.get(room_id, set()))


# Global connection manager instance
manager = ConnectionManager()
