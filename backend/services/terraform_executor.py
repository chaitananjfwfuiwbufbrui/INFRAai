import os
import subprocess
import tempfile
import shutil
import json

import time
class TerraformExecutor:
    def __init__(self, run_path: str, project_id: str, sa_key_json: str):
        self.run_path = os.path.abspath(run_path)
        self.project_id = project_id
        self.sa_key_json = sa_key_json

        if not os.path.exists(self.run_path):
            raise FileNotFoundError("Run path not found")

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

    def run(self, action: str = "apply", auto_approve: bool = False):
        if action not in ("apply", "destroy"):
            raise ValueError("Action must be 'apply' or 'destroy'")

        if action == "destroy" and not auto_approve:
            raise RuntimeError("Destroy requires auto_approve=True")

        creds_dir = self._prepare_creds()
        start_time = time.time()

        try:
            cmd = [
                "docker", "run", "--rm",
                "--memory=512m",
                "--cpus=1",
                "-e", f"TF_ACTION={action}",
                "-e", "GOOGLE_APPLICATION_CREDENTIALS=/creds/gcp.json",
                "-e", f"TF_VAR_project_id={self.project_id}",
                "-v", f"{self.run_path}:/workspace",
                "-v", f"{creds_dir}:/creds:ro",
                "terraform-runner"
            ]

            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            duration = int(time.time() - start_time)

            if result.returncode != 0:
                raise RuntimeError(result.stderr)

            outputs = {}
            if action == "apply":
                outputs = self._read_outputs()

            return {
                "action": action,
                "duration_seconds": duration,
                "outputs": outputs,
                "stdout": result.stdout
            }

        finally:
            self._cleanup_creds()

    def _read_outputs(self):
        try:
            out = subprocess.check_output(
                ["docker", "run", "--rm",
                "-v", f"{self.run_path}:/workspace",
                "terraform-runner",
                "terraform", "output", "-json"],
                text=True
            )

            raw = json.loads(out)
            return {k: v["value"] for k, v in raw.items()}

        except Exception:
            return {}
# from terraform_executor import TerraformExecutor

# with open(r"C:\Users\Venkata Chaitanya\Desktop\INFRAai\backend\services\s.json", "r") as f:
#     sa_key = f.read()

# executor = TerraformExecutor(
#     run_path="runs/run_20260115_063824_0ed6d7",
#     project_id="sahayak-468715",
#     sa_key_json=sa_key
# )

# # executor.run("destroy")
# executor.run("apply")