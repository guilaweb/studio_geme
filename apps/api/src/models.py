# Central registry to import all SQLAlchemy models for Alembic metadata discovery
from src.database import Base

from src.modules.organizations.models import Organization
from src.modules.users.models import User
from src.modules.roles.models import Role, Permission, OrganizationMember, role_permissions
from src.modules.audit.models import AuditLog
from src.modules.cases.models import Case, case_members
from src.modules.entities.models import Entity
from src.modules.relationships.models import Relationship
from src.modules.evidence.models import Evidence, EvidenceCustodyEvent
from src.modules.investigations.models import InvestigationTask, InvestigationNote
from src.modules.osint.models import OsintTarget
from src.modules.analysis.models import AnalysisRun
from src.modules.si.models import SiInference
from src.modules.reports.models import Report
from src.modules.notifications.models import Notification

__all__ = [
    "Base",
    "Organization",
    "User",
    "Role",
    "Permission",
    "OrganizationMember",
    "role_permissions",
    "AuditLog",
    "Case",
    "case_members",
    "Entity",
    "Relationship",
    "Evidence",
    "EvidenceCustodyEvent",
    "InvestigationTask",
    "InvestigationNote",
    "OsintTarget",
    "AnalysisRun",
    "SiInference",
    "Report",
    "Notification",
]
