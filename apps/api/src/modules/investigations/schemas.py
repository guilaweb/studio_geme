from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TaskCreate(BaseModel):
    case_id: str
    title: str
    description: Optional[str] = None
    assigned_to_id: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to_id: Optional[str] = None
    due_date: Optional[datetime] = None


class TaskResponse(BaseModel):
    id: str
    organization_id: str
    case_id: str
    title: str
    description: Optional[str] = None
    status: str
    assigned_to_id: Optional[str] = None
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NoteCreate(BaseModel):
    case_id: str
    content: str


class NoteResponse(BaseModel):
    id: str
    organization_id: str
    case_id: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
