from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime
from src.database import Base
from src.common.models import TimestampMixin, TenantMixin, generate_uuid


class Notification(Base, TimestampMixin, TenantMixin):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="INFO", nullable=False)  # ALERT, INFO, ACTION_REQUIRED
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    link = Column(String(500), nullable=True)
