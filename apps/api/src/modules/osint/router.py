import socket
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from src.database import get_db
from src.common.audit import record_audit_log
from src.dependencies import (
    get_current_user,
    get_current_tenant_id,
    get_client_ip,
)
from src.modules.users.models import User
from src.modules.cases.models import Case
from src.modules.osint.models import OsintTarget
from src.modules.osint.schemas import OsintTargetCreate, OsintTargetResponse

router = APIRouter(prefix="/osint", tags=["OSINT"])


@router.post("/query", response_model=OsintTargetResponse, status_code=status.HTTP_201_CREATED)
def execute_osint_query(
    payload: OsintTargetCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Perform OSINT query. Executes real network lookup for DNS/IP or explicitly flags
    unconfigured third-party integrations (Rule 18: No fake integrations).
    """
    case = db.query(Case).filter(Case.id == payload.case_id, Case.organization_id == tenant_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso não encontrado.")

    qtype = payload.query_type.upper()
    val = payload.query_value.strip()

    status_str = "PENDING"
    results = {}
    err_msg = None

    if qtype in ["DOMAIN", "DNS"]:
        try:
            # Real DNS resolution
            ip_list = socket.gethostbyname_ex(val)
            results = {
                "canonical_name": ip_list[0],
                "aliases": ip_list[1],
                "resolved_ips": ip_list[2],
            }
            status_str = "COMPLETED"
        except socket.gaierror as e:
            status_str = "FAILED"
            err_msg = f"Resolução de DNS falhou: {str(e)}"
    elif qtype == "IP":
        try:
            host_info = socket.gethostbyaddr(val)
            results = {
                "hostname": host_info[0],
                "aliases": host_info[1],
                "ip_addresses": host_info[2],
            }
            status_str = "COMPLETED"
        except socket.herror as e:
            status_str = "FAILED"
            err_msg = f"Resolução reversa de IP falhou: {str(e)}"
    else:
        # Third party APIs (e.g. Angola AGT NIF Portal, Commercial Registry, Social)
        status_str = "NOT_CONFIGURED"
        err_msg = (
            f"O conector de integração externa para '{qtype}' ainda não está configurado "
            "com chaves de API corporativas neste ambiente de produção."
        )

    target = OsintTarget(
        organization_id=tenant_id,
        case_id=payload.case_id,
        query_type=qtype,
        query_value=val,
        status=status_str,
        results=results,
        error_message=err_msg,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(target)
    db.flush()

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="OSINT_QUERY_EXECUTED",
        resource_type="osint_target",
        resource_id=target.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"type": qtype, "value": val, "status": status_str},
    )
    db.commit()
    db.refresh(target)
    return target


@router.get("/targets", response_model=List[OsintTargetResponse])
def list_osint_targets(
    case_id: str = Query(...),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List OSINT lookups performed within this case."""
    return (
        db.query(OsintTarget)
        .filter(OsintTarget.case_id == case_id, OsintTarget.organization_id == tenant_id)
        .order_by(OsintTarget.created_at.desc())
        .all()
    )
