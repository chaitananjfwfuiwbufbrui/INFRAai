from typing import List
from pydantic import BaseModel


class MonitoringPolicy(BaseModel):
    resource_ref: str
    metric_name: str
    metric_path: str
    threshold: float
    duration: str
    severity: str


class InfraPlan(BaseModel):
    cloud: str
    stack_type: str
    region: str
    machine_type: str
    autoscaling: bool
    estimated_cost_usd: float
    risk_flags: List[str]
    resources: List[str]
    monitoring: List[MonitoringPolicy]


class OpsDecision(BaseModel):
    severity: str
    recommended_action: str
    requires_approval: bool
    confidence: float
    reasoning: str


class TerraformFiles(BaseModel):
    main_tf: str
    variables_tf: str
    outputs_tf: str
