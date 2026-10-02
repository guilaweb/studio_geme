from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class OrganizationBase(BaseModel):
    name: str
    legal_name: Optional[str] = None
    nif: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    municipality: Optional[str] = None
    province: Optional[str] = "Luanda"
    logo_url: Optional[str] = None
    currency: Optional[str] = "AOA"
    timezone: Optional[str] = "Africa/Luanda"
    language: Optional[str] = "pt-AO"


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    nif: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    municipality: Optional[str] = None
    province: Optional[str] = None
    logo_url: Optional[str] = None
    status: Optional[str] = None
    plan: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class OrganizationResponse(OrganizationBase):
    id: str
    status: str
    plan: str
    settings: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MemberResponse(BaseModel):
    id: str
    user_id: str
    email: str
    full_name: str
    role_name: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AddMemberRequest(BaseModel):
    email: EmailStr
    full_name: str
    role_name: str = "INVESTIGATOR"  # ADMIN, INVESTIGATOR, ANALYST, AUDITOR
