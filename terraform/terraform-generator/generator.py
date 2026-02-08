import google.generativeai as genai
import os
import subprocess
import json
from pathlib import Path
from dotenv import load_dotenv
from validators.validators import Validator

# Load environment variables
load_dotenv()

class TerraformGenerator:
    def __init__(self):
        self.output_dir = Path('output')
        self.prompts_dir = Path('prompts')
        
        # Ensure output directory exists
        self.output_dir.mkdir(exist_ok=True)
        
        # Configure Gemini
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("Warning: GEMINI_API_KEY environment variable not set.")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-3-pro-preview')

    def load_prompt(self, name):
        prompt_path = self.prompts_dir / f'{name}.txt'
        if prompt_path.exists():
            with open(prompt_path, 'r') as f:
                return f.read()
        return ""

    def generate(self, user_request, max_iterations=3):
        if not self.model:
            print("Error: Gemini model not initialized. Please set GEMINI_API_KEY.")
            return

        print(f"Generating Terraform code for: {user_request}")
        
        master_prompt = self.load_prompt('master')
        full_prompt = f"{master_prompt}\n\nUSER REQUEST:\n{user_request}"
        
        try:
            print(f"Calling LLM with model: {self.model.model_name}")
            code = self._call_llm(full_prompt)
            print("Code generation complete. Raw response length:", len(code))
            print("First 100 chars of response:", code[:100])
            self._save_files(code)
            
            # Iterative refinement
            for i in range(max_iterations):
                print(f"\nMatching validation pass {i+1}/{max_iterations}...")
                validator = Validator(self.output_dir)
                validation_results = validator.validate()
                
                if not validation_results["errors"]:
                    print("\nValidation passed!")
                    if validation_results["warnings"]:
                        print("Warnings:")
                        for warning in validation_results["warnings"]:
                            print(f"- {warning}")
                    break
                
                print("\nValidation failed with errors:")
                for error in validation_results["errors"]:
                    print(f"- {error}")
                
                print("\nAttempting to refine code...")
                code = self._refine(code, validation_results["errors"])
                self._save_files(code)
            
            return self.output_dir
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error during generation: {e}")
            return None

    def _refine(self, code, errors):
        refine_prompt_template = self.load_prompt('refine')
        error_text = "\n".join(errors)
        
        # We need to pass the errors and the code to the LLM
        prompt = refine_prompt_template.format(errors=error_text, code=code)
        
        refined_code = self._call_llm(prompt)
        print("Code refined.")
        return refined_code

    def _call_llm(self, prompt):
        if not self.model:
             raise Exception("Gemini model not initialized. Check GEMINI_API_KEY.")
        
        response = self.model.generate_content(prompt)
        return response.text

    def _save_files(self, code):
        print("Saving generated files...")
        current_file = None
        file_content = []
        
        lines = code.split('\n')
        for line in lines:
            # Handle headers like ### filename or just filename:
            clean_line = line.strip()
            
            # Reset file capture on new header
            if clean_line.startswith('### ') or (clean_line.endswith(':') and not clean_line.startswith(' ') and len(clean_line.split()) == 1):
                # Save previous file
                if current_file:
                    self._write_file(current_file, '\n'.join(file_content))
                
                # Start new file
                if clean_line.startswith('### '):
                    current_file = clean_line.replace('### ', '').strip()
                else:
                    current_file = clean_line.replace(':', '').strip()
                
                file_content = []
                print(f"Found file: {current_file}")
            # Skip code block markers if they are standalone
            elif clean_line.startswith('```'):
                continue
            else:
                if current_file:
                    file_content.append(line)
        
        # Save the last file
        if current_file and file_content:
            self._write_file(current_file, '\n'.join(file_content))

    def _write_file(self, filename, content):
        # Remove any path traversal or invalid chars to be safe
        filename = Path(filename).name
        
        # Strip leading/trailing whitespace from content
        content = content.strip()
        
        file_path = self.output_dir / filename
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Saved {filename}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        # Join all arguments to form the prompt
        prompt = " ".join(sys.argv[1:])
    else:
        prompt = "Create a secure VPC with public and private subnets"
        
    gen = TerraformGenerator()
    gen.generate(prompt)
