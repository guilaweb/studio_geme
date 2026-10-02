import hashlib
from datetime import datetime, timezone
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
from src.modules.entities.models import Entity
from src.modules.relationships.models import Relationship
from src.modules.evidence.models import Evidence
from src.modules.reports.models import Report
from src.modules.reports.schemas import ReportCreate, ReportResponse

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(
    payload: ReportCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Compile a formal, audit-ready investigation report synthesizing live case facts,
    entities, evidence hash tables, and relationships without mock data.
    """
    case = db.query(Case).filter(Case.id == payload.case_id, Case.organization_id == tenant_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso não encontrado.")

    entities = db.query(Entity).filter(Entity.case_id == payload.case_id, Entity.organization_id == tenant_id).all()
    relationships = db.query(Relationship).filter(Relationship.case_id == payload.case_id, Relationship.organization_id == tenant_id).all()
    evidence_items = db.query(Evidence).filter(Evidence.case_id == payload.case_id, Evidence.organization_id == tenant_id).all()

    now_str = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M:%S UTC")

    # Generate Markdown Dossier
    md_lines = [
        f"# PROFUNDIDADE - RELATÓRIO DE INVESTIGAÇÃO",
        f"**Caso:** {case.case_number} - {case.title}",
        f"**Classificação:** {case.priority} | **Estado:** {case.status}",
        f"**Data de Geração:** {now_str}",
        f"**Investigador Responsável:** {current_user.full_name} ({current_user.email})",
        "",
        "---",
        "## 1. RESUMO OPERACIONAL",
        case.description or "Sem descrição operacional arquivada.",
        "",
        "---",
        f"## 2. INVENTÁRIO DE ENTIDADES IDENTIFICADAS ({len(entities)})",
    ]

    if not entities:
        md_lines.append("*Nenhuma entidade cadastrada neste caso.*")
    else:
        md_lines.append("| Nome | Tipo | Identificador | Risco | Estado |")
        md_lines.append("| :--- | :--- | :--- | :--- | :--- |")
        for e in entities:
            md_lines.append(f"| {e.name} | {e.type} | {e.identifier or 'N/A'} | {e.risk_score} | {e.status} |")

    md_lines.extend([
        "",
        "---",
        f"## 3. VÍNCULOS E RELACIONAMENTOS ({len(relationships)})",
    ])

    if not relationships:
        md_lines.append("*Nenhum relacionamento formalmente documentado.*")
    else:
        ent_map = {e.id: e.name for e in entities}
        md_lines.append("| Origem | Tipo de Relação | Destino | Confiança | Origem SI |")
        md_lines.append("| :--- | :--- | :--- | :--- | :--- |")
        for r in relationships:
            src_name = ent_map.get(r.source_entity_id, "Desconhecido")
            tgt_name = ent_map.get(r.target_entity_id, "Desconhecido")
            si_flag = "Sim (Validado)" if r.is_inferred_by_si else "Não"
            md_lines.append(f"| {src_name} | {r.relation_type} | {tgt_name} | {r.confidence} | {si_flag} |")

    md_lines.extend([
        "",
        "---",
        f"## 4. CUSTÓDIA DE EVIDÊNCIAS E HASHES CRIPTOGRÁFICOS ({len(evidence_items)})",
    ])

    if not evidence_items:
        md_lines.append("*Nenhuma evidência física ou digital anexada.*")
    else:
        md_lines.append("| Ficheiro | Versão | Tamanho | Hash SHA-256 | Estado |")
        md_lines.append("| :--- | :--- | :--- | :--- | :--- |")
        for ev in evidence_items:
            md_lines.append(f"| {ev.file_name} | v{ev.version} | {ev.file_size} B | `{ev.sha256_hash}` | {ev.status} |")

    md_lines.extend([
        "",
        "---",
        "## 5. DECLARAÇÃO DE CONFORMIDADE E INTEGRIDADE",
        "> Os registos contidos neste dossier foram extraídos do banco de dados operacional da plataforma PROFUNDIDADE, sob cadeia de custódia ininterrupta e trilha de auditoria imutável.",
    ])

    content_markdown = "\n".join(md_lines)

    report = Report(
        organization_id=tenant_id,
        case_id=payload.case_id,
        title=payload.title.strip(),
        report_type=payload.report_type.upper(),
        content_markdown=content_markdown,
        status="DRAFT",
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(report)
    db.flush()

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="REPORT_GENERATED",
        resource_type="report",
        resource_id=report.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"case_id": payload.case_id, "type": report.report_type},
    )
    db.commit()
    db.refresh(report)
    return report


@router.get("", response_model=List[ReportResponse])
def list_reports(
    case_id: str = Query(...),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    return (
        db.query(Report)
        .filter(Report.case_id == case_id, Report.organization_id == tenant_id)
        .order_by(Report.created_at.desc())
        .all()
    )


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    report = db.query(Report).filter(Report.id == report_id, Report.organization_id == tenant_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relatório não encontrado.")
    return report


@router.post("/{report_id}/seal", response_model=ReportResponse)
def seal_report(
    report_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Cryptographically seal a final report.
    Computes an immutable SHA-256 seal over the dossier content and locks modifications.
    """
    report = db.query(Report).filter(Report.id == report_id, Report.organization_id == tenant_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relatório não encontrado.")

    if report.status == "SEALED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este relatório já se encontra selado.")

    now = datetime.now(timezone.utc)
    seal_payload = f"{report.content_markdown}:{now.isoformat()}:{current_user.id}"
    seal_hash = hashlib.sha256(seal_payload.encode("utf-8")).hexdigest()

    report.status = "SEALED"
    report.cryptographic_seal_hash = seal_hash
    report.approved_by_id = current_user.id
    report.approved_at = now
    report.updated_by_id = current_user.id

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="REPORT_SEALED",
        resource_type="report",
        resource_id=report.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"seal_hash": seal_hash},
    )
    db.commit()
    db.refresh(report)
    return report
