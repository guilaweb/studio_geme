import hashlib
import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
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
from src.modules.evidence.models import Evidence, EvidenceCustodyEvent
from src.modules.evidence.schemas import (
    EvidenceResponse,
    CustodyEventResponse,
    IntegrityVerificationResponse,
)

router = APIRouter(prefix="/evidence", tags=["Evidence"])

STORAGE_ROOT = os.path.abspath("storage")


def compute_sha256(file_path: str) -> str:
    """Compute cryptographic SHA-256 hash of a file on disk."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


@router.post("/upload", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    request: Request,
    case_id: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    source: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Acquire evidence with cryptographic hashing and initial chain of custody entry.
    """
    # Verify case
    case = db.query(Case).filter(Case.id == case_id, Case.organization_id == tenant_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso não encontrado.")

    # Prepare storage directory
    dest_dir = os.path.join(STORAGE_ROOT, "tenants", tenant_id, "cases", case_id)
    os.makedirs(dest_dir, exist_ok=True)

    dest_file_path = os.path.join(dest_dir, f"{os.urandom(8).hex()}_{file.filename}")

    # Stream to disk and compute hash simultaneously
    hasher = hashlib.sha256()
    size = 0
    with open(dest_file_path, "wb") as buffer:
        while chunk := await file.read(65536):
            size += len(chunk)
            hasher.update(chunk)
            buffer.write(chunk)

    sha256_hash = hasher.hexdigest()

    # Create Evidence Record
    evidence = Evidence(
        organization_id=tenant_id,
        case_id=case_id,
        title=title.strip(),
        description=description,
        file_name=file.filename or "evidence.bin",
        file_size=size,
        mime_type=file.content_type or "application/octet-stream",
        storage_path=dest_file_path,
        sha256_hash=sha256_hash,
        source=source,
        version=1,
        status="COLLECTED",
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(evidence)
    db.flush()

    # Create Initial Chain of Custody Record (ACQUISITION)
    custody_event = EvidenceCustodyEvent(
        evidence_id=evidence.id,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="ACQUISITION",
        recorded_hash=sha256_hash,
        notes=f"Evidência adquirida e armazenada. Hash SHA-256 inicial: {sha256_hash}",
        ip_address=get_client_ip(request),
    )
    db.add(custody_event)

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="EVIDENCE_ACQUIRED",
        resource_type="evidence",
        resource_id=evidence.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={
            "case_id": case_id,
            "file_name": evidence.file_name,
            "sha256": sha256_hash,
            "size": size,
        },
    )
    db.commit()
    db.refresh(evidence)
    return evidence


@router.get("", response_model=List[EvidenceResponse])
def list_evidence(
    case_id: str = Query(..., description="Case ID required"),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List all evidence items registered to a case."""
    return (
        db.query(Evidence)
        .filter(Evidence.case_id == case_id, Evidence.organization_id == tenant_id)
        .order_by(Evidence.created_at.desc())
        .all()
    )


@router.get("/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(
    evidence_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Retrieve evidence details and full chain of custody log."""
    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id, Evidence.organization_id == tenant_id)
        .first()
    )
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidência não encontrada.")
    return evidence


@router.post("/{evidence_id}/verify", response_model=IntegrityVerificationResponse)
def verify_evidence_integrity(
    evidence_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Recalculate SHA-256 hash from storage and compare with registered value.
    Appends an INTEGRITY_CHECK event to the chain of custody.
    """
    evidence = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id, Evidence.organization_id == tenant_id)
        .first()
    )
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidência não encontrada.")

    if not os.path.exists(evidence.storage_path):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ficheiro físico de evidência não localizado no armazenamento.",
        )

    computed = compute_sha256(evidence.storage_path)
    is_intact = (computed.lower() == evidence.sha256_hash.lower())

    # Record Custody Event
    action_type = "INTEGRITY_VERIFIED" if is_intact else "INTEGRITY_BREACH_DETECTED"
    custody_event = EvidenceCustodyEvent(
        evidence_id=evidence.id,
        organization_id=tenant_id,
        user_id=current_user.id,
        action=action_type,
        recorded_hash=computed,
        notes="Verificação criptográfica SHA-256 executada com sucesso. Integridade confirmada."
        if is_intact
        else f"ALERTA: O hash do ficheiro ({computed}) difere do registo de custódia ({evidence.sha256_hash}).",
        ip_address=get_client_ip(request),
    )
    db.add(custody_event)

    if is_intact:
        evidence.status = "VERIFIED"
    else:
        evidence.status = "FLAGGED"

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action=action_type,
        resource_type="evidence",
        resource_id=evidence.id,
        severity="INFO" if is_intact else "CRITICAL",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={
            "expected_hash": evidence.sha256_hash,
            "computed_hash": computed,
            "is_valid": is_intact,
        },
    )
    db.commit()

    return IntegrityVerificationResponse(
        evidence_id=evidence.id,
        is_valid=is_intact,
        expected_hash=evidence.sha256_hash,
        computed_hash=computed,
        status="INTEGRIOUS" if is_intact else "COMPROMISED",
        message="A integridade criptográfica da evidência foi comprovada."
        if is_intact
        else "Falha de integridade: O hash do ficheiro armazenado não corresponde ao registo original.",
    )


@router.post("/{evidence_id}/version", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def create_evidence_version(
    evidence_id: str,
    request: Request,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Create a new version of an evidence item without silently overwriting the previous one.
    Maintains complete provenance and version lineage.
    """
    parent = (
        db.query(Evidence)
        .filter(Evidence.id == evidence_id, Evidence.organization_id == tenant_id)
        .first()
    )
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidência anterior não encontrada.")

    # Storage destination
    dest_dir = os.path.join(STORAGE_ROOT, "tenants", tenant_id, "cases", parent.case_id)
    os.makedirs(dest_dir, exist_ok=True)
    dest_file_path = os.path.join(dest_dir, f"v{parent.version + 1}_{os.urandom(8).hex()}_{file.filename}")

    hasher = hashlib.sha256()
    size = 0
    with open(dest_file_path, "wb") as buffer:
        while chunk := await file.read(65536):
            size += len(chunk)
            hasher.update(chunk)
            buffer.write(chunk)

    new_hash = hasher.hexdigest()

    new_version = Evidence(
        organization_id=tenant_id,
        case_id=parent.case_id,
        title=title.strip(),
        description=description or parent.description,
        file_name=file.filename or "evidence.bin",
        file_size=size,
        mime_type=file.content_type or "application/octet-stream",
        storage_path=dest_file_path,
        sha256_hash=new_hash,
        source=parent.source,
        version=parent.version + 1,
        parent_evidence_id=parent.id,
        status="COLLECTED",
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(new_version)
    db.flush()

    # Chain of custody record for version creation
    event = EvidenceCustodyEvent(
        evidence_id=new_version.id,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="VERSION_CREATED",
        recorded_hash=new_hash,
        notes=f"Nova versão (v{new_version.version}) criada a partir de evidência v{parent.version} ({parent.id}).",
        ip_address=get_client_ip(request),
    )
    db.add(event)

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="EVIDENCE_VERSION_CREATED",
        resource_type="evidence",
        resource_id=new_version.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={
            "parent_id": parent.id,
            "version": new_version.version,
            "sha256": new_hash,
        },
    )
    db.commit()
    db.refresh(new_version)
    return new_version
