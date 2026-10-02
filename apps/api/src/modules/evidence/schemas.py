from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class CustodyEventResponse(BaseModel):
    id: str
    action: str
    recorded_hash: str
    notes: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EvidenceCreate(BaseModel):
    case_id: str
    title: str
    description: Optional[str] = None
    file_name: str
    file_size: int
    mime_type: str
    storage_path: str
    sha256_hash: str
    source: Optional[str] = None


class EvidenceResponse(BaseModel):
    id: str
    organization_id: str
    case_id: str
    title: str
    description: Optional[str] = None
    file_name: str
    file_size: int
    mime_type: str
    storage_path: str
    sha256_hash: str
    source: Optional[str] = None
    version: int
    parent_evidence_id: Optional[str] = None
    status: str
    collected_at: datetime
    created_at: datetime
    custody_events: List[CustodyEventResponse] = []

    model_config = ConfigDict(from_attributes=True)


class IntegrityVerificationResponse(BaseModel):
    evidence_id: str
    is_valid: bool
    expected_hash: str
    computed_hash: str
    status: str
    message: str
