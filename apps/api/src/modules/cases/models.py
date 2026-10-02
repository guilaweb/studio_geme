from sqlalchemy import Column, String, Text, JSON, ForeignKey, Table, Integer
from sqlalchemy.orm import relationship
from src.database import Base
from src.common.models import TimestampMixin, TenantMixin, AuditMixin, generate_uuid

# Association table for investigators assigned to a case
case_members = Table(
    "case_members",
    Base.metadata,
    Column("case_id", String(36), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_in_case", String(50), default="INVESTIGATOR"),
)


class Case(Base, TimestampMixin, TenantMixin, AuditMixin):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_number = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    priority = Column(String(20), default="MEDIUM", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(30), default="OPEN", index=True)  # OPEN, ACTIVE, PENDING_REVIEW, CLOSED, ARCHIVED
    tags = Column(JSON, default=list)

    # Relationships
    organization = relationship("Organization", back_populates="cases")
    assigned_members = relationship("User", secondary=case_members, backref="assigned_cases")
    entities = relationship("Entity", back_populates="case", cascade="all, delete-orphan")
    evidence_items = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    relationships = relationship("Relationship", back_populates="case", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="case", cascade="all, delete-orphan")
