from datetime import datetime, timezone
from typing import List, Optional
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
from src.modules.si.models import SiInference
from src.modules.si.schemas import (
    SiGenerateRequest,
    SiValidateRequest,
    SiInferenceResponse,
)

router = APIRouter(prefix="/si", tags=["SI (Sistema de Inteligência)"])


@router.post("/generate", response_model=List[SiInferenceResponse], status_code=status.HTTP_201_CREATED)
def generate_inferences(
    payload: SiGenerateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Generate automated intelligence inferences.
    Every output is explicitly marked as automated and unconfirmed, pending human verification.
    """
    case = db.query(Case).filter(Case.id == payload.case_id, Case.organization_id == tenant_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso não encontrado.")

    entities = db.query(Entity).filter(Entity.case_id == payload.case_id, Entity.organization_id == tenant_id).all()
    existing_rels = db.query(Relationship).filter(Relationship.case_id == payload.case_id, Relationship.organization_id == tenant_id).all()

    inferences_created = []

    # Rule-based analytical inference engine:
    # 1. Detect matching identifiers across entities (e.g. shared address, phone, NIF)
    for i, e1 in enumerate(entities):
        for e2 in entities[i + 1:]:
            # Check if both have identifier and match
            if e1.identifier and e2.identifier and e1.identifier.lower().strip() == e2.identifier.lower().strip():
                inf = SiInference(
                    organization_id=tenant_id,
                    case_id=case.id,
                    inference_type="MATCHING_IDENTIFIER_CORRELATION",
                    title=f"Identificador Comum: {e1.name} e {e2.name}",
                    explanation=(
                        f"A SI detectou que '{e1.name}' ({e1.type}) e '{e2.name}' ({e2.type}) "
                        f"partilham o mesmo identificador fiscal/documental: '{e1.identifier}'. "
                        "Esta hipótese necessita de validação pelo investigador."
                    ),
                    payload={
                        "source_entity_id": e1.id,
                        "target_entity_id": e2.id,
                        "shared_identifier": e1.identifier,
                        "suggested_relation": "ASSOCIATE_OF",
                    },
                    confidence_score=0.92,
                    is_automated=True,
                    human_validation_status="PENDING",
                    created_by_id=current_user.id,
                    updated_by_id=current_user.id,
                )
                db.add(inf)
                inferences_created.append(inf)

    # 2. Anomaly detection: High risk entities with zero recorded relationships
    rel_entity_ids = set()
    for r in existing_rels:
        rel_entity_ids.add(r.source_entity_id)
        rel_entity_ids.add(r.target_entity_id)

    for e in entities:
        if e.risk_score >= 0.7 and e.id not in rel_entity_ids:
            inf = SiInference(
                organization_id=tenant_id,
                case_id=case.id,
                inference_type="ISOLATED_HIGH_RISK_ENTITY",
                title=f"Entidade Crítica Desconectada: {e.name}",
                explanation=(
                    f"A entidade '{e.name}' tem pontuação de risco elevada ({e.risk_score}) mas "
                    "não possui nenhuma ligação ou transacção documentada no caso. "
                    "Recomenda-se inquirição ou investigação de vínculos societários."
                ),
                payload={"entity_id": e.id, "risk_score": e.risk_score},
                confidence_score=0.85,
                is_automated=True,
                human_validation_status="PENDING",
                created_by_id=current_user.id,
                updated_by_id=current_user.id,
            )
            db.add(inf)
            inferences_created.append(inf)

    if inferences_created:
        db.flush()
        record_audit_log(
            db=db,
            organization_id=tenant_id,
            user_id=current_user.id,
            action="SI_INFERENCES_GENERATED",
            resource_type="case",
            resource_id=case.id,
            severity="INFO",
            ip_address=get_client_ip(request),
            user_agent=request.headers.get("user-agent"),
            details={"count": len(inferences_created), "focus": payload.focus_area},
        )
        db.commit()
        for inf in inferences_created:
            db.refresh(inf)

    return inferences_created


@router.get("/inferences", response_model=List[SiInferenceResponse])
def list_inferences(
    case_id: str = Query(...),
    validation_status: Optional[str] = Query(None),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Retrieve intelligence inferences for a case."""
    q = db.query(SiInference).filter(SiInference.case_id == case_id, SiInference.organization_id == tenant_id)
    if validation_status:
        q = q.filter(SiInference.human_validation_status == validation_status.upper())
    return q.order_by(SiInference.created_at.desc()).all()


@router.post("/inferences/{inference_id}/validate", response_model=SiInferenceResponse)
def validate_inference(
    inference_id: str,
    payload: SiValidateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Human-in-the-loop review of an AI inference.
    If confirmed, optionally establishes confirmed relationships in the database.
    """
    inf = db.query(SiInference).filter(SiInference.id == inference_id, SiInference.organization_id == tenant_id).first()
    if not inf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inferência não encontrada.")

    vstatus = payload.validation_status.upper()
    if vstatus not in ["CONFIRMED", "REJECTED"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Estado deve ser CONFIRMED ou REJECTED.")

    inf.human_validation_status = vstatus
    inf.validated_by_id = current_user.id
    inf.validated_at = datetime.now(timezone.utc)
    inf.validation_rationale = payload.rationale.strip()

    # If confirmed and it is a relationship suggestion, promote into actual Relationship
    if vstatus == "CONFIRMED" and inf.inference_type == "MATCHING_IDENTIFIER_CORRELATION":
        p = inf.payload
        src_id = p.get("source_entity_id")
        tgt_id = p.get("target_entity_id")
        rel_type = p.get("suggested_relation", "ASSOCIATE_OF")
        if src_id and tgt_id:
            rel = Relationship(
                organization_id=tenant_id,
                case_id=inf.case_id,
                source_entity_id=src_id,
                target_entity_id=tgt_id,
                relation_type=rel_type,
                confidence=inf.confidence_score,
                is_inferred_by_si=True,
                notes=f"Validado por {current_user.full_name}: {payload.rationale}",
                created_by_id=current_user.id,
                updated_by_id=current_user.id,
            )
            db.add(rel)

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="SI_INFERENCE_VALIDATED",
        resource_type="si_inference",
        resource_id=inf.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={
            "status": vstatus,
            "inference_title": inf.title,
            "rationale": payload.rationale,
        },
    )
    db.commit()
    db.refresh(inf)
    return inf
