import os
import json
import subprocess
import google.generativeai as genai
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

class _Validator:
    """
    Internal validator helper.
    """
    def __init__(self, working_dir: str):
        self.working_dir = working_dir

    def run_command(self, command: str) -> Tuple[bool, str, str]:
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

    def validate(self) -> Dict[str, List[str]]:
        results = {
            "errors": [],
            "warnings": []
        }
        
        # 1. terraform init (needed before validate)
        print(f"[_Validator] Running terraform init in {self.working_dir}...")
        success, stdout, stderr = self.run_command("terraform init")
        if not success:
            results["errors"].append(f"Init failed: {stderr}")
            # If init fails, others will likely fail too, but we can try fmt
        
        # 2. terraform fmt
        print("[_Validator] Running terraform fmt...")
        success, stdout, stderr = self.run_command("terraform fmt -check")
        if not success:
            results["warnings"].append(f"Format issues: {stderr}")

        # 3. terraform validate
        print("[_Validator] Running terraform validate...")
        success, stdout, stderr = self.run_command("terraform validate -json")
        if not success:
            try:
                # Try to parse JSON output for better error messages
                issues = json.loads(stdout)
                for diag in issues.get('diagnostics', []):
                    results["errors"].append(f"{diag.get('summary')}: {diag.get('detail')}")
            except:
                results["errors"].append(f"Validation failed: {stderr or stdout}")

        return results

