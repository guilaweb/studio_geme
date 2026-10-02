from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class PermissionResponse(BaseModel):
    id: str
    code: str
    description: str
    module: str

    model_config = ConfigDict(from_attributes=True)


class RoleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_system_role: bool
    permissions: List[PermissionResponse] = []

    model_config = ConfigDict(from_attributes=True)
