from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class OsintTargetCreate(BaseModel):
    case_id: str
    query_type: str  # DOMAIN, IP, DNS, WHOIS, NIF, PHONE, EMAIL
    query_value: str


class OsintTargetResponse(BaseModel):
    id: str
    organization_id: str
    case_id: str
    query_type: str
    query_value: str
    status: str  # PENDING, COMPLETED, NOT_CONFIGURED, FAILED
    results: Dict[str, Any]
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