class LLMTerraformGenerator:
    def __init__(self, output_base_dir: str = "runs"):
        self.output_base_dir = output_base_dir
        # Use path relative to this file (backend/services/llm_terraform_generator.py)
        # leads to backend/prompts/terraform
        self.prompts_dir = Path(__file__).parent.parent / "prompts" / "terraform"
        print(f"[LLMTerraformGenerator] Prompts directory: {self.prompts_dir}")
        
        # Configure Gemini
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("Warning: GEMINI_API_KEY environment variable not set. LLM features will fail.")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-3-pro-preview') # Using a capable model

    def load_prompt(self, name: str) -> str:
        prompt_path = self.prompts_dir / f'{name}.txt'
        if prompt_path.exists():
            with open(prompt_path, 'r') as f:
                return f.read()
        print(f"[LLMTerraformGenerator] Warning: Prompt file not found: {prompt_path}")
        return ""

    def generate(self, run_id: str, user_request: str, history_context: str = "", max_iterations: int = 3) -> Dict[str, Any]:
        if not self.model:
            return {"success": False, "error": "Gemini model not initialized. Please set GEMINI_API_KEY."}

        run_dir = os.path.join(self.output_base_dir, run_id)
        os.makedirs(run_dir, exist_ok=True)

        print(f"[LLMTerraformGenerator] Generating for run_id: {run_id}")
        
        master_prompt = self.load_prompt('master')
        if not master_prompt:
             return {"success": False, "error": "Master prompt not found."}

        full_prompt = f"{master_prompt}\n\n{history_context}\n\nUSER REQUEST:\n{user_request}"
        
        try:
            print(f"[LLMTerraformGenerator] Calling LLM...")
            code = self._call_llm(full_prompt)
            print("[LLMTerraformGenerator] Code generation complete.")
            
            self._save_files(run_dir, code)
            
            # Iterative refinement
            last_validation_results = {}
            for i in range(max_iterations):
                print(f"[LLMTerraformGenerator] Validation pass {i+1}/{max_iterations}...")
                validator = _Validator(run_dir)
                validation_results = validator.validate()
                last_validation_results = validation_results
                
                if not validation_results["errors"]:
                    print("[LLMTerraformGenerator] Validation passed!")
                    return {
                        "success": True, 
                        "run_dir": run_dir, 
                        "files_generated": True,
                        "llm_response": code
                    }
                
                print(f"[LLMTerraformGenerator] Validation failed with {len(validation_results['errors'])} errors.")
                
                # Refine
                print("[LLMTerraformGenerator] Attempting to refine code...")
                code = self._refine(code, validation_results["errors"])
                self._save_files(run_dir, code)
            
            return {
                "success": False, 
                "error": "Max iterations reached without passing validation.",
                "validation_results": last_validation_results,
                "run_dir": run_dir,
                "llm_response": code
            }

        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    def refine_existing_code(self, run_id: str, user_request: str, history_context: str = "") -> Dict[str, Any]:
        """
        Refines existing code in a run directory based on a new user request.
        Reads current files, sends to LLM with request, saves and validates.
        """
        run_dir = os.path.join(self.output_base_dir, run_id)
        if not os.path.exists(run_dir):
             return {"success": False, "error": f"Run directory {run_dir} does not exist."}

        # Read current state
        current_code = self._read_all_tf_files(run_dir)
        
        # Create a prompt that asks to MODIFY existing code
        prompt = f"""
You are maintaining an existing Terraform codebase.
CURRENT CODE:
{current_code}

{history_context}

USER REQUEST:
{user_request}

INSTRUCTIONS:
1. Modify the code to satisfy the user request.
2. Return the COMPLETE content of any modified files.
3. If a file is unchanged, do NOT return it.
4. If a new file is needed, return it.
5. Use the format: ### filename
"""
        return self._execute_modification_loop(run_dir, prompt)

    def _execute_modification_loop(self, run_dir: str, initial_prompt: str, max_iterations: int = 3) -> Dict[str, Any]:
        try:
             # Initial Call
            print(f"[LLMTerraformGenerator] Calling LLM for modification...")
            code = self._call_llm(initial_prompt)
            self._save_files(run_dir, code)

            # Validation Loop
            last_validation_results = {}
            for i in range(max_iterations):
                print(f"[LLMTerraformGenerator] Validation pass {i+1}/{max_iterations}...")
                validator = _Validator(run_dir)
                validation_results = validator.validate()
                last_validation_results = validation_results
                
                if not validation_results["errors"]:
                    print("[LLMTerraformGenerator] Validation passed!")
                    return {
                        "success": True, 
                        "run_dir": run_dir, 
                        "llm_response": code
                    }
                
                print(f"[LLMTerraformGenerator] Validation failed with errors.")
                # Refine
                code = self._refine(code, validation_results["errors"])
                self._save_files(run_dir, code)

            return {
                "success": False, 
                "error": "Max iterations reached.",
                "validation_results": last_validation_results,
                "llm_response": code
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _refine(self, code: str, errors: List[str]) -> str:
        refine_prompt_template = self.load_prompt('refine')
        if not refine_prompt_template:
            raise ValueError("Refine prompt template not found.")
            
        error_text = "\n".join(errors)
        prompt = refine_prompt_template.format(errors=error_text, code=code)
        return self._call_llm(prompt)

    def _call_llm(self, prompt: str) -> str:
        if not self.model:
             raise Exception("Gemini model not initialized.")
        if not prompt or not prompt.strip():
            raise ValueError("Prompt is empty. Cannot call LLM.")
            
        print(f"[LLMTerraformGenerator] Sending prompt ({len(prompt)} chars)...")
        response = self.model.generate_content(prompt)
        return response.text

    def _save_files(self, output_dir: str, code: str):
        print(f"[LLMTerraformGenerator] Saving files to {output_dir}...")
        current_file = None
        file_content = []
        
        lines = code.split('\n')
        for line in lines:
            clean_line = line.strip()
            
            # Heuristic for file headers
            is_header = False
            potential_file = ""

            if clean_line.startswith('### '):
                # Check for Markdown headers that are NOT files (e.g. ### Implementation Notes)
                temp = clean_line.replace('### ', '').strip().replace('`', '').strip()
                # A valid filename usually has an extension (.) and shouldn't end with :
                if '.' in temp and not temp.endswith(':'):
                    is_header = True
                    potential_file = temp
            
            elif clean_line.endswith(':') and not clean_line.startswith(' ') and len(clean_line.split()) == 1 and '.' in clean_line:
                 is_header = True
                 potential_file = clean_line.replace(':', '').replace('`', '').strip()

            if is_header:
                # Save previous
                if current_file:
                    self._write_file(output_dir, current_file, '\n'.join(file_content))
                
                current_file = potential_file
                file_content = []
                print(f"Found file: {current_file}")
                continue
            
            elif clean_line.startswith('```'):
                continue
            else:
                if current_file:
                    file_content.append(line)
        
        # Save last
        if current_file and file_content:
            self._write_file(output_dir, current_file, '\n'.join(file_content))

    def _write_file(self, output_dir: str, filename: str, content: str):
        filename = Path(filename).name
        # Fix: .trim() is not valid python, use .strip()
        content = content.strip()
        file_path = Path(output_dir) / filename
        with open(file_path, 'w') as f:
            f.write(content)

    def _read_all_tf_files(self, run_dir: str) -> str:
        content = ""
        path = Path(run_dir)
        for file in path.glob("*.tf"):
            content += f"### {file.name}\n"
            content += file.read_text() + "\n\n"
        return content
