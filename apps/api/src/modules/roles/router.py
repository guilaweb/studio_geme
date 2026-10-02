from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.database import get_db
from src.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.roles.models import Role, Permission
from src.modules.roles.schemas import RoleResponse, PermissionResponse

router = APIRouter(prefix="", tags=["Roles & Permissions"])


@router.get("/roles", response_model=List[RoleResponse])
def list_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List available RBAC roles."""
    return db.query(Role).order_by(Role.name.asc()).all()


@router.get("/permissions", response_model=List[PermissionResponse])
def list_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List available system permission definitions."""
    return db.query(Permission).order_by(Permission.module.asc(), Permission.code.asc()).all()
