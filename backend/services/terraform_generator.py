import os
import json
import uuid
from datetime import datetime
from llmchat import GroqLLM


class TerraformGenerator:
    """
    Infra Spec → Terraform files
    Generates + stores files in a unique folder
    """

    BASE_DIR = os.path.join(os.getcwd(), "runs")
   # Docker-safe base path

    def __init__(self):
        self.llm = GroqLLM()

    # -------------------------
    # PROMPT
    # -------------------------
    def build_prompt(self, infra_spec: dict):
        return [
            {
                "role": "system",
                "content": """
You are a Terraform code generator.

STRICT RULES:
- Cloud: Google Cloud (GCP) ONLY
- Generate EXACTLY 3 files:
  - main.tf
  - variables.tf
  - outputs.tf
- Do NOT create resources not in input
- Do NOT exceed instance counts
- Do NOT explain anything
- Output MUST be valid JSON

Output format:
{
  "main.tf": "...",
  "variables.tf": "...",
  "outputs.tf": "..."
}
"""
            },
            {
                "role": "user",
                "content": json.dumps(infra_spec, indent=2)
            }
        ]

    # -------------------------
    # GENERATE + SAVE
    # -------------------------
    def generate_and_store(self, infra_spec: dict) -> dict:
        messages = self.build_prompt(infra_spec)

        response = self.llm.generate_json(messages)
        files = self.normalize(response)

        run_id = self._create_run_id()
        run_path = os.path.join(self.BASE_DIR, run_id)

        os.makedirs(run_path, exist_ok=True)

        # Save Terraform files
        for filename, content in files.items():
            with open(os.path.join(run_path, filename), "w") as f:
                f.write(content)

        # Save metadata (important for later execution)
        meta = {
            "run_id": run_id,
            "provider": infra_spec.get("provider"),
            "created_at": datetime.utcnow().isoformat(),
            "services": list(infra_spec.get("services", {}).keys())
        }

        with open(os.path.join(run_path, "meta.json"), "w") as f:
            json.dump(meta, f, indent=2)

        return {
            "run_id": run_id,
            "path": run_path,
            "files": list(files.keys())
        }

    # -------------------------
    # NORMALIZATION
    # -------------------------
    def normalize(self, response: dict) -> dict:
        required = ["main.tf", "variables.tf", "outputs.tf"]

        for f in required:
            if f not in response:
                raise ValueError(f"Missing Terraform file: {f}")

        return {
            "main.tf": response["main.tf"],
            "variables.tf": response["variables.tf"],
            "outputs.tf": response["outputs.tf"]
        }

    # -------------------------
    # HELPERS
    # -------------------------
    def _create_run_id(self) -> str:
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        uid = uuid.uuid4().hex[:6]
        return f"run_{ts}_{uid}"
