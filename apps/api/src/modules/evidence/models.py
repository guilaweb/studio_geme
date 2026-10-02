from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, BigInteger, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from src.database import Base
from src.common.models import TimestampMixin, TenantMixin, AuditMixin, generate_uuid, utc_now


class Evidence(Base, TimestampMixin, TenantMixin, AuditMixin):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)
    storage_path = Column(String(500), nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)  # Cryptographic hash
    source = Column(String(255), nullable=True)
    collected_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    # Versioning & immutability:
    version = Column(Integer, default=1, nullable=False)
    parent_evidence_id = Column(String(36), ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="COLLECTED", nullable=False)  # COLLECTED, VERIFIED, FLAGGED, ARCHIVED

    # Relationships
    case = relationship("Case", back_populates="evidence_items")
    custody_events = relationship(
        "EvidenceCustodyEvent",
        back_populates="evidence",
        cascade="all, delete-orphan",
        order_by="EvidenceCustodyEvent.created_at.asc()",
    )


class EvidenceCustodyEvent(Base):
    """Chain of Custody (Cadeia de Custódia) immutable record."""
    __tablename__ = "evidence_custody_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    evidence_id = Column(String(36), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)  # ACQUISITION, INTEGRITY_CHECK, TRANSFER, VERSION_UPDATE, ARCHIVE
    recorded_hash = Column(String(64), nullable=False)
    notes = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    evidence = relationship("Evidence", back_populates="custody_events")
    user = relationship("User")
