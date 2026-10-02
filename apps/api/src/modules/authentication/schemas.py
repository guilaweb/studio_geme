from typing import List, Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OrgSummary(BaseModel):
    id: str
    name: str
    role_name: str
    status: str


class UserSummary(BaseModel):
    id: str
    email: str
    full_name: str
    is_superuser: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSummary
    organizations: List[OrgSummary]
    active_organization_id: Optional[str] = None


class SelectTenantRequest(BaseModel):
    organization_id: str


class CurrentUserResponse(BaseModel):
    user: UserSummary
    active_organization: Optional[OrgSummary] = None
    permissions: List[str] = []
