from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ReportCreate(BaseModel):
    case_id: str
    title: str
    report_type: str = "INVESTIGATION_DOSSIER"  # INVESTIGATION_DOSSIER, EVIDENCE_INVENTORY, EXECUTIVE_BRIEF


class ReportResponse(BaseModel):
    id: str
    organization_id: str
    case_id: str
    title: str
    report_type: str
    content_markdown: str
    status: str
    cryptographic_seal_hash: Optional[str] = None
    approved_by_id: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
