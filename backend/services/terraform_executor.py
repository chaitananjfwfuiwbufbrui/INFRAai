import os
import subprocess
import shutil
import json
import time
from typing import Dict


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
    def _set_phase(self, phase: str):
        with open(self.status_path, "w") as f:
            json.dump({
                "status": "running",
                "phase": phase,
                "updated_at": time.time()
            }, f, indent=2)
    # --------------------------------------------------
    # LOGGING + STATUS
    # --------------------------------------------------
    def _log(self, message: str):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        with open(self.log_path, "a") as f:
            f.write(f"[{timestamp}] {message}\n")

    def _update_status(self, status: str):
        with open(self.status_path, "w") as f:
            json.dump(
                {
                    "status": status,
                    "updated_at": time.time(),
                },
                f,
                indent=2,
            )

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
    # MAIN EXECUTION
    # --------------------------------------------------
    def run(self, action: str = "apply", auto_approve: bool = False):
        creds_dir = self._prepare_creds()

        self._update_status("running")
        self._set_phase("starting")
        self._log(f"Terraform {action} started")

        try:
            self._set_phase("initializing")
            
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

            for attempt in range(3):
                self._set_phase(f"{action}_attempt_{attempt+1}")
                self._log(f"Attempt {attempt + 1} started")

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
                    self._update_status("failed")
                    raise RuntimeError("Terraform runner container failed")

                if process.returncode == 0:
                    break

                self._set_phase("retrying_after_gcp_error")
                time.sleep(30)

            self._set_phase("finalizing")
            self._update_status("completed")

        except Exception as e:
            self._update_status("failed")
            self._log(str(e))
            raise

        finally:
            self._cleanup_creds()

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
