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
from src.modules.relationships.models import Relationship
from src.modules.entities.models import Entity
from src.modules.cases.models import Case
from src.modules.relationships.schemas import (
    RelationshipCreate,
    RelationshipResponse,
    GraphDataResponse,
    GraphNode,
    GraphEdge,
)

router = APIRouter(prefix="/relationships", tags=["Relationships"])


@router.post("", response_model=RelationshipResponse, status_code=status.HTTP_201_CREATED)
def create_relationship(
    payload: RelationshipCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Link two entities with an operational relationship."""
    # Validate case
    case = db.query(Case).filter(Case.id == payload.case_id, Case.organization_id == tenant_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso não encontrado.")

    # Validate source and target belong to tenant
    src = db.query(Entity).filter(Entity.id == payload.source_entity_id, Entity.organization_id == tenant_id).first()
    tgt = db.query(Entity).filter(Entity.id == payload.target_entity_id, Entity.organization_id == tenant_id).first()
    if not src or not tgt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entidades de origem ou destino não encontradas.")

    if src.id == tgt.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uma entidade não pode relacionar-se consigo mesma.")

    rel = Relationship(
        organization_id=tenant_id,
        case_id=payload.case_id,
        source_entity_id=payload.source_entity_id,
        target_entity_id=payload.target_entity_id,
        relation_type=payload.relation_type.upper(),
        confidence=payload.confidence,
        is_inferred_by_si=False,
        notes=payload.notes,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(rel)
    db.flush()

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="RELATIONSHIP_CREATE",
        resource_type="relationship",
        resource_id=rel.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={
            "source": src.name,
            "target": tgt.name,
            "type": rel.relation_type,
            "case_id": rel.case_id,
        },
    )
    db.commit()
    db.refresh(rel)
    return rel


@router.get("", response_model=List[RelationshipResponse])
def list_relationships(
    case_id: str = Query(..., description="Case ID required to query relationships"),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List relationships for a case within tenant."""
    return (
        db.query(Relationship)
        .filter(Relationship.case_id == case_id, Relationship.organization_id == tenant_id)
        .all()
    )


@router.get("/graph/{case_id}", response_model=GraphDataResponse)
def get_graph_data(
    case_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Produce interactive network graph data (nodes & edges) for investigative visualization."""
    case = db.query(Case).filter(Case.id == case_id, Case.organization_id == tenant_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso não encontrado.")

    entities = db.query(Entity).filter(Entity.case_id == case_id, Entity.organization_id == tenant_id).all()
    relationships = db.query(Relationship).filter(Relationship.case_id == case_id, Relationship.organization_id == tenant_id).all()

    nodes = [
        GraphNode(
            id=e.id,
            label=e.name,
            type=e.type,
            risk_score=e.risk_score,
        )
        for e in entities
    ]

    edges = [
        GraphEdge(
            id=r.id,
            source=r.source_entity_id,
            target=r.target_entity_id,
            label=r.relation_type,
            confidence=r.confidence,
            is_inferred_by_si=r.is_inferred_by_si,
        )
        for r in relationships
    ]

    return GraphDataResponse(nodes=nodes, edges=edges)


@router.delete("/{rel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_relationship(
    rel_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Delete a relationship with audit."""
    rel = db.query(Relationship).filter(Relationship.id == rel_id, Relationship.organization_id == tenant_id).first()
    if not rel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relacionamento não encontrado.")

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="RELATIONSHIP_DELETE",
        resource_type="relationship",
        resource_id=rel.id,
        severity="WARNING",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"type": rel.relation_type, "case_id": rel.case_id},
    )
    db.delete(rel)
    db.commit()
    return None
