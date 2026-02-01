from services.llmchat.factory import get_llm
from services.schemas import InfraPlan
from services.prompts.planner import PLANNER_SYSTEM_PROMPT

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
        
        return plan
