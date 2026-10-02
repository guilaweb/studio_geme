from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from src.database import get_db
from src.common.audit import record_audit_log
from src.dependencies import (
    get_current_user,
    get_current_tenant_id,
    require_permission,
    get_client_ip,
)
from src.modules.users.models import User
from src.modules.cases.models import Case
from src.modules.cases.schemas import (
    CaseCreate,
    CaseUpdate,
    CaseResponse,
    CaseStatsResponse,
)

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(
    payload: CaseCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Create a new investigative case scoped to the active tenant."""
    # Generate sequential case number for this tenant
    year = datetime.now(timezone.utc).year
    count = db.query(Case).filter(Case.organization_id == tenant_id).count() + 1
    case_number = f"CAS-{year}-{count:04d}"

    case = Case(
        organization_id=tenant_id,
        case_number=case_number,
        title=payload.title.strip(),
        description=payload.description,
        priority=payload.priority.upper(),
        status="OPEN",
        tags=payload.tags,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(case)
    db.flush()

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="CASE_CREATE",
        resource_type="case",
        resource_id=case.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"case_number": case.case_number, "title": case.title, "priority": case.priority},
    )
    db.commit()
    db.refresh(case)
    return case


@router.get("", response_model=List[CaseResponse])
def list_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List cases with strict tenant isolation and optional filtering."""
    query = db.query(Case).filter(Case.organization_id == tenant_id)

    if status_filter:
        query = query.filter(Case.status == status_filter.upper())
    if priority_filter:
        query = query.filter(Case.priority == priority_filter.upper())
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Case.title.ilike(search_fmt)) | (Case.case_number.ilike(search_fmt))
        )

    return query.order_by(Case.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/stats", response_model=CaseStatsResponse)
def get_case_statistics(
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Calculate REAL, non-mock operational case metrics for the active tenant."""
    base_q = db.query(Case).filter(Case.organization_id == tenant_id)

    total = base_q.count()
    open_count = base_q.filter(Case.status == "OPEN").count()
    active_count = base_q.filter(Case.status == "ACTIVE").count()
    pending_count = base_q.filter(Case.status == "PENDING_REVIEW").count()
    closed_count = base_q.filter(Case.status == "CLOSED").count()
    high_prio = base_q.filter(Case.priority.in_(["HIGH", "CRITICAL"])).count()

    return CaseStatsResponse(
        total_cases=total,
        open_cases=open_count,
        active_cases=active_count,
        pending_review=pending_count,
        closed_cases=closed_count,
        high_priority=high_prio,
    )


@router.get("/{case_id}", response_model=CaseResponse)
def get_case(
    case_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Fetch single case enforcing tenant boundary."""
    case = (
        db.query(Case)
        .filter(Case.id == case_id, Case.organization_id == tenant_id)
        .first()
    )
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Caso não encontrado na organização activa.",
        )
    return case


@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(
    case_id: str,
    payload: CaseUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update case metadata, status or priority with audit logging."""
    case = (
        db.query(Case)
        .filter(Case.id == case_id, Case.organization_id == tenant_id)
        .first()
    )
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso não encontrado.")

    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        if field == "priority" and val:
            val = val.upper()
        if field == "status" and val:
            val = val.upper()
        setattr(case, field, val)

    case.updated_by_id = current_user.id

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="CASE_UPDATE",
        resource_type="case",
        resource_id=case.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"modified_fields": list(data.keys())},
    )
    db.commit()
    db.refresh(case)
    return case


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(
    case_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Delete a case within the tenant, cascading to its sub-resources."""
    case = (
        db.query(Case)
        .filter(Case.id == case_id, Case.organization_id == tenant_id)
        .first()
    )
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso não encontrado.")

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="CASE_DELETE",
        resource_type="case",
        resource_id=case.id,
        severity="WARNING",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"case_number": case.case_number, "title": case.title},
    )
    db.delete(case)
    db.commit()
    return None
