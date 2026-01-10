import os
import subprocess
import tempfile
import shutil


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

    def run(self, action: str = "apply"):
        """
        action: apply | destroy
        """
        creds_dir = self._prepare_creds()
        if action not in ("apply", "destroy"):
            raise ValueError("Action must be 'apply' or 'destroy'")

        if action == "destroy":
            confirm = input("⚠️ This will DESTROY all infra. Type 'DESTROY' to confirm: ")
            if confirm != "DESTROY":
                print("❌ Destroy aborted")
                return
        try:
            cmd = [
                "docker", "run", "--rm",
                "--memory=512m",
                "--cpus=1",
                "-e", f"TF_ACTION={action}",
                "-e", "GOOGLE_APPLICATION_CREDENTIALS=/creds/gcp.json",
                "-v", f"{self.run_path}:/workspace",
                "-v", f"{creds_dir}:/creds:ro",
                "terraform-runner"
            ]

            print("▶ Running:", " ".join(cmd))
            subprocess.run(cmd, check=True)

        finally:
            self._cleanup_creds()
# from terraform_executor import TerraformExecutor

# with open("ters.json") as f:
#     sa_key = f.read()

# executor = TerraformExecutor(
#     run_path="runs/1233",
#     project_id="my-gcp-project-id",
#     sa_key_json=sa_key
# )

# executor.run("destroy")
# executor.run("apply")