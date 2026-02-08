from typing import List
from services.llmchat.factory import get_llm
from services.schemas import InfraPlan, MonitoringPolicy
from services.prompts.planner import PLANNER_SYSTEM_PROMPT
from services.monitoring.metric_profiles import METRIC_PROFILES

# GCP Machine Type Cost Table (USD per hour)
COST_TABLE = {
    "e2-micro": 0.008,
    "e2-small": 0.017,
    "e2-medium": 0.033,
    "e2-standard-2": 0.067,
    "e2-standard-4": 0.134,
    "e2-standard-8": 0.268,
    "n1-standard-1": 0.048,
    "n1-standard-2": 0.095,
    "n1-standard-4": 0.190,
    "n2-standard-2": 0.097,
    "n2-standard-4": 0.194,
}


class PlannerAgent:
    def __init__(self):
        self.llm = get_llm()  # Uses LLM_PROVIDER from env
    
    def plan(self, goal: str) -> InfraPlan:
        """
        Generate an infrastructure plan from a user's goal.
        
        Args:
            goal: User's natural language infrastructure request
            
        Returns:
            InfraPlan: Structured plan with cloud, region, costs, risks, etc.
        """
        messages = [
            {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
            {"role": "user", "content": goal}
        ]
        
        # Use Gemini with structured output
        plan = self.llm.generate(messages, response_schema=InfraPlan)
        
        # Bind monitoring policies
        plan.monitoring = self._bind_monitoring(plan)
        
        return plan

    def _bind_monitoring(self, plan: InfraPlan) -> List[MonitoringPolicy]:
        policies = []
        for resource_name in plan.resources:
            # Simple heuristic: map resource name (e.g., "vm-1", "sql-1") to type
            # In a real system, the plan would likely have structured resource objects with strict types
            resource_type = "unknown"
            
            if "vm" in resource_name or "instance" in resource_name:
                resource_type = "google_compute_instance"
            elif "sql" in resource_name or "db" in resource_name:
                resource_type = "google_sql_database_instance"
            elif "asg" in resource_name or "group" in resource_name:
                resource_type = "google_compute_instance_group_manager"

            profiles = METRIC_PROFILES.get(resource_type, [])
            for profile in profiles:
                policies.append(MonitoringPolicy(
                    resource_ref=resource_name,
                    metric_name=profile["name"],
                    metric_path=profile["metric"],
                    threshold=profile["threshold"],
                    duration=profile["duration"],
                    severity=profile["severity"]
                ))
        return policies
