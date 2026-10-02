from sqlalchemy import Column, String, Boolean, ForeignKey, UniqueConstraint, Table
from sqlalchemy.orm import relationship
from src.database import Base
from src.common.models import TimestampMixin, generate_uuid

# Association table between roles and permissions
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", String(36), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    module = Column(String(50), nullable=False, index=True)


class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    is_system_role = Column(Boolean, default=True, nullable=False)

    # Relationships
    permissions = relationship("Permission", secondary=role_permissions, backref="roles", lazy="joined")


class OrganizationMember(Base, TimestampMixin):
    __tablename__ = "organization_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, INVITED, SUSPENDED

    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_org_user"),
    )

    # Relationships
    organization = relationship("Organization", back_populates="members")
    user = relationship("User", back_populates="memberships")
    role = relationship("Role", lazy="joined")
