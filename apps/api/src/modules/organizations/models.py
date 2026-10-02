from sqlalchemy import Column, String, Text, JSON
from sqlalchemy.orm import relationship
from src.database import Base
from src.common.models import TimestampMixin, generate_uuid


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    legal_name = Column(String(255), nullable=True)
    nif = Column(String(50), nullable=True, index=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    municipality = Column(String(100), nullable=True)
    province = Column(String(100), nullable=True, default="Luanda")
    logo_url = Column(String(500), nullable=True)
    currency = Column(String(10), default="AOA")
    timezone = Column(String(50), default="Africa/Luanda")
    language = Column(String(10), default="pt-AO")
    status = Column(String(50), default="ACTIVE", index=True)  # ACTIVE, SUSPENDED, ARCHIVED
    plan = Column(String(50), default="ENTERPRISE")
    settings = Column(JSON, default=dict)

    # Relationships
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    cases = relationship("Case", back_populates="organization", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="organization", cascade="all, delete-orphan")
