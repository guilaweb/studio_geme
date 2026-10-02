from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict


class SiGenerateRequest(BaseModel):
    case_id: str
    focus_area: str = "ENTITY_DISCOVERY"  # ENTITY_DISCOVERY, RELATIONSHIP_LINKING, ANOMALY_DETECTION


class SiValidateRequest(BaseModel):
    validation_status: str  # CONFIRMED or REJECTED
    rationale: str


class SiInferenceResponse(BaseModel):
    id: str
    organization_id: str
    case_id: str
    inference_type: str
    title: str
    explanation: str
    payload: Dict[str, Any]
    confidence_score: float
    is_automated: bool
    legal_disclaimer: str
    human_validation_status: str
    validated_by_id: Optional[str] = None
    validated_at: Optional[datetime] = None
    validation_rationale: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
