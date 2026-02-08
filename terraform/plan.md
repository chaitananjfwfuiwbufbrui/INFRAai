2-DAY TERRAFORM CODE GENERATOR
Rapid Implementation Guide
⚡ MISSION: Near-Perfect Terraform Code in 2 Days
One prompt in → Production-ready code out


DAY 1: FOUNDATION & CORE SYSTEM
Goal: Build working prototype that generates basic Terraform code from prompts
Morning (8 AM - 12 PM): Setup & Master Prompt
Hour 1-2: Environment Setup (8-10 AM)
Install required tools: Terraform, Python, Node.js
Setup LLM access (Claude API key or OpenAI)
Install validation tools: tflint, tfsec, terraform-docs
Create project structure:
terraform-generator/├── prompts/          # Master prompts├── templates/        # Terraform templates├── validators/       # Validation scripts├── tests/           # Test cases└── output/          # Generated code
Hour 3-4: Master Prompt Creation (10 AM - 12 PM)
Create the SUPER PROMPT that does 80% of the work:
MASTER PROMPT TEMPLATE
You are a world-class Terraform expert. Generate COMPLETE, PRODUCTION-READY Terraform code.
CRITICAL RULES:
1. ALWAYS create these files: main.tf, variables.tf, outputs.tf, versions.tf, README.md
2. ALL resources must have tags (Name, Environment, ManagedBy)
3. NEVER hardcode - use variables
4. Enable encryption by default (at-rest and in-transit)
5. Follow least privilege for IAM
6. Include comprehensive outputs
7. Write detailed README with examples
THINKING PROCESS:
Before generating code, analyze in <thinking> tags:
- What provider? (AWS/Azure/GCP)
- What resources needed?
- What dependencies exist?
- What security controls needed?
- What should be variable vs fixed?
OUTPUT FORMAT: Provide each file with clear headers


Afternoon (1 PM - 6 PM): Build Core Generator
Hour 5-6: Basic Generator Script (1-3 PM)
Create generator.py - the heart of the system:
generator.py - Python Implementation
import anthropicimport osimport subprocessdef generate_terraform(user_prompt):    # Load master prompt    with open('prompts/master.txt', 'r') as f:        master_prompt = f.read()        # Call Claude    client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))        response = client.messages.create(        model="claude-sonnet-4-20250514",        max_tokens=8000,        messages=[{            "role": "user",            "content": master_prompt + "\n\nUSER REQUEST:\n" + user_prompt        }]    )        # Parse response and save files    generated_code = response.content[0].text    save_terraform_files(generated_code)        # Validate    return validate_code()


Hour 7-8: Validation System (3-5 PM)
Create validators.py - ensures quality:
Level 1: terraform fmt -check && terraform validate
Level 2: tflint --recursive
Level 3: tfsec . --soft-fail
Level 4: terraform plan (dry run)

Hour 9: Self-Correction Loop (5-6 PM)
Add iterative refinement:
Self-Correction Logic
def refine_code(code, errors, max_iterations=3):    for i in range(max_iterations):        if not errors:            return code                # Send errors back to LLM        refinement_prompt = f"""The code failed validation:{errors}Fix these issues and regenerate ONLY the affected files."""                # Get fixed code        code = call_llm(refinement_prompt)        errors = validate_code(code)        return code


Evening: Test & Refine (6-8 PM)
Test with 5 simple prompts:
"Create a VPC with public and private subnets"
"Deploy an EC2 instance with security group"
"Create an S3 bucket with encryption"
"Setup RDS PostgreSQL database"
"Create Lambda function with API Gateway"
Fix issues, update master prompt based on failures
Document what works and what doesn't

DAY 2: ENHANCEMENT & PERFECTION
Goal: Add advanced features and achieve 90%+ correctness rate
Morning (8 AM - 12 PM): Advanced Features
Hour 1-2: Template Library (8-10 AM)
Create reusable templates for speed:
templates/aws/vpc.tf: Standard VPC setup
templates/aws/web-app.tf: ALB + ASG + RDS
templates/aws/serverless.tf: Lambda + API Gateway
templates/security-baseline.tf: Security best practices
Update generator to use templates when pattern matches

Hour 3-4: Context Enhancement (10 AM - 12 PM)
Enhance prompts with examples (few-shot learning):
Enhanced Prompt with Examples
Add to master prompt:
EXAMPLE 1 - S3 Bucket:User: "Create S3 bucket for static website"Output:- main.tf: aws_s3_bucket with versioning, encryption- variables.tf: bucket_name, environment, tags- outputs.tf: bucket_id, bucket_arn, website_endpoint- Enables: server-side encryption, versioning, logging- Security: Block public access, enforce SSLEXAMPLE 2 - EC2 Instance:User: "Launch EC2 for web server"Output:- Security group with only necessary ports- IAM role with minimal permissions- EBS encryption enabled- User data for initial setup- Variables for instance_type, ami_id, key_name


