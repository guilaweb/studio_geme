from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class AnalysisRunCreate(BaseModel):
    case_id: str
    analysis_type: str  # NETWORK_METRICS, RISK_ASSESSMENT, TIMELINE_RECONSTRUCTION


class AnalysisRunResponse(BaseModel):
    id: str
    organization_id: str
    case_id: str
    analysis_type: str
    result_summary: Optional[str] = None
    results: Dict[str, Any]
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
