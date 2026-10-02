from sqlalchemy import Column, String, Text, JSON, ForeignKey
from src.database import Base
from src.common.models import TimestampMixin, TenantMixin, AuditMixin, generate_uuid


class AnalysisRun(Base, TimestampMixin, TenantMixin, AuditMixin):
    __tablename__ = "analysis_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_type = Column(String(100), nullable=False)  # NETWORK_GRAPH, TIMELINE, RISK_MATRIX, CROSS_CASE_MATCH
    parameters = Column(JSON, default=dict)
    result_summary = Column(Text, nullable=True)
    results = Column(JSON, default=dict)
    status = Column(String(50), default="COMPLETED", nullable=False)
