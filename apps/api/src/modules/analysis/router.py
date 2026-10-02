from collections import defaultdict
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
from src.modules.analysis.models import AnalysisRun
from src.modules.analysis.schemas import AnalysisRunCreate, AnalysisRunResponse

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.post("/run", response_model=AnalysisRunResponse, status_code=status.HTTP_201_CREATED)
def run_analysis(
    payload: AnalysisRunCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Execute deterministic analytical algorithms over actual case entities and links.
    Calculates network degree centrality, cluster density, or risk scoring from live DB data.
    """
    case = db.query(Case).filter(Case.id == payload.case_id, Case.organization_id == tenant_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso não encontrado.")

    entities = db.query(Entity).filter(Entity.case_id == payload.case_id, Entity.organization_id == tenant_id).all()
    relationships = db.query(Relationship).filter(Relationship.case_id == payload.case_id, Relationship.organization_id == tenant_id).all()

    atype = payload.analysis_type.upper()
    results = {}
    summary = ""

    if atype == "NETWORK_METRICS":
        # Calculate in-degree / out-degree and centrality for every entity
        degree_map = defaultdict(int)
        for r in relationships:
            degree_map[r.source_entity_id] += 1
            degree_map[r.target_entity_id] += 1

        entity_lookup = {e.id: e.name for e in entities}
        ranked_nodes = sorted(
            [{"id": eid, "name": entity_lookup.get(eid, "Desconhecido"), "connections": deg} for eid, deg in degree_map.items()],
            key=lambda x: x["connections"],
            reverse=True,
        )

        results = {
            "total_nodes": len(entities),
            "total_edges": len(relationships),
            "density": (2 * len(relationships)) / (len(entities) * (len(entities) - 1)) if len(entities) > 1 else 0.0,
            "most_connected_entities": ranked_nodes[:5],
        }
        summary = f"Grafo analisado com {len(entities)} entidades e {len(relationships)} relacionamentos registados."

    elif atype == "RISK_ASSESSMENT":
        high_risk = [e for e in entities if e.risk_score >= 0.7]
        med_risk = [e for e in entities if 0.3 <= e.risk_score < 0.7]
        low_risk = [e for e in entities if e.risk_score < 0.3]

        results = {
            "high_risk_count": len(high_risk),
            "medium_risk_count": len(med_risk),
            "low_risk_count": len(low_risk),
            "critical_entities": [{"id": e.id, "name": e.name, "score": e.risk_score, "type": e.type} for e in high_risk],
        }
        summary = f"Avaliação de risco concluída: {len(high_risk)} entidades de alto risco identificadas."

    else:
        results = {
            "entity_count": len(entities),
            "relationship_count": len(relationships),
        }
        summary = f"Pipeline {atype} executado sobre o caso {case.case_number}."

    run = AnalysisRun(
        organization_id=tenant_id,
        case_id=payload.case_id,
        analysis_type=atype,
        parameters={"entity_count": len(entities), "relationship_count": len(relationships)},
        result_summary=summary,
        results=results,
        status="COMPLETED",
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(run)
    db.flush()

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="ANALYSIS_RUN_EXECUTED",
        resource_type="analysis_run",
        resource_id=run.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"case_id": payload.case_id, "type": atype},
    )
    db.commit()
    db.refresh(run)
    return run


@router.get("/runs", response_model=List[AnalysisRunResponse])
def list_analysis_runs(
    case_id: str = Query(...),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    return (
        db.query(AnalysisRun)
        .filter(AnalysisRun.case_id == case_id, AnalysisRun.organization_id == tenant_id)
        .order_by(AnalysisRun.created_at.desc())
        .all()
    )
