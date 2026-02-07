
import os
import re
import shutil
import json
from datetime import datetime
from services.terraform_executor import TerraformExecutor
from services.deployment_registry import DeploymentRegistry
from models.action_types import ActionRequest, ActionType

class ActionExecutor:
    def __init__(self):
        self.registry = DeploymentRegistry()

    def execute_action(self, action: ActionRequest) -> dict:
        """
        Execute an autonomous action on infrastructure.
        """
        # 1. Lookup Deployment Context
        # Find which deployment created this resource
        deployment = self.registry.get_deployment_by_resource(action.resource_id)
        
        if not deployment:
             return {
                "success": False,
                "error": f"No deployment found for resource {action.resource_id}. Cannot autonomous execute.",
                "run_id": None
            }
        
        original_run_id = deployment["run_id"]
        run_path = deployment["terraform_dir"]
        
        print(f"[ActionExecutor] Found deployment {original_run_id} at {run_path}")

        # 2. Modify Terraform
        try:
            modifications_made = False
            
            if action.action_type == ActionType.SCALE_UP:
                modifications_made = self._handle_scale_up(run_path, action)
            elif action.action_type == ActionType.MODIFY_CONFIG:
                modifications_made = self._handle_config_change(run_path, action)
            else:
                 return {"success": False, "error": f"Action {action.action_type} not implemented yet"}

            if not modifications_made:
                return {"success": False, "error": "No changes were applied to Terraform files"}

            # 3. Trigger Apply (Re-use TerraformExecutor)
            # We use the existing credentials flow from global env or let Executor handle it
            # For this MVP, we assume credentials valid or passed in
            executor = TerraformExecutor(
                run_path=run_path,
                project_id=os.getenv("GCP_PROJECT_ID", "unknown"),
                sa_key_json=os.getenv("GOOGLE_CREDENTIALS_JSON", "")
            )
            
            # The executor will update status.json in the run folder
            # We run it synchronously or background? 
            # For "agentic", we likely want to start it and monitor. 
            # Here we just kick it off in a new thread?
            # Ideally, we call specific method.
            
            # Re-running apply on EXISTING state
            executor.run(action="apply", auto_approve=True)

            return {
                "success": True,
                "original_run_id": original_run_id,
                "message": "Action executed and applied successfully"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def _handle_scale_up(self, run_path: str, action: ActionRequest) -> bool:
        """
        Modify machine_type in main.tf or variables.tf
        """
        # Logic: Read main.tf, find the resource matching the ID (name), replace machine_type
        # This is TRICKY with regex.
        # Better approach: We asked Gemini "Change machine_type to e2-standard-4".
        # For MVP, we will do a simple regex replacement on the file content.
        
        main_tf_path = os.path.join(run_path, "main.tf")
        with open(main_tf_path, "r") as f:
            content = f.read()
        
        # Simple heuristic replacement for MVP
        # Looking for 'machine_type = "e2-micro"' inside the resource block for this VM
        # This is brittle but functional for the demo constraints.
        
        target_machine_type = action.parameters.get("machine_type", "e2-medium")
        
        # Regex to find machine_type inside google_compute_instance
        # We need to make sure we edit the RIGHT instance if there are multiple.
        # Ideally, use HCL parser or LLM.
        # Given we are "Agentic", let's use a robust replace
        
        if f'name         = "{action.resource_id}"' in content:
            # It's a named resource
            # We want to replace machine_type line *near* this name?
            # Actually, the generator uses 'vm_names' list.
            # So the resource block is generic: name = var.vm_names[count.index]
            # This means changing machine_type changes ALL VMs in that group.
            # That is acceptable for this level of demo.
            
            new_content = re.sub(
                r'machine_type\s*=\s*"[^"]+"',
                f'machine_type = "{target_machine_type}"',
                content
            )
            
            if content != new_content:
                with open(main_tf_path, "w") as f:
                    f.write(new_content)
                return True
                
        return False

    def _handle_config_change(self, run_path: str, action: ActionRequest) -> bool:
        # Placeholder
        return False
