from sqlalchemy import Column, String, Float, JSON, ForeignKey
from sqlalchemy.orm import relationship
from src.database import Base
from src.common.models import TimestampMixin, TenantMixin, AuditMixin, generate_uuid


class Entity(Base, TimestampMixin, TenantMixin, AuditMixin):
    __tablename__ = "entities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=True, index=True)
    type = Column(String(50), nullable=False, index=True)  # INDIVIDUAL, ORGANIZATION, VEHICLE, BANK_ACCOUNT, PHONE, EMAIL, LOCATION, DOCUMENT
    name = Column(String(255), nullable=False, index=True)
    identifier = Column(String(255), nullable=True, index=True)  # NIF, IBAN, Passport, Plate, Phone number
    risk_score = Column(Float, default=0.0)
    status = Column(String(50), default="ACTIVE", index=True)
    attributes = Column(JSON, default=dict)

    # Relationships
    case = relationship("Case", back_populates="entities")
