from services.llmchat.factory import get_llm
from services.schemas import TerraformFiles


class TerraformFixAgent:
    """
    Uses Gemini to automatically fix Terraform validation errors.
    """
    
    @staticmethod
    def fix(error: str, current_files: dict) -> TerraformFiles:
        """
        Fix Terraform validation errors using Gemini.
        
        Args:
            error: Terraform validate stderr output
            current_files: Dict of current .tf files {"main.tf": "...", "variables.tf": "..."}
            
        Returns:
            TerraformFiles: Pydantic instance with corrected files
        """
        llm = get_llm()
        
        # Build fix prompt
        files_content = "\n\n".join([
            f"=== {filename} ===\n{content}"
            for filename, content in current_files.items()
        ])
        
        system_prompt = """You are a Terraform expert. Fix the validation errors in the provided Terraform files.

RULES:
1. Return ONLY the corrected Terraform files
2. Do NOT add explanations or comments
3. Fix ONLY the errors mentioned in the stderr
4. Preserve all working code
5. Output valid HCL syntax

Common fixes:
- Add missing provider blocks
- Fix resource attribute typos
- Add missing required arguments
- Fix variable references
- Enable required GCP APIs in comments

Return the corrected files as JSON with these exact keys:
- main_tf: corrected main.tf content
- variables_tf: corrected variables.tf content  
- outputs_tf: corrected outputs.tf content
"""
        
        user_prompt = f"""TERRAFORM VALIDATION ERROR:
{error}

CURRENT FILES:
{files_content}

Fix the errors and return the corrected files."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Use Gemini with structured output
        fixed_files = llm.generate(messages, response_schema=TerraformFiles)
        
        return fixed_files
