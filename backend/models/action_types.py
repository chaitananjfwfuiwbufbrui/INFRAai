
from enum import Enum
from pydantic import BaseModel
from typing import Dict, Optional

class ActionType(Enum):
    SCALE_UP = "scale_up"          # Increase node_count or machine_type
    SCALE_DOWN = "scale_down"      # Decrease resources
    RESTART = "restart"            # Recreate resource (taint + apply)
    MODIFY_CONFIG = "modify_config" # Change configuration parameters
    ROLLBACK = "rollback"          # Revert to previous state
    IGNORE = "ignore"              # Do nothing

class ActionRequest(BaseModel):
    action_type: ActionType
    resource_id: str
    run_id: Optional[str] = None
    parameters: Dict  # e.g., {"node_count": 4} or {"machine_type": "n1-standard-2"}
    confidence: float
    reason: str