Afternoon (1 PM - 6 PM): Polish & Testing
Hour 5-6: Security Hardening (1-3 PM)
Add automatic security enhancements:
Security Hardening Prompt
After generating code, run security_hardener():def security_hardener(code):    hardening_prompt = """Review this Terraform code and apply security hardening:1. Add encryption_at_rest for all storage (S3, EBS, RDS)2. Add encryption_in_transit (SSL/TLS)3. Enable logging (CloudTrail, VPC Flow Logs, ALB logs)4. Add backup/snapshot policies5. Implement least privilege IAM6. Add security group restrictions7. Enable MFA delete on S3 where applicable8. Add tags: Environment, ManagedBy, SecurityLevelReturn ONLY the hardened code sections that changed."""    return call_llm(hardening_prompt + code)


Hour 7-8: Comprehensive Testing (3-5 PM)
Test with 20 diverse scenarios:
Category
Test Cases
Simple
S3, EC2, RDS, VPC, Lambda
Medium
Web app, API backend, Data pipeline
Complex
EKS cluster, Multi-tier app, Microservices
Edge Cases
Vague prompts, Multiple providers, Compliance


For each test:
Run generation
Validate with all tools
Run terraform plan
Manually review for quality
Document success rate and issues

Hour 9: Final Optimization (5-6 PM)
Update master prompt based on test failures
Add common error fixes to refinement prompt
Create quick reference guide
Package everything for easy deployment

SUCCESS CRITERIA
Metric
Target
Status
Syntax Correctness
100%
terraform validate
Security Pass
>90%
tfsec scan
Functional
>85%
terraform plan works
Complete Files
100%
All 5 files present
Generation Time
<30 sec
Single LLM call


CRITICAL CODE SNIPPETS
Complete Generator Implementation
#!/usr/bin/env python3import anthropicimport osimport subprocessimport jsonfrom pathlib import Pathclass TerraformGenerator:    def __init__(self):        self.client = anthropic.Anthropic(            api_key=os.getenv('ANTHROPIC_API_KEY')        )        self.output_dir = Path('output')            def load_prompt(self, name):        with open(f'prompts/{name}.txt', 'r') as f:            return f.read()        def generate(self, user_request, max_iterations=3):        master_prompt = self.load_prompt('master')        code = self._call_llm(master_prompt + user_request)                # Iterative refinement        for i in range(max_iterations):            errors = self._validate(code)            if not errors:                break            code = self._refine(code, errors)                # Security hardening        code = self._harden(code)                # Save files        self._save_files(code)        return self.output_dir        def _call_llm(self, prompt):        response = self.client.messages.create(            model="claude-sonnet-4-20250514",            max_tokens=8000,            messages=[{"role": "user", "content": prompt}]        )        return response.content[0].text        def _validate(self, code):        self._save_temp(code)        errors = []                # Run validations        cmds = [            'terraform fmt -check',            'terraform validate',            'tflint',            'tfsec . --format json'        ]                for cmd in cmds:            result = subprocess.run(                cmd.split(),                capture_output=True,                cwd=self.output_dir            )            if result.returncode != 0:                errors.append(f"{cmd}: {result.stderr.decode()}")                return errors        def _refine(self, code, errors):        refine_prompt = self.load_prompt('refine')        error_text = "\n".join(errors)        return self._call_llm(            f"{refine_prompt}\n\nERRORS:\n{error_text}\n\nCODE:\n{code}"        )        def _harden(self, code):        harden_prompt = self.load_prompt('harden')        return self._call_llm(f"{harden_prompt}\n\n{code}")# Usageif __name__ == "__main__":    gen = TerraformGenerator()    output = gen.generate("Create a secure VPC with public and private subnets")    print(f"Generated code in: {output}")


QUICK START GUIDE
Step 1: Install Dependencies
# Install Terraformwget https://releases.hashicorp.com/terraform/1.7.0/terraform_1.7.0_linux_amd64.zipunzip terraform_1.7.0_linux_amd64.zipsudo mv terraform /usr/local/bin/# Install validation toolsbrew install tflint tfsec# orcurl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bashgo install github.com/aquasecurity/tfsec/cmd/tfsec@latest# Install Python dependenciespip install anthropic python-dotenv
Step 2: Set Up API Key
export ANTHROPIC_API_KEY="your-api-key-here"# or create .env fileecho "ANTHROPIC_API_KEY=your-key" > .env
Step 3: Run Generator
python generator.py "Create a VPC with public and private subnets"# Output will be in ./output/ directory with:# - main.tf# - variables.tf# - outputs.tf# - versions.tf# - README.md

EXPERT TIPS FOR SUCCESS
Master Prompt is Everything: Spend 50% of time perfecting it
Test Early, Test Often: Run real validations on generated code
Use Examples: 3-5 high-quality examples boost accuracy 40%
Iterate Automatically: Let the LLM fix its own errors
Security by Default: Always run hardening pass
Template + LLM: Combine pre-built templates with AI customization
Measure Everything: Track success rate, time, errors
Start Simple: Perfect single resources before complex architectures

🎯 YOU CAN DO THIS IN 2 DAYS!
Focus on the core loop: Prompt → Generate → Validate → Refine
Everything else is optimization

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
End of 2-Day Implementation Plan
