from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from src.database import get_db
from src.common.security import verify_password, create_access_token
from src.common.audit import record_audit_log
from src.dependencies import get_current_user, get_client_ip
from src.modules.users.models import User
from src.modules.organizations.models import Organization
from src.modules.roles.models import OrganizationMember
from src.modules.authentication.schemas import (
    LoginRequest,
    TokenResponse,
    SelectTenantRequest,
    CurrentUserResponse,
    UserSummary,
    OrgSummary,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Authenticate user with email/password and return JWT token + tenant memberships."""
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas. Verifique o email e a palavra-passe.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta de utilizador inactiva ou suspensa.",
        )

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    # Query active organization memberships
    memberships = (
        db.query(OrganizationMember)
        .join(Organization, Organization.id == OrganizationMember.organization_id)
        .filter(
            OrganizationMember.user_id == user.id,
            OrganizationMember.status == "ACTIVE",
            Organization.status == "ACTIVE",
        )
        .all()
    )

    org_summaries = []
    active_org_id = None
    user_roles = []

    for m in memberships:
        org_summaries.append(
            OrgSummary(
                id=m.organization.id,
                name=m.organization.name,
                role_name=m.role.name if m.role else "MEMBER",
                status=m.status,
            )
        )

    if org_summaries:
        active_org_id = org_summaries[0].id
        user_roles = [memberships[0].role.name] if memberships[0].role else []

    # Issue JWT token
    token = create_access_token(
        subject=user.id,
        organization_id=active_org_id,
        roles=user_roles,
    )

    # Record login audit if active org exists
    if active_org_id:
        record_audit_log(
            db=db,
            organization_id=active_org_id,
            user_id=user.id,
            action="AUTH_LOGIN",
            resource_type="user",
            resource_id=user.id,
            severity="INFO",
            ip_address=get_client_ip(request),
            user_agent=request.headers.get("user-agent"),
            details={"email": user.email},
        )
        db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserSummary(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_superuser=user.is_superuser,
        ),
        organizations=org_summaries,
        active_organization_id=active_org_id,
    )


@router.post("/select-tenant", response_model=TokenResponse)
def select_tenant(
    payload: SelectTenantRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Switch active tenant and obtain an updated tenant-scoped token."""
    # Verify user belongs to the requested organization
    membership = (
        db.query(OrganizationMember)
        .join(Organization, Organization.id == OrganizationMember.organization_id)
        .filter(
            OrganizationMember.organization_id == payload.organization_id,
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.status == "ACTIVE",
            Organization.status == "ACTIVE",
        )
        .first()
    )

    if not membership and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado à organização solicitada.",
        )

    roles = [membership.role.name] if membership and membership.role else []
    token = create_access_token(
        subject=current_user.id,
        organization_id=payload.organization_id,
        roles=roles,
    )

    # Re-fetch all organizations
    memberships = (
        db.query(OrganizationMember)
        .join(Organization, Organization.id == OrganizationMember.organization_id)
        .filter(
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.status == "ACTIVE",
        )
        .all()
    )

    org_summaries = [
        OrgSummary(
            id=m.organization.id,
            name=m.organization.name,
            role_name=m.role.name if m.role else "MEMBER",
            status=m.status,
        )
        for m in memberships
    ]

    record_audit_log(
        db=db,
        organization_id=payload.organization_id,
        user_id=current_user.id,
        action="AUTH_TENANT_SWITCH",
        resource_type="organization",
        resource_id=payload.organization_id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"target_organization_id": payload.organization_id},
    )
    db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserSummary(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            is_superuser=current_user.is_superuser,
        ),
        organizations=org_summaries,
        active_organization_id=payload.organization_id,
    )


@router.get("/me", response_model=CurrentUserResponse)
def get_me(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current authenticated user info, active organization context and permissions."""
    active_org_id = request.headers.get("X-Organization-ID")
    active_summary = None
    permissions = []

    if active_org_id:
        membership = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == active_org_id,
                OrganizationMember.user_id == current_user.id,
                OrganizationMember.status == "ACTIVE",
            )
            .first()
        )
        if membership:
            active_summary = OrgSummary(
                id=membership.organization.id,
                name=membership.organization.name,
                role_name=membership.role.name if membership.role else "MEMBER",
                status=membership.status,
            )
            if membership.role:
                permissions = [p.code for p in membership.role.permissions]

    return CurrentUserResponse(
        user=UserSummary(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            is_superuser=current_user.is_superuser,
        ),
        active_organization=active_summary,
        permissions=permissions,
    )
