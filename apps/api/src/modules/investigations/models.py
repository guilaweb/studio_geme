from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from src.database import Base
from src.common.models import TimestampMixin, TenantMixin, AuditMixin, generate_uuid


class InvestigationTask(Base, TimestampMixin, TenantMixin, AuditMixin):
    __tablename__ = "investigation_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="TODO", nullable=False)  # TODO, IN_PROGRESS, REVIEW, DONE
    assigned_to_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])


class InvestigationNote(Base, TimestampMixin, TenantMixin, AuditMixin):
    __tablename__ = "investigation_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
