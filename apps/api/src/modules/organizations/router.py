from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from src.database import get_db
from src.common.audit import record_audit_log
from src.common.security import hash_password
from src.dependencies import (
    get_current_user,
    get_current_tenant_id,
    require_permission,
    get_client_ip,
)
from src.modules.users.models import User
from src.modules.organizations.models import Organization
from src.modules.roles.models import Role, OrganizationMember
from src.modules.organizations.schemas import (
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    MemberResponse,
    AddMemberRequest,
)

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new organization/tenant. Caller automatically becomes organization ADMIN."""
    org = Organization(
        name=payload.name.strip(),
        legal_name=payload.legal_name,
        nif=payload.nif,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        municipality=payload.municipality,
        province=payload.province or "Luanda",
        logo_url=payload.logo_url,
        currency=payload.currency or "AOA",
        timezone=payload.timezone or "Africa/Luanda",
        language=payload.language or "pt-AO",
        status="ACTIVE",
        plan="ENTERPRISE",
        settings={},
    )
    db.add(org)
    db.flush()

    # Find or default ADMIN role
    admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
    if not admin_role:
        admin_role = Role(name="ADMIN", description="Administrador da Organização", is_system_role=True)
        db.add(admin_role)
        db.flush()

    # Assign caller as ADMIN
    member = OrganizationMember(
        organization_id=org.id,
        user_id=current_user.id,
        role_id=admin_role.id,
        status="ACTIVE",
    )
    db.add(member)

    # Record Audit
    record_audit_log(
        db=db,
        organization_id=org.id,
        user_id=current_user.id,
        action="ORGANIZATION_CREATE",
        resource_type="organization",
        resource_id=org.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"name": org.name, "nif": org.nif},
    )
    db.commit()
    db.refresh(org)
    return org


@router.get("", response_model=List[OrganizationResponse])
def list_user_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all organizations where the current user has membership."""
    if current_user.is_superuser:
        return db.query(Organization).order_by(Organization.name.asc()).all()

    orgs = (
        db.query(Organization)
        .join(OrganizationMember, OrganizationMember.organization_id == Organization.id)
        .filter(
            OrganizationMember.user_id == current_user.id,
            OrganizationMember.status == "ACTIVE",
            Organization.status == "ACTIVE",
        )
        .order_by(Organization.name.asc())
        .all()
    )
    return orgs


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve details of a specific organization with tenant isolation."""
    # Ensure access
    if not current_user.is_superuser:
        membership = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == current_user.id,
                OrganizationMember.status == "ACTIVE",
            )
            .first()
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: Não pertence a esta organização.",
            )

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organização não encontrada.")
    return org


@router.patch("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: str,
    payload: OrganizationUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update organization settings. Enforces tenant scope and permissions."""
    if org_id != tenant_id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operação entre tenants não permitida.")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organização não encontrada.")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)

    record_audit_log(
        db=db,
        organization_id=org_id,
        user_id=current_user.id,
        action="ORGANIZATION_UPDATE",
        resource_type="organization",
        resource_id=org_id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"updated_fields": list(update_data.keys())},
    )
    db.commit()
    db.refresh(org)
    return org


@router.get("/{org_id}/members", response_model=List[MemberResponse])
def list_members(
    org_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List members of the organization."""
    if org_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operação entre tenants não permitida.")

    members = (
        db.query(OrganizationMember)
        .join(User, User.id == OrganizationMember.user_id)
        .join(Role, Role.id == OrganizationMember.role_id)
        .filter(OrganizationMember.organization_id == org_id)
        .all()
    )

    return [
        MemberResponse(
            id=m.id,
            user_id=m.user.id,
            email=m.user.email,
            full_name=m.user.full_name,
            role_name=m.role.name if m.role else "MEMBER",
            status=m.status,
            created_at=m.created_at,
        )
        for m in members
    ]


@router.post("/{org_id}/members", response_model=MemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(
    org_id: str,
    payload: AddMemberRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Add or invite a member to the organization."""
    if org_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operação entre tenants não permitida.")

    # Find role
    role = db.query(Role).filter(Role.name == payload.role_name.upper()).first()
    if not role:
        role = Role(name=payload.role_name.upper(), description=f"Função {payload.role_name}", is_system_role=False)
        db.add(role)
        db.flush()

    # Find or create user
    email_clean = payload.email.lower().strip()
    target_user = db.query(User).filter(User.email == email_clean).first()
    if not target_user:
        target_user = User(
            email=email_clean,
            hashed_password=hash_password("Profundidade#2026Temp!"),
            full_name=payload.full_name.strip(),
            is_active=True,
            is_superuser=False,
        )
        db.add(target_user)
        db.flush()

    # Check if already member
    existing_member = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == target_user.id,
        )
        .first()
    )
    if existing_member:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Utilizador já é membro desta organização.")

    member = OrganizationMember(
        organization_id=org_id,
        user_id=target_user.id,
        role_id=role.id,
        status="ACTIVE",
    )
    db.add(member)

    record_audit_log(
        db=db,
        organization_id=org_id,
        user_id=current_user.id,
        action="ORGANIZATION_MEMBER_ADD",
        resource_type="organization_member",
        resource_id=member.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"user_email": email_clean, "role": role.name},
    )
    db.commit()
    db.refresh(member)

    return MemberResponse(
        id=member.id,
        user_id=target_user.id,
        email=target_user.email,
        full_name=target_user.full_name,
        role_name=role.name,
        status=member.status,
        created_at=member.created_at,
    )
