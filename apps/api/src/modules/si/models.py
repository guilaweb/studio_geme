from sqlalchemy import Column, String, Text, Float, Boolean, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from src.database import Base
from src.common.models import TimestampMixin, TenantMixin, AuditMixin, generate_uuid


class SiInference(Base, TimestampMixin, TenantMixin, AuditMixin):
    """
    Automated Intelligence (SI) inference.
    Strictly marked as automated, requiring human verification before being treated as confirmed fact.
    """
    __tablename__ = "si_inferences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    inference_type = Column(String(100), nullable=False)  # ENTITY_EXTRACTION, RELATIONSHIP_SUGGESTION, ANOMALY_DETECTION, TIMELINE_GAP
    title = Column(String(255), nullable=False)
    explanation = Column(Text, nullable=False)
    payload = Column(JSON, default=dict)
    confidence_score = Column(Float, nullable=False)  # 0.0 to 1.0

    # Human-in-the-loop & Regulatory Compliance:
    is_automated = Column(Boolean, default=True, nullable=False)
    legal_disclaimer = Column(
        String(500),
        default="Resultado analítico automatizado de Inteligência (SI). Sujeito a validação humana obrigatória.",
        nullable=False,
    )
    human_validation_status = Column(String(50), default="PENDING", nullable=False)  # PENDING, CONFIRMED, REJECTED
    validated_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)
    validation_rationale = Column(Text, nullable=True)

    # Relationships
    validated_by = relationship("User", foreign_keys=[validated_by_id])
