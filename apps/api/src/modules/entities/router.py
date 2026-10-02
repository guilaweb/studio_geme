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
from src.modules.entities.models import Entity
from src.modules.cases.models import Case
from src.modules.entities.schemas import EntityCreate, EntityUpdate, EntityResponse

router = APIRouter(prefix="/entities", tags=["Entities"])


@router.post("", response_model=EntityResponse, status_code=status.HTTP_201_CREATED)
def create_entity(
    payload: EntityCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Register an entity (person, company, vehicle, account) linked to a case."""
    # Verify case belongs to tenant if provided
    if payload.case_id:
        case = db.query(Case).filter(Case.id == payload.case_id, Case.organization_id == tenant_id).first()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso não encontrado na organização.")

    entity = Entity(
        organization_id=tenant_id,
        case_id=payload.case_id,
        type=payload.type.upper(),
        name=payload.name.strip(),
        identifier=payload.identifier.strip() if payload.identifier else None,
        risk_score=payload.risk_score,
        status="ACTIVE",
        attributes=payload.attributes,
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(entity)
    db.flush()

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="ENTITY_CREATE",
        resource_type="entity",
        resource_id=entity.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"name": entity.name, "type": entity.type, "case_id": entity.case_id},
    )
    db.commit()
    db.refresh(entity)
    return entity


@router.get("", response_model=List[EntityResponse])
def list_entities(
    case_id: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = Query(None),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """List entities within tenant boundary."""
    query = db.query(Entity).filter(Entity.organization_id == tenant_id)

    if case_id:
        query = query.filter(Entity.case_id == case_id)
    if entity_type:
        query = query.filter(Entity.type == entity_type.upper())
    if search:
        search_fmt = f"%{search}%"
        query = query.filter((Entity.name.ilike(search_fmt)) | (Entity.identifier.ilike(search_fmt)))

    return query.order_by(Entity.name.asc()).all()


@router.get("/{entity_id}", response_model=EntityResponse)
def get_entity(
    entity_id: str,
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Retrieve single entity details."""
    entity = db.query(Entity).filter(Entity.id == entity_id, Entity.organization_id == tenant_id).first()
    if not entity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entidade não encontrada.")
    return entity


@router.patch("/{entity_id}", response_model=EntityResponse)
def update_entity(
    entity_id: str,
    payload: EntityUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Update entity within tenant boundary."""
    entity = db.query(Entity).filter(Entity.id == entity_id, Entity.organization_id == tenant_id).first()
    if not entity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entidade não encontrada.")

    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        if field == "type" and val:
            val = val.upper()
        setattr(entity, field, val)

    entity.updated_by_id = current_user.id

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="ENTITY_UPDATE",
        resource_type="entity",
        resource_id=entity.id,
        severity="INFO",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"updated_fields": list(data.keys())},
    )
    db.commit()
    db.refresh(entity)
    return entity


@router.delete("/{entity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entity(
    entity_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """Delete an entity."""
    entity = db.query(Entity).filter(Entity.id == entity_id, Entity.organization_id == tenant_id).first()
    if not entity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entidade não encontrada.")

    record_audit_log(
        db=db,
        organization_id=tenant_id,
        user_id=current_user.id,
        action="ENTITY_DELETE",
        resource_type="entity",
        resource_id=entity.id,
        severity="WARNING",
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        details={"name": entity.name},
    )
    db.delete(entity)
    db.commit()
    return None
