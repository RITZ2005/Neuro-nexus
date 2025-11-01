from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class ChatMessageBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)

class ChatMessageCreate(ChatMessageBase):
    project_id: str

class ChatMessage(ChatMessageBase):
    id: str
    project_id: str
    user_id: str
    user_name: str
    timestamp: datetime
    
    class Config:
        from_attributes = True

class ChatMessageResponse(ChatMessage):
    pass

class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessage]
    count: int
    has_more: bool

class TypingIndicator(BaseModel):
    user_id: str
    user_name: str
    is_typing: bool
