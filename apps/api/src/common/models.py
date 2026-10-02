import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, String, ForeignKey
from sqlalchemy.orm import declared_attr


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    return str(uuid.uuid4())


class TimestampMixin:
    """Provides created_at and updated_at timestamps in UTC."""
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class TenantMixin:
    """Strict multi-tenant isolation mixin. Associates every record with an organization."""
    @declared_attr
    def organization_id(cls):
        return Column(
            String(36),
            ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )


class AuditMixin:
    """Records who created and last modified a record."""
    @declared_attr
    def created_by_id(cls):
        return Column(
            String(36),
            ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        )

    @declared_attr
    def updated_by_id(cls):
        return Column(
            String(36),
            ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        )
