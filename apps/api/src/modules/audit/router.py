from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.dependencies import (
    get_current_tenant_id,
    require_permission,
)
from src.modules.users.models import User
from src.modules.audit.models import AuditLog
from src.modules.audit.schemas import AuditLogResponse

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Retrieve immutable audit trail records scoped strictly to active organization."""
    query = (
        db.query(AuditLog, User.email.label("user_email"))
        .outerjoin(User, User.id == AuditLog.user_id)
        .filter(AuditLog.organization_id == tenant_id)
    )

    if action:
        query = query.filter(AuditLog.action == action.upper())
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type.lower())
    if severity:
        query = query.filter(AuditLog.severity == severity.upper())

    results = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    response = []
    for log_item, u_email in results:
        response.append(
            AuditLogResponse(
                id=log_item.id,
                organization_id=log_item.organization_id,
                user_id=log_item.user_id,
                user_email=u_email,
                action=log_item.action,
                resource_type=log_item.resource_type,
                resource_id=log_item.resource_id,
                severity=log_item.severity,
                ip_address=log_item.ip_address,
                details=log_item.details or {},
                created_at=log_item.created_at,
            )
        )
    return response
