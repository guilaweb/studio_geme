from sqlalchemy import Column, String, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base
from src.common.models import TimestampMixin, TenantMixin, AuditMixin, generate_uuid


class Relationship(Base, TimestampMixin, TenantMixin, AuditMixin):
    __tablename__ = "relationships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    source_entity_id = Column(String(36), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    target_entity_id = Column(String(36), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False, index=True)
    relation_type = Column(String(100), nullable=False, index=True)  # OWNER_OF, DIRECTOR_OF, TRANSACTED_WITH, COMMUNICATED_WITH, ASSOCIATE_OF, LOCATED_AT
    confidence = Column(Float, default=1.0)
    is_inferred_by_si = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    case = relationship("Case", back_populates="relationships")
    source_entity = relationship("Entity", foreign_keys=[source_entity_id])
    target_entity = relationship("Entity", foreign_keys=[target_entity_id])
