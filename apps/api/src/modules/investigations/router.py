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
from src.modules.investigations.models import InvestigationTask, InvestigationNote
from src.modules.investigations.schemas import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    NoteCreate,
    NoteResponse,
)

router = APIRouter(prefix="/investigations", tags=["Investigations"])


# Tasks
@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == payload.case_id, Case.organization_id == tenant_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso não encontrado.")

    task = InvestigationTask(
        organization_id=tenant_id,
        case_id=payload.case_id,
        title=payload.title.strip(),
        description=payload.description,
        assigned_to_id=payload.assigned_to_id,
        due_date=payload.due_date,
        status="TODO",
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/tasks", response_model=List[TaskResponse])
def list_tasks(
    case_id: str = Query(...),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    return (
        db.query(InvestigationTask)
        .filter(InvestigationTask.case_id == case_id, InvestigationTask.organization_id == tenant_id)
        .order_by(InvestigationTask.created_at.asc())
        .all()
    )


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    task = db.query(InvestigationTask).filter(InvestigationTask.id == task_id, InvestigationTask.organization_id == tenant_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarefa não encontrada.")

    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(task, field, val)

    task.updated_by_id = current_user.id
    db.commit()
    db.refresh(task)
    return task


# Notes
@router.post("/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NoteCreate,
    current_user: User = Depends(get_current_user),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == payload.case_id, Case.organization_id == tenant_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caso não encontrado.")

    note = InvestigationNote(
        organization_id=tenant_id,
        case_id=payload.case_id,
        content=payload.content.strip(),
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/notes", response_model=List[NoteResponse])
def list_notes(
    case_id: str = Query(...),
    tenant_id: str = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    return (
        db.query(InvestigationNote)
        .filter(InvestigationNote.case_id == case_id, InvestigationNote.organization_id == tenant_id)
        .order_by(InvestigationNote.created_at.desc())
        .all()
    )
