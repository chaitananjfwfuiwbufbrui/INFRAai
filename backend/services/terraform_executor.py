import os
import subprocess
import shutil
import json
import time
from typing import Dict
from services.terraform_fix_agent import TerraformFixAgent
from services.verification_agent import VerificationAgent
from services.deployment_registry import DeploymentRegistry

MAX_FIX_ATTEMPTS = 3


class TerraformExecutor:
    """
    Executes Terraform inside Docker with:
    - Live log persistence
    - Status tracking
    - Retry for GCP API propagation
    """

    def __init__(self, run_path: str, project_id: str, sa_key_json: str):
        self.run_path = os.path.abspath(run_path)
        self.project_id = project_id
        self.sa_key_json = sa_key_json

        if not os.path.exists(self.run_path):
            raise FileNotFoundError("Run path not found")

        self.log_path = os.path.join(self.run_path, "executor.log")
        self.status_path = os.path.join(self.run_path, "status.json")
        self.metadata_path = os.path.join(self.run_path, "metadata.json")
    
    def _set_phase(self, phase: str, error: str = None):
        """Update status with current phase and optional error."""
        status_data = {
            "status": "running",
            "phase": phase,
            "updated_at": time.time()
        }
        if error:
            status_data["error"] = error
            status_data["status"] = "failed"
        
        with open(self.status_path, "w") as f:
            json.dump(status_data, f, indent=2)
    # --------------------------------------------------
    # LOGGING + STATUS
    # --------------------------------------------------
    def _log(self, message: str):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        with open(self.log_path, "a") as f:
            f.write(f"[{timestamp}] {message}\n")

    def _update_status(self, status: str, error: str = None):
        """Update execution status with optional error message."""
        status_data = {
            "status": status,
            "updated_at": time.time(),
        }
        if error:
            status_data["error"] = error
            status_data["error_type"] = "execution_error"
        
        with open(self.status_path, "w") as f:
            json.dump(status_data, f, indent=2)

    # --------------------------------------------------
    # CREDS HANDLING
    # --------------------------------------------------
    def _prepare_creds(self):
        creds_dir = os.path.join(self.run_path, "creds")
        os.makedirs(creds_dir, exist_ok=True)

        key_path = os.path.join(creds_dir, "gcp.json")
        with open(key_path, "w") as f:
            f.write(self.sa_key_json)

        return creds_dir

    def _cleanup_creds(self):
        creds_dir = os.path.join(self.run_path, "creds")
        if os.path.exists(creds_dir):
            shutil.rmtree(creds_dir)

    # --------------------------------------------------
    # RETRY LOGIC
    # --------------------------------------------------
    def _is_retryable_error(self, stderr: str) -> bool:
        retryable = [
            "SERVICE_DISABLED",
            "accessNotConfigured",
            "has not been used in project",
            "is disabled",
        ]
        return any(r in stderr for r in retryable)

    # --------------------------------------------------
    # TERRAFORM VALIDATE
    # --------------------------------------------------
    def terraform_validate(self, run_id: str) -> dict:
        """
        Run terraform validate and return result.
        
        Args:
            run_id: Run identifier
            
        Returns:
            dict: {"success": bool, "stderr": str}
        """
        try:
            result = subprocess.run(
                [
                    "docker", "run", "--rm",
                    "-v", f"{self.run_path}:/workspace",
                    "-w", "/workspace",
                    "terraform-runner",
                    "terraform", "validate"
                ],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            return {
                "success": result.returncode == 0,
                "stderr": result.stderr
            }
        except Exception as e:
            return {
                "success": False,
                "stderr": str(e)
            }
    
    def _read_tf_files(self) -> dict:
        """Read all .tf files from run directory."""
        files = {}
        for filename in os.listdir(self.run_path):
            if filename.endswith(".tf"):
                filepath = os.path.join(self.run_path, filename)
                with open(filepath, "r") as f:
                    files[filename] = f.read()
        return files
    
    def _write_tf_files(self, files: dict):
        """Write .tf files to run directory."""
        # Map from schema field names to filenames
        file_mapping = {
            "main_tf": "main.tf",
            "variables_tf": "variables.tf",
            "outputs_tf": "outputs.tf"
        }
        
        for field_name, filename in file_mapping.items():
            if hasattr(files, field_name):
                content = getattr(files, field_name)
                filepath = os.path.join(self.run_path, filename)
                with open(filepath, "w") as f:
                    f.write(content)

    # --------------------------------------------------
    # MAIN EXECUTION
    # --------------------------------------------------
    def run(self, action: str = "apply", auto_approve: bool = False):
        creds_dir = self._prepare_creds()

        self._update_status("running")
        self._set_phase("starting")
        self._log(f"Terraform {action} started")

        try:
            self._set_phase("initializing")
            
            # Run terraform init first
            init_cmd = [
                "docker", "run", "--rm",
                "-e", f"TF_VAR_project_id={self.project_id}",
                "-e", "GOOGLE_APPLICATION_CREDENTIALS=/creds/gcp.json",
                "-v", f"{self.run_path}:/workspace:rw",
                "-v", f"{creds_dir}:/creds:ro",
                "-w", "/workspace",
                "terraform-runner",
                "terraform", "init"
            ]
            
            init_result = subprocess.run(init_cmd, capture_output=True, text=True)
            if init_result.returncode != 0:
                error_msg = f"Terraform init failed: {init_result.stderr}"
                self._log(error_msg)
                self._update_status("failed", error_msg)
                raise RuntimeError(error_msg)
            
            self._log("Terraform init completed")
            
            # VALIDATION LOOP WITH AUTO-FIX
            self._set_phase("validating")
            previous_stderr = None
            
            for attempt in range(MAX_FIX_ATTEMPTS):
                self._log(f"Validation attempt {attempt + 1}/{MAX_FIX_ATTEMPTS}")
                
                validation_result = self.terraform_validate(self.run_path)
                
                if validation_result["success"]:
                    self._log("Validation passed")
                    break
                
                stderr = validation_result["stderr"]
                self._log(f"Validation failed: {stderr}")
                
                # Deduplication guard - prevent infinite loops
                if previous_stderr and stderr == previous_stderr:
                    error_msg = "Terraform validation error: LLM auto-fix not converging. The same error occurred twice in a row, indicating the AI cannot fix this issue automatically."
                    self._log(f"ERROR: {error_msg}")
                    self._log(f"Repeated error: {stderr}")
                    self._update_status("failed", error_msg)
                    raise RuntimeError(error_msg)
                
                previous_stderr = stderr
                
                # Last attempt - don't try to fix
                if attempt == MAX_FIX_ATTEMPTS - 1:
                    error_msg = f"Terraform validation failed after {MAX_FIX_ATTEMPTS} auto-fix attempts. Last error: {stderr}"
                    self._log(error_msg)
                    self._update_status("failed", error_msg)
                    raise RuntimeError(error_msg)
                
                # Auto-fix using Gemini
                self._set_phase(f"fix_attempt_{attempt + 1}")
                self._log(f"Attempting auto-fix {attempt + 1}...")
                
                current_files = self._read_tf_files()
                fixed_files = TerraformFixAgent.fix(stderr, current_files)
                
                self._write_tf_files(fixed_files)
                self._log(f"Auto-fix {attempt + 1} applied")
            
            # Proceed with plan and apply
            self._set_phase("planning")
            
            cmd = [
                "docker", "run", "--rm",
                "--memory=512m",
                "--cpus=1",

                # Terraform variables
                "-e", f"TF_VAR_project_id={self.project_id}",

                "-e", f"TF_ACTION={action}",
                "-e", "GOOGLE_APPLICATION_CREDENTIALS=/creds/gcp.json",

                "-v", f"{self.run_path}:/workspace:rw",
                "-v", f"{creds_dir}:/creds:ro",
                "-w", "/workspace",
                "terraform-runner"
            ]
            self._log(f"Run path on host: {self.run_path}")
            self._log(f"Files in run path: {os.listdir(self.run_path)}")
            self._log(f"Running Docker command: {' '.join(cmd)}")

            self._set_phase("applying")
            
            for attempt in range(3):
                self._log(f"Apply attempt {attempt + 1} started")

                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                )

                for line in iter(process.stdout.readline, ""):
                    self._log(line.rstrip())

                for line in iter(process.stderr.readline, ""):
                    self._log("ERROR: " + line.rstrip())

                process.wait()

                if process.returncode != 0:
                    error_msg = f"Terraform {action} failed with exit code {process.returncode}"
                    self._log(error_msg)
                    self._update_status("failed", error_msg)
                    raise RuntimeError(error_msg)

                if process.returncode == 0:
                    break

                self._set_phase("retrying_after_gcp_error")
                time.sleep(30)

            # Post-deployment verification
            self._set_phase("verifying")
            self._log("Starting post-deployment verification...")
            
            run_id = os.path.basename(self.run_path)
            verification_result = VerificationAgent.verify(run_id)
            
            # Store verification result in metadata
            self._store_verification(verification_result)
            
            if verification_result["reachable"]:
                self._log(f"Verification successful: {verification_result['ip']} returned status {verification_result['status_code']}")
                self._set_phase("verified")
                self._set_phase("verified")
                self._update_status("completed")
                
                # Register deployment in database (Phase 2)
                try:
                    self._register_deployment(run_id)
                    self._log(f"Deployment {run_id} registered in database")
                except Exception as e:
                    self._log(f"WARNING: Failed to register deployment: {e}")

            else:
                self._log(f"Verification failed: {verification_result['ip']} is not reachable")
                self._set_phase("verified")
                self._update_status("deploy_success_verify_failed")
                
                # Even if verification fails, the resources exist, so register them
                try:
                    self._register_deployment(run_id)
                except Exception:
                    pass

        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            self._log(f"FATAL ERROR: {error_msg}")
            self._update_status("failed", error_msg)
            raise

        finally:
            self._cleanup_creds()
    
    def _store_verification(self, verification_result: Dict):
        """Store verification result in metadata.json."""
        metadata = {}
        if os.path.exists(self.metadata_path):
            try:
                with open(self.metadata_path, "r") as f:
                    metadata = json.load(f)
            except json.JSONDecodeError:
                metadata = {}
        
        metadata["verification"] = verification_result
        metadata["verification_timestamp"] = time.time()
        
        with open(self.metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)

    # --------------------------------------------------
    # READ OUTPUTS
    # --------------------------------------------------
    def _read_outputs(self) -> Dict:
        try:
            out = subprocess.check_output(
                [
                    "docker", "run", "--rm",
                    "-v", f"{self.run_path}:/workspace",
                    "terraform-runner",
                    "terraform", "-chdir=/workspace", "output", "-json",
                ],
                text=True,
            )

            raw = json.loads(out)
            return {k: v["value"] for k, v in raw.items()}

        except Exception as e:
            self._log(f"Failed to read outputs: {e}")
            return {}

    # --------------------------------------------------
    # REGISTRY (PHASE 2)
    # --------------------------------------------------
    def _register_deployment(self, run_id: str):
        """Parse terraform.tfstate and register all resources."""
        tfstate_path = os.path.join(self.run_path, "terraform.tfstate")
        if not os.path.exists(tfstate_path):
            return

        with open(tfstate_path, "r") as f:
            state = json.load(f)

        registry = DeploymentRegistry()
        
        # 1. Register Deployment
        deployment_id = registry.register_deployment(
            run_id=run_id,
            terraform_dir=self.run_path,
            state_file_path=tfstate_path,
            user_id="system" # TODO: Pass actual user_id
        )

        # 2. Extract Resources
        resources = []
        for module in state.get("resources", []):
            # "resources": [ { "type": "google_compute_instance", ... } ]
            # The top level resource object in state file v4
            pass
        
        # NOTE: 'resources' in state root is usually a flat list in simpler states
        # but standard parsing requires iterating modules.
        # However, for this project the generator creates a flat root module.
        
        raw_resources = state.get("resources", [])
        for r in raw_resources:
            # Each r is a resource block
            # instances list contains the actual created objects
            for instance in r.get("instances", []):
                # We want the resource name (e.g. "vm-1") and the GCP ID
                attrs = instance.get("attributes", {})
                
                # Best effort name resolution
                name = attrs.get("name") or getattr(r, "name", "unknown")
                id_val = attrs.get("id") or "unknown"
                
                resources.append({
                    "type": r.get("type"),
                    "name": name,
                    "id": id_val,
                    "metadata": attrs
                })

        registry.register_resources(deployment_id, resources)
