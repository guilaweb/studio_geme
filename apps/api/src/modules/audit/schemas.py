from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    id: str
    organization_id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    severity: str
    ip_address: Optional[str] = None
    details: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
