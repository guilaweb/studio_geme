from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from src.modules.entities.schemas import EntityResponse


class RelationshipBase(BaseModel):
    case_id: str
    source_entity_id: str
    target_entity_id: str
    relation_type: str  # OWNER_OF, DIRECTOR_OF, TRANSACTED_WITH, COMMUNICATED_WITH, ASSOCIATE_OF, LOCATED_AT
    confidence: float = 1.0
    notes: Optional[str] = None


class RelationshipCreate(RelationshipBase):
    pass


class RelationshipResponse(RelationshipBase):
    id: str
    organization_id: str
    is_inferred_by_si: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    risk_score: float


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    confidence: float
    is_inferred_by_si: bool


class GraphDataResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
