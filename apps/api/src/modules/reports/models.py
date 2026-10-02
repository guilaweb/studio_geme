from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from src.database import Base
from src.common.models import TimestampMixin, TenantMixin, AuditMixin, generate_uuid


class Report(Base, TimestampMixin, TenantMixin, AuditMixin):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False)  # INVESTIGATION_DOSSIER, EVIDENCE_INVENTORY, EXECUTIVE_BRIEF, CHAIN_OF_CUSTODY_CERT
    content_markdown = Column(Text, nullable=False)
    status = Column(String(50), default="DRAFT", nullable=False)  # DRAFT, SUBMITTED, APPROVED, SEALED
    cryptographic_seal_hash = Column(String(64), nullable=True)  # SHA-256 seal once report is finalized
    approved_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    case = relationship("Case", back_populates="reports")
    approved_by = relationship("User", foreign_keys=[approved_by_id])
