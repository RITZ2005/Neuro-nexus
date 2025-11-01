# schemas/document.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ==================== DOCUMENT MODELS ====================

class DocumentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = ""
    project_id: str
    document_type: Optional[str] = "tiptap"  # "tiptap" or "latex"

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None

class DocumentResponse(BaseModel):
    id: str
    title: str
    content: str
    project_id: str
    created_by: str
    created_by_name: str
    created_at: datetime
    updated_at: datetime
    version: int
    last_edited_by: str
    last_edited_by_name: str
    document_type: Optional[str] = "tiptap"  # "tiptap" or "latex"

class DocumentListItem(BaseModel):
    id: str
    title: str
    project_id: str
    created_by_name: str
    created_at: datetime
    updated_at: datetime
    version: int
    last_edited_by_name: str
    document_type: Optional[str] = "tiptap"  # "tiptap" or "latex"

class DocumentVersion(BaseModel):
    id: str
    document_id: str
    version: int
    title: str
    content: str
    created_by: str
    created_by_name: str
    created_at: datetime
    change_description: Optional[str] = None

class CreateVersionSnapshot(BaseModel):
    document_id: str
    change_description: Optional[str] = "Manual snapshot"

class RestoreVersion(BaseModel):
    document_id: str
    version_id: str

# Response Models
class DocumentsListResponse(BaseModel):
    documents: List[DocumentListItem]
    count: int

class VersionsListResponse(BaseModel):
    versions: List[DocumentVersion]
    count: int

# ==================== TEMPLATE MODELS ====================

class TemplateBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    content: str = ""
    category: str = Field(default="general")  # research, lab, meeting, general
    is_predefined: bool = False

class TemplateCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    content: str = ""
    category: str = Field(default="general")

class TemplateResponse(BaseModel):
    id: str
    title: str
    description: str
    content: str
    category: str
    is_predefined: bool
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime

class TemplateListItem(BaseModel):
    id: str
    title: str
    description: str
    category: str
    is_predefined: bool
    created_by_name: Optional[str] = None

class CreateFromTemplate(BaseModel):
    template_id: str
    project_id: str
    title: Optional[str] = None  # Override template title if provided

class TemplatesListResponse(BaseModel):
    templates: List[TemplateListItem]
    count: int
