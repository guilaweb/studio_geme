from sqlalchemy import Column, String, Text, JSON, ForeignKey
from src.database import Base
from src.common.models import TimestampMixin, TenantMixin, AuditMixin, generate_uuid


class OsintTarget(Base, TimestampMixin, TenantMixin, AuditMixin):
    __tablename__ = "osint_targets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    query_type = Column(String(50), nullable=False)  # DOMAIN, IP, NIF, PHONE, EMAIL, PERSON_NAME
    query_value = Column(String(255), nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, COMPLETED, NOT_CONFIGURED, FAILED
    results = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
