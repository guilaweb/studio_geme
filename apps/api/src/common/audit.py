from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from src.modules.audit.models import AuditLog


def record_audit_log(
    db: Session,
    organization_id: str,
    action: str,
    user_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    severity: str = "INFO",
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """
    Append-only security and operational audit logging.
    Records every sensitive operation with organization context and metadata.
    """
    entry = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        severity=severity,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details or {},
    )
    db.add(entry)
    db.flush()
    return entry
