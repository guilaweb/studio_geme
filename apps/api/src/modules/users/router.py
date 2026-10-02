from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from src.database import get_db
from src.common.security import hash_password
from src.common.audit import record_audit_log
from src.dependencies import (
    get_current_user,
    get_current_tenant_id,
    require_permission,
    get_client_ip,
)
from src.modules.users.models import User
from src.modules.roles.models import OrganizationMember
from src.modules.users.schemas import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Register a new platform user."""
    email_clean = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma conta associada a este endereço de email.",
        )

    # First user on an empty database becomes superuser
    user_count = db.query(User).count()
    is_super = (user_count == 0)

    user = User(
        email=email_clean,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        is_active=True,
        is_superuser=is_super,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("", response_model=List[UserResponse])
def list_users(
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List users in the current active organization."""
    if current_user.is_superuser:
        return db.query(User).order_by(User.full_name.asc()).all()

    users = (
        db.query(User)
        .join(OrganizationMember, OrganizationMember.user_id == User.id)
        .filter(OrganizationMember.organization_id == tenant_id)
        .order_by(User.full_name.asc())
        .all()
    )
    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Retrieve user details within tenant boundary."""
    # Ensure user belongs to same tenant or current user is superuser
    if not current_user.is_superuser and user_id != current_user.id:
        membership = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == tenant_id,
                OrganizationMember.user_id == user_id,
            )
            .first()
        )
        if not membership:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilizador não encontrado.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilizador não encontrado.")
    return user
