from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class CaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    tags: List[str] = []


class CaseCreate(CaseBase):
    pass


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None  # OPEN, ACTIVE, PENDING_REVIEW, CLOSED, ARCHIVED
    tags: Optional[List[str]] = None


class CaseResponse(CaseBase):
    id: str
    organization_id: str
    case_number: str
    status: str
    created_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CaseStatsResponse(BaseModel):
    total_cases: int
    open_cases: int
    active_cases: int
    pending_review: int
    closed_cases: int
    high_priority: int
