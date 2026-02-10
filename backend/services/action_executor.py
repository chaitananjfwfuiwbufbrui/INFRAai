
import os
import re
import shutil
import json
from datetime import datetime
from services.terraform_executor import TerraformExecutor
from services.deployment_registry import DeploymentRegistry
from services.llm_terraform_generator import LLMTerraformGenerator
from services.chat_persistence import ChatPersistence
from models.action_types import ActionRequest, ActionType

class ActionExecutor:
    def __init__(self):
        self.registry = DeploymentRegistry()
        self.llm_generator = LLMTerraformGenerator()
        self.chat_persistence = ChatPersistence()

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

        # 2. Modify Terraform (using LLM)
        try:
            modifications_made = False
            
            # Load context
            history_context = self.chat_persistence.get_history_context(original_run_id)
            
            if action.action_type == ActionType.SCALE_UP:
                modifications_made = self._handle_scale_up(original_run_id, action, history_context)
            elif action.action_type == ActionType.MODIFY_CONFIG:
                modifications_made = self._handle_config_change(original_run_id, action, history_context)
            else:
                 return {"success": False, "error": f"Action {action.action_type} not implemented yet"}

            if not modifications_made:
                return {"success": False, "error": "No changes were applied to Terraform files (LLM validation or generation failed)"}

            # 3. Trigger Apply (Re-use TerraformExecutor)
            # We use the existing credentials flow from global env or let Executor handle it
            # For this MVP, we assume credentials valid or passed in
            executor = TerraformExecutor(
                run_path=run_path,
                project_id=os.getenv("GCP_PROJECT_ID", "unknown"),
                sa_key_json=os.getenv("GOOGLE_CREDENTIALS_JSON", "")
            )
            
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

    def _handle_scale_up(self, run_id: str, action: ActionRequest, history_context: str) -> bool:
        """
        Use LLM to modify machine_type.
        """
        target_machine_type = action.parameters.get("machine_type", "e2-medium")
        user_request = f"Scale up the resource with ID '{action.resource_id}' to machine_type '{target_machine_type}'. Ensure you modify the correct resource block."
        
        print(f"[ActionExecutor] Requesting LLM modification: {user_request}")
        
        result = self.llm_generator.refine_existing_code(
            run_id=run_id, 
            user_request=user_request,
            history_context=history_context
        )
        
        if result["success"]:
            # Log to persistence
            self.chat_persistence.save_chat(
                run_id=run_id,
                user_msg=user_request,
                llm_msg="Modified Terraform code to scale up instance.",
                nodes=None # We don't have the graph nodes here easily, for now skipping
            )
            return True
            
        print(f"[ActionExecutor] LLM failed: {result.get('error')}")
        return False

    def _handle_config_change(self, run_id: str, action: ActionRequest, history_context: str) -> bool:
        """
        Generic config change.
        """
        config_key = action.parameters.get("config_key")
        config_value = action.parameters.get("config_value")
        user_request = f"Change configuration '{config_key}' to '{config_value}' for resource '{action.resource_id}'."

        print(f"[ActionExecutor] Requesting LLM modification: {user_request}")

        result = self.llm_generator.refine_existing_code(
            run_id=run_id, 
            user_request=user_request,
            history_context=history_context
        )
        
        if result["success"]:
            self.chat_persistence.save_chat(
                run_id=run_id,
                user_msg=user_request,
                llm_msg=f"Modified Terraform code: set {config_key} to {config_value}.",
                nodes=None
            )
            return True

        return False
    
    def execute_freeform(self, resource_id: str, user_instruction: str) -> dict:
        """
        Execute a freeform natural language instruction on a resource.
        Useful for ChatOps/Telegram demos.
        """
        print(f"[ActionExecutor] Processing freeform instruction: '{user_instruction}' for resource '{resource_id}'")
        
        # 1. Lookup Deployment Context
        deployment = self.registry.get_deployment_by_resource(resource_id)
        if not deployment:
             return {
                "success": False,
                "error": f"No deployment found for resource {resource_id}. Cannot execute.",
                "run_id": None
            }
        
        original_run_id = deployment["run_id"]
        run_path = deployment["terraform_dir"]
        
        # 2. Modify Terraform (using LLM)
        try:
            # Load context
            history_context = self.chat_persistence.get_history_context(original_run_id)
            
            # Construct prompt for generic modification
            user_request = f"For resource '{resource_id}', execute this instruction: {user_instruction}. Ensure valid Terraform."
            
            result = self.llm_generator.refine_existing_code(
                run_id=original_run_id, 
                user_request=user_request,
                history_context=history_context
            )
            
            if not result["success"]:
                 return {"success": False, "error": f"LLM failed to modify code: {result.get('error')}"}

            # Log to persistence
            self.chat_persistence.save_chat(
                run_id=original_run_id,
                user_msg=user_instruction,
                llm_msg="I have updated the Terraform code based on your instruction.",
                nodes=None
            )

            # 3. Trigger Apply
            executor = TerraformExecutor(
                run_path=run_path,
                project_id=os.getenv("GCP_PROJECT_ID", "unknown"),
                sa_key_json=os.getenv("GOOGLE_CREDENTIALS_JSON", "")
            )
            
            # Use auto-approve for the demo flow
            executor.run(action="apply", auto_approve=True)

            return {
                "success": True, 
                "original_run_id": original_run_id,
                "message": f"Successfully executed: '{user_instruction}'"
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
