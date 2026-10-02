from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: str
    organization_id: str
    title: str
    message: str
    type: str
    is_read: bool
    read_at: Optional[datetime] = None
    link: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
