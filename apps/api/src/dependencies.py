from typing import Generator, Optional
from fastapi import Depends, HTTPException, Header, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from src.database import get_db
from src.common.security import decode_access_token
from src.modules.users.models import User
from src.modules.organizations.models import Organization
from src.modules.roles.models import OrganizationMember, Role, Permission

security_scheme = HTTPBearer(auto_error=False)


def get_client_ip(request: Request) -> Optional[str]:
    """Extract client IP address handling proxies."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate JWT access token and return the authenticated User."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais de autenticação não fornecidas.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acesso inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilizador não encontrado.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta de utilizador inactiva ou suspensa.",
        )

    return user


def get_current_tenant_id(
    request: Request,
    user: User = Depends(get_current_user),
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> str:
    """
    Enforce strict tenant isolation:
    1. Resolve tenant ID from header 'X-Organization-ID' or JWT claim 'org_id'.
    2. Verify user has active membership in that organization (or is superuser).
    """
    tenant_id = x_organization_id
    if not tenant_id and credentials:
        payload = decode_access_token(credentials.credentials)
        if payload:
            tenant_id = payload.get("org_id")

    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contexto de organização obrigatório. Forneça o cabeçalho X-Organization-ID.",
        )

    # Superuser bypass for platform maintenance
    if user.is_superuser:
        org = db.query(Organization).filter(Organization.id == tenant_id).first()
        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organização não encontrada.",
            )
        return tenant_id

    # Verify user is an active member of this organization
    membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == tenant_id,
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == "ACTIVE",
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: Utilizador não pertence a esta organização.",
        )

    return tenant_id


def get_current_member(
    tenant_id: str = Depends(get_current_tenant_id),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrganizationMember:
    """Retrieve the membership details for the current user and tenant."""
    membership = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == tenant_id,
            OrganizationMember.user_id == user.id,
        )
        .first()
    )
    if not membership and user.is_superuser:
        # Create an ephemeral admin representation for superusers
        return None  # Superuser bypass
    return membership


def require_permission(required_permission: str):
    """
    Enforces RBAC permission check within the active organization.
    """
    def permission_checker(
        user: User = Depends(get_current_user),
        tenant_id: str = Depends(get_current_tenant_id),
        member: Optional[OrganizationMember] = Depends(get_current_member),
    ):
        if user.is_superuser:
            return True

        if not member or not member.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão negada: Nenhuma função atribuída na organização.",
            )

        # Check permissions attached to role
        allowed_permissions = {p.code for p in member.role.permissions}
        if required_permission not in allowed_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão insuficiente. Requer: {required_permission}",
            )
        return True

    return permission_checker
