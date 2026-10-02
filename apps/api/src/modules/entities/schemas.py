from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class EntityBase(BaseModel):
    case_id: Optional[str] = None
    type: str  # INDIVIDUAL, ORGANIZATION, VEHICLE, BANK_ACCOUNT, PHONE, EMAIL, LOCATION, DOCUMENT
    name: str
    identifier: Optional[str] = None
    risk_score: float = 0.0
    attributes: Dict[str, Any] = {}


class EntityCreate(EntityBase):
    pass


class EntityUpdate(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    identifier: Optional[str] = None
    risk_score: Optional[float] = None
    status: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None


class EntityResponse(EntityBase):
    id: str
    organization_id: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
