import subprocess
from pathlib import Path
import json

class Validator:
    def __init__(self, working_dir):
        self.working_dir = Path(working_dir)

    def run_command(self, command):
        try:
            # Use shell=True for windows compatibility with PATH
            result = subprocess.run(
                command,
                cwd=self.working_dir,
                capture_output=True,
                text=True,
                shell=True
            )
            return result.returncode == 0, result.stdout, result.stderr
        except Exception as e:
            return False, "", str(e)

    def validate(self):
        results = {
            "errors": [],
            "warnings": []
        }
        
        # 1. terraform init (needed before validate)
        print("Running terraform init...")
        success, stdout, stderr = self.run_command("terraform init")
        if not success:
            results["errors"].append(f"Init failed: {stderr}")
            # If init fails, others will likely fail too, but we can try fmt
        
        # 2. terraform fmt
        print("Running terraform fmt...")
        success, stdout, stderr = self.run_command("terraform fmt -check")
        if not success:
            results["warnings"].append(f"Format issues: {stderr}")

        # 3. terraform validate
        print("Running terraform validate...")
        success, stdout, stderr = self.run_command("terraform validate -json")
        if not success:
            try:
                # Try to parse JSON output for better error messages
                issues = json.loads(stdout)
                for diag in issues.get('diagnostics', []):
                    results["errors"].append(f"{diag.get('summary')}: {diag.get('detail')}")
            except:
                results["errors"].append(f"Validation failed: {stderr or stdout}")

        # 4. tflint (if available)
        print("Running tflint...")
        success, stdout, stderr = self.run_command("tflint --format json")
        if not success:
             # tflint returns non-zero on issues if configured, or if command not found
            if "is not recognized" in stderr:
                results["warnings"].append("tflint not installed or not in PATH")
            else:
                 results["warnings"].append(f"tflint issues: {stdout or stderr}")

        # 5. tfsec (if available)
        print("Running tfsec...")
        success, stdout, stderr = self.run_command("tfsec . --format json")
        if not success:
             if "is not recognized" in stderr:
                results["warnings"].append("tfsec not installed or not in PATH")
             else:
                results["errors"].append(f"tfsec security issues: {stdout or stderr}")

        return results
