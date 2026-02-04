import json
from services.llmchat.factory import get_llm
from services.schemas import OpsDecision
from services.prompts.ops_decision import OPS_DECISION_SYSTEM_PROMPT


class OpsDecisionAgent:
    def __init__(self):
        self.llm = get_llm()

    @staticmethod
    def decide(alert: dict) -> OpsDecision:
        """
        Analyze an alert and recommend an action.
        """
        agent = OpsDecisionAgent()
        
        messages = [
            {"role": "system", "content": OPS_DECISION_SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(alert)}
        ]

        decision = agent.llm.generate(messages, response_schema=OpsDecision)
        return decision
