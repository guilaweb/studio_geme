from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class OsintTargetCreate(BaseModel):
    case_id: str
    query_type: str  # DOMAIN, IP, DNS, WHOIS, NIF, PHONE, EMAIL
    query_value: str


class OsintTargetResponse(BaseModel):
    id: str
    organization_id: str
    case_id: str
    query_type: str
    query_value: str
    status: str  # PENDING, COMPLETED, NOT_CONFIGURED, FAILED
    results: Dict[str, Any]
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ========================================================
# SCHEMAS DE SCRAPING & COMPLIANCE GATE
# ========================================================

class ComplianceCheckRequest(BaseModel):
    target_url: str
    respect_robots: bool = True
    verify_tos_first: bool = True
    rate_limit_safe: bool = True


class ComplianceCheckResponse(BaseModel):
    target_url: str
    decision: str  # ALLOW, BLOCK, REVIEW
    decision_summary: str
    checks: List[Dict[str, Any]]


class RobotsParseRequest(BaseModel):
    domain_or_url: str


class ScrapeJobCreate(BaseModel):
    case_id: str
    target_url: str
    objective: str
    crawl_type: str = "SITE"  # SINGLE_PAGE, SITE, URL_LIST, SITEMAP
    max_depth: int = 2
    max_pages: int = 100
    respect_robots: bool = True
    verify_tos_first: bool = True
    rate_limit_safe: bool = True


# ========================================================
# SCHEMAS DE DORKS
# ========================================================

class DorkValidationRequest(BaseModel):
    query_text: str


class DorkBuildRequest(BaseModel):
    engine: str = "Google"
    domain: Optional[str] = None
    term: Optional[str] = None
    inurl: Optional[str] = None
    intitle: Optional[str] = None
    filetype: Optional[str] = None
    exact_match: bool = False


# ========================================================
# SCHEMAS DE IDENTIDADE DIGITAL & RESOLUÇÃO
# ========================================================

class IdentitySearchRequest(BaseModel):
    query: str
    case_id: Optional[str] = None


class IdentityEdgeUpdateRequest(BaseModel):
    edge_id: str
    new_state: str  # NAO_VERIFICADO, POSSIVEL, CORROBORADO, VALIDADO, REJEITADO
    validator_name: Optional[str] = None
    notes: Optional[str] = None
