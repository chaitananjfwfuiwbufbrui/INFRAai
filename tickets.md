INFRAai Atomic Engineering Tickets
Generated: 2026-02-01
Source: 
planner.md
 + 
migration_audit.md

Total Tickets: 43

PHASE 1: LLM Migration (4 tickets)
TICKET P1-001
GOAL: Add Gemini provider class to LLM factory
FILES / MODULES:

backend/services/llmchat/factory.py
backend/.env
INPUT SCHEMAS:

# None - infrastructure only
OUTPUT SCHEMAS:

class GeminiProvider:
    def generate(self, messages: List[dict], response_schema: Optional[BaseModel] = None) -> Union[str, BaseModel]:
        # Returns string or Pydantic instance
ACCEPTANCE CRITERIA:

 GeminiProvider class added to factory.py
 Uses google-genai SDK (pip install google-genai)
 Model string: gemini-2.5-pro
 Supports response_schema parameter for structured JSON output
 Routes via LLM_PROVIDER=gemini environment variable
 Conforms to existing provider interface: 
generate(messages) → text
BLOCKERS: None

TICKET P1-002
GOAL: Define Pydantic schemas for structured LLM outputs
FILES / MODULES:

backend/services/schemas.py (new file)
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

class MonitoringPolicy(BaseModel):
    resource_ref: str
    metric_name: str
    metric_path: str
    threshold: float
    duration: str
    severity: str
class InfraPlan(BaseModel):
    cloud: str
    stack_type: str
    region: str
    machine_type: str
    autoscaling: bool
    estimated_cost_usd: float
    risk_flags: List[str]
    resources: List[str]
    monitoring: List[MonitoringPolicy]
class OpsDecision(BaseModel):
    severity: str
    recommended_action: str
    requires_approval: bool
    confidence: float
    reasoning: str
class TerraformFiles(BaseModel):
    main_tf: str
    variables_tf: str
    outputs_tf: str
ACCEPTANCE CRITERIA:

 All 4 schemas defined in schemas.py
 Import BaseModel from pydantic
 Schemas match migration_audit.md Section 1.1 exactly
BLOCKERS: None

TICKET P1-003
GOAL: Update graph_generator.py to use Gemini LLM factory
FILES / MODULES:

backend/services/graph_generator.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS: None

ACCEPTANCE CRITERIA:

 Replace Groq client instantiation with factory call
 Use LLM_PROVIDER environment variable
 No prompt text changes required
 Existing graph generation logic preserved
BLOCKERS: P1-001 (GeminiProvider must exist)

TICKET P1-004
GOAL: Integration test - Validate Gemini LLM migration
FILES / MODULES:

backend/main.py
 (POST /generate-graph endpoint)
Manual curl test
INPUT SCHEMAS:

{
  "prompt": "Deploy a basic backend API with PostgreSQL on GCP"
}
OUTPUT SCHEMAS:

{
  "summary": "...",
  "graph": { ... }
}
ACCEPTANCE CRITERIA:

 POST /generate-graph returns valid JSON graph
 No Groq references in logs
 Gemini API key configured in .env
 Response time <10 seconds
BLOCKERS: P1-001, P1-002, P1-003

PHASE 2: Planner Agent (5 tickets)
TICKET P2-001
GOAL: Create planner system prompt
FILES / MODULES:

backend/services/prompts/planner.py (new file)
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

PLANNER_SYSTEM_PROMPT = """
You are an infrastructure architect...
[Detailed prompt content]
"""
ACCEPTANCE CRITERIA:

 Prompt instructs to pick GCP only
 Choose region and machine type based on cost/latency
 Estimate monthly cost (rule-based table)
 Flag risks: open firewalls, cost spikes, no redundancy
 Output format conforms to InfraPlan schema
BLOCKERS: P1-002 (InfraPlan schema must exist)

TICKET P2-002
GOAL: Implement PlannerAgent.plan() method
FILES / MODULES:

backend/services/planner_agent.py (new file)
INPUT SCHEMAS:

goal: str  # User's natural language request
OUTPUT SCHEMAS:

InfraPlan  # Pydantic instance
ACCEPTANCE CRITERIA:

 PlannerAgent class created
 plan(goal: str) -> InfraPlan method implemented
 Uses Gemini with response_schema=InfraPlan
 Imports PLANNER_SYSTEM_PROMPT from prompts/planner.py
 Returns structured InfraPlan object
BLOCKERS: P1-001, P1-002, P2-001

TICKET P2-003
GOAL: Add cost estimation lookup table
FILES / MODULES:

backend/services/planner_agent.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

COST_TABLE = {
    "e2-standard-4": 0.134,  # USD per hour
    "n1-standard-2": 0.095,
    # ...
}
ACCEPTANCE CRITERIA:

 Cost table with 5+ GCP machine types
 Monthly cost calculation: COST_TABLE[machine_type] * 730
 Used in planner prompt context
BLOCKERS: None

TICKET P2-004
GOAL: Integrate PlannerAgent into POST /generate-graph
FILES / MODULES:

backend/main.py
INPUT SCHEMAS:

prompt: str
OUTPUT SCHEMAS:

{
  "plan": {
    "cloud": "gcp",
    "stack_type": "backend_api",
    "region": "asia-south1",
    "machine_type": "e2-standard-4",
    "autoscaling": false,
    "estimated_cost_usd": 82.0,
    "risk_flags": ["firewall"],
    "resources": ["compute_instance"],
    "monitoring": []
  },
  "summary": "...",
  "graph": { ... }
}
ACCEPTANCE CRITERIA:

 Flow: prompt → PlannerAgent.plan() → InfraPlan → graph_generator
 Plan included in API response
 Graph generator receives plan as context
 Response schema matches migration_audit.md Section 1.2
BLOCKERS: P2-002

TICKET P2-005
GOAL: Frontend - Display plan summary on Landing page
FILES / MODULES:

frontend/cloud-canvas-gcp/src/pages/Landing.tsx
INPUT SCHEMAS:

plan: {
  cloud: string;
  region: string;
  estimated_cost_usd: number;
  risk_flags: string[];
}
OUTPUT SCHEMAS: None (UI only)

ACCEPTANCE CRITERIA:

 Plan summary card displayed after graph generation
 Shows: cloud, region, estimated cost, risk flags
 Risk flags shown as warning badges
 Cost formatted as USD/month
BLOCKERS: P2-004

PHASE 3: Terraform Validation & Auto-Fix (5 tickets)
TICKET P3-001
GOAL: Add terraform validate command wrapper
FILES / MODULES:

backend/services/terraform_executor.py
INPUT SCHEMAS:

run_id: str
OUTPUT SCHEMAS:

{
    "success": bool,
    "stderr": str
}
ACCEPTANCE CRITERIA:

 terraform_validate(run_id) function added
 Runs docker exec with terraform validate
 Returns success boolean + stderr output
 Does not modify any files
BLOCKERS: None

TICKET P3-002
GOAL: Create TerraformFixAgent with Gemini auto-fix
FILES / MODULES:

backend/services/terraform_fix_agent.py (new file)
INPUT SCHEMAS:

error: str  # terraform validate stderr
current_files: dict  # { "main.tf": "...", "variables.tf": "..." }
OUTPUT SCHEMAS:

TerraformFiles  # Pydantic instance with corrected files
ACCEPTANCE CRITERIA:

 TerraformFixAgent.fix() static method implemented
 Uses Gemini with response_schema=TerraformFiles
 Prompt includes exact stderr and all current .tf files
 Returns corrected files only (no explanations)
BLOCKERS: P1-001, P1-002

TICKET P3-003
GOAL: Add validation loop to terraform executor
FILES / MODULES:

backend/services/terraform_executor.py
INPUT SCHEMAS:

run_id: str
OUTPUT SCHEMAS: None (modifies run state)

ACCEPTANCE CRITERIA:

 Validation loop runs before terraform apply
 MAX_FIX_ATTEMPTS = 3
 On validation failure: calls TerraformFixAgent.fix()
 Writes fixed files back to run directory
 Logs each fix attempt
 Fails with validation_exhausted status after 3 attempts
 Stderr deduplication guard (prevent infinite loops)
BLOCKERS: P3-001, P3-002

TICKET P3-004
GOAL: Update executor status phases
FILES / MODULES:

backend/services/terraform_executor.py
Database run status table
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

# New phases:
# starting → initializing → validating → fix_attempt_1 → 
# fix_attempt_2 → planning → applying → finalizing
ACCEPTANCE CRITERIA:

 Status progression includes validation phases
 Fix attempt phases numbered (1, 2, 3)
 Frontend-compatible status strings
 Timestamps updated on each phase transition
BLOCKERS: P3-003

TICKET P3-005
GOAL: Add stderr deduplication guard
FILES / MODULES:

backend/services/terraform_executor.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS: None

ACCEPTANCE CRITERIA:

 Compare stderr between consecutive fix attempts
 If identical for 2 attempts: raise ValidationError
 Error message: "LLM fix not converging"
 Prevents Gemini hallucination loops
BLOCKERS: P3-003

PHASE 4: Post-Deployment Verification (4 tickets)
TICKET P4-001
GOAL: Create VerificationAgent with HTTP health check
FILES / MODULES:

backend/services/verification_agent.py (new file)
INPUT SCHEMAS:

run_id: str
OUTPUT SCHEMAS:

{
    "reachable": bool,
    "ip": str,
    "status_code": Optional[int]
}
ACCEPTANCE CRITERIA:

 VerificationAgent.verify(run_id) static method
 Extracts public IP from terraform output
 HTTP GET to http://{ip}/
 5 retry attempts, 10s apart
 Timeout: 5 seconds per attempt
 HTTP 200-299 considered success (NOT <500)
 Returns reachable, IP, status_code
BLOCKERS: None

TICKET P4-002
GOAL: Extract public IP from terraform output
FILES / MODULES:

backend/services/verification_agent.py
INPUT SCHEMAS:

run_id: str
OUTPUT SCHEMAS:

ip: str  # e.g. "34.x.x.x"
ACCEPTANCE CRITERIA:

 extract_public_ip(run_id) helper function
 Parses terraform output -json
 Looks for external_ip or instance_ip keys
 Returns first valid IP found
 Raises error if no IP found
BLOCKERS: None

TICKET P4-003
GOAL: Integrate verification into terraform executor
FILES / MODULES:

backend/services/terraform_executor.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS: None

ACCEPTANCE CRITERIA:

 After successful terraform apply, call VerificationAgent.verify()
 If reachable: set status to completed
 If not reachable: set status to deploy_success_verify_failed
 Store verification result in run metadata
BLOCKERS: P4-001, P4-002

TICKET P4-004
GOAL: Add verification field to GET /runs/{run_id}/status
FILES / MODULES:

backend/main.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

{
  "status": "completed",
  "phase": "verified",
  "updated_at": 1234567890.0,
  "verification": {
    "reachable": true,
    "ip": "34.x.x.x",
    "status_code": 200
  }
}
ACCEPTANCE CRITERIA:

 Response includes verification object
 Only present if verification was run
 Schema matches migration_audit.md Section 1.2
BLOCKERS: P4-003

PHASE 5: Autonomous Monitoring (7 tickets)
TICKET P5-001
GOAL: Create metric profiles registry
FILES / MODULES:

backend/services/monitoring/metric_profiles.py (new file)
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

METRIC_PROFILES = {
    "google_compute_instance": [
        {
            "name": "cpu_high",
            "metric": "compute.googleapis.com/instance/cpu/utilization",
            "threshold": 0.80,
            "duration": "60s",
            "severity": "critical"
        },
        # ... disk_read_high
    ],
    "google_sql_database_instance": [ ... ],
    "google_compute_instance_group_manager": [ ... ]
}
ACCEPTANCE CRITERIA:

 Dictionary with 3 resource types
 Each resource has 2+ metric profiles
 Each profile has: name, metric path, threshold, duration, severity
 Matches planner.md Phase 5 Task 5.1
BLOCKERS: None

TICKET P5-002
GOAL: Add monitoring field to InfraPlan schema
FILES / MODULES:

backend/services/schemas.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

class InfraPlan(BaseModel):
    # ... existing fields
    monitoring: List[MonitoringPolicy]  # NEW
ACCEPTANCE CRITERIA:

 monitoring field added to InfraPlan
 Type: List[MonitoringPolicy]
 MonitoringPolicy schema already exists (P1-002)
BLOCKERS: P1-002

TICKET P5-003
GOAL: Implement _bind_monitoring() in PlannerAgent
FILES / MODULES:

backend/services/planner_agent.py
INPUT SCHEMAS:

plan: InfraPlan  # with resources populated
OUTPUT SCHEMAS:

List[MonitoringPolicy]
ACCEPTANCE CRITERIA:

 _bind_monitoring(plan) private method
 Iterates over plan.resources
 Looks up METRIC_PROFILES for each resource type
 Creates MonitoringPolicy instances
 Returns list of monitoring policies
 Called after Gemini generates base plan
BLOCKERS: P5-001, P5-002, P2-002

TICKET P5-004
GOAL: Generate Terraform monitoring resources (notification channel)
FILES / MODULES:

backend/services/terraform_generator.py
INPUT SCHEMAS:

ops_webhook_url: str  # from ENV
OUTPUT SCHEMAS:

resource "google_monitoring_notification_channel" "ops_webhook" {
  project      = var.project_id
  display_name = "INFRAai Ops Webhook"
  type         = "webhook_tokenauth"
  labels = {
    url = var.ops_webhook_url
  }
}
ACCEPTANCE CRITERIA:

 Webhook notification channel template created
 Uses var.ops_webhook_url (injected at runtime)
 Single channel per deployment
 Included in main.tf generation
BLOCKERS: None

TICKET P5-005
GOAL: Generate Terraform monitoring resources (alert policies)
FILES / MODULES:

backend/services/terraform_generator.py
INPUT SCHEMAS:

plan.monitoring: List[MonitoringPolicy]
OUTPUT SCHEMAS:

resource "google_monitoring_alert_policy" "cpu_high" {
  project      = var.project_id
  display_name = "backend-vm-1 — cpu_high"
  # ... condition_threshold, notification_channels
}
ACCEPTANCE CRITERIA:

 generate_monitoring_tf(plan) function
 Loops over plan.monitoring
 One alert policy resource per monitoring entry
 Uses filter with resource instance_name
 References notification channel ID
 Appended to main.tf
BLOCKERS: P5-003, P5-004

TICKET P5-006
GOAL: Create ops_alerts database table
FILES / MODULES:

backend/db_init.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

CREATE TABLE ops_alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_name     TEXT,
    resource        TEXT,
    resource_type   TEXT,
    cloud           TEXT DEFAULT 'gcp',
    metric          TEXT,
    value           REAL,
    severity        TEXT,
    decision_json   TEXT,
    status          TEXT DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ops_alerts_status ON ops_alerts(status);
CREATE INDEX idx_ops_alerts_resource_type ON ops_alerts(resource_type);
ACCEPTANCE CRITERIA:

 Table created in SQLite database
 All fields match schema
 Indexes created for filtering
 Migration script runnable
BLOCKERS: None

TICKET P5-007
GOAL: Create POST /ops/webhook endpoint with alert normalization
FILES / MODULES:

backend/main.py
INPUT SCHEMAS:

{
  "incident": {
    "policy_name": "...",
    "condition": { "metricType": "...", "currentValue": 0.85 },
    "resource": { "labels": { "instance_name": "..." }, "type": "..." },
    "severity": "critical"
  }
}
OUTPUT SCHEMAS:

{
  "received": true,
  "alert_id": 123
}
ACCEPTANCE CRITERIA:

 POST /ops/webhook endpoint created
 Normalizes GCP webhook payload to flat dict
 Extracts: policy_name, resource, metric, value, severity, resource_type
 Saves to ops_alerts table
 Returns 200 OK immediately
BLOCKERS: P5-006

PHASE 5a: Deployment Metadata Registry (3 tickets)
TICKET P5a-001
GOAL: Create ops_control_flags database table
FILES / MODULES:

backend/db_init.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

CREATE TABLE ops_control_flags (
    key TEXT PRIMARY KEY,
    value TEXT
);
ACCEPTANCE CRITERIA:

 Table created in SQLite
 Used for kill-switch persistence
BLOCKERS: None

TICKET P5a-002
GOAL: Create deployment_metadata database table
FILES / MODULES:

backend/db_init.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

CREATE TABLE deployment_metadata (
    deployment_id TEXT PRIMARY KEY,
    cloud TEXT,
    services TEXT,              -- JSON array
    region TEXT,
    terraform_state_path TEXT,
    alert_webhook_url TEXT,
    resource_map TEXT,          -- JSON object
    monitoring_policies TEXT,   -- JSON array
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ACCEPTANCE CRITERIA:

 Table created in SQLite
 JSON fields stored as TEXT
 Primary key is deployment_id (run_id)
BLOCKERS: None

TICKET P5a-003
GOAL: Persist deployment metadata after successful apply
FILES / MODULES:

backend/services/terraform_executor.py
backend/services/metadata_registry.py (new file)
INPUT SCHEMAS:

run_id: str
plan: InfraPlan
terraform_output: dict
OUTPUT SCHEMAS: None (writes to DB)

ACCEPTANCE CRITERIA:

 After successful apply: extract resource names from terraform output
 Create resource_map linking resource names to run_id
 Store deployment metadata in deployment_metadata table
 Include: deployment_id, cloud, services, region, webhook URL, resource_map, monitoring
BLOCKERS: P5a-002

PHASE 6: Ops Decision Agent (3 tickets)
TICKET P6-001
GOAL: Create ops decision system prompt
FILES / MODULES:

backend/services/prompts/ops_decision.py (new file)
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

OPS_DECISION_SYSTEM_PROMPT = """
You are an on-call DevOps engineer...
[Detailed prompt]
"""
ACCEPTANCE CRITERIA:

 Prompt instructs: analyze severity, recommend action
 Known actions: scale_up_vm, restart_instance, modify_firewall
 Always include confidence score and reasoning
 Auto-fix for known issues, escalate unknowns
BLOCKERS: None

TICKET P6-002
GOAL: Implement OpsDecisionAgent.decide() method
FILES / MODULES:

backend/services/ops_decision_agent.py (new file)
INPUT SCHEMAS:

alert: dict  # normalized alert from webhook
OUTPUT SCHEMAS:

OpsDecision  # Pydantic instance
ACCEPTANCE CRITERIA:

 OpsDecisionAgent.decide(alert) static method
 Uses Gemini with response_schema=OpsDecision
 Imports OPS_DECISION_SYSTEM_PROMPT
 Returns structured decision with severity, action, approval flag, confidence, reasoning
BLOCKERS: P1-001, P1-002, P6-001

TICKET P6-003
GOAL: Integrate OpsDecisionAgent into webhook endpoint
FILES / MODULES:

backend/main.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

{
  "received": true,
  "alert_id": 123,
  "decision": {
    "severity": "high",
    "recommended_action": "scale_up_vm",
    "requires_approval": true,
    "confidence": 0.85,
    "reasoning": "CPU above 80% for 5 minutes..."
  }
}
ACCEPTANCE CRITERIA:

 POST /ops/webhook calls OpsDecisionAgent.decide()
 Decision stored in decision_json field of ops_alerts
 Returns decision in response
BLOCKERS: P6-002, P5-007

PHASE 7: Human-in-the-Loop (4 tickets)
TICKET P7-001
GOAL: Create Telegram bot notification function
FILES / MODULES:

backend/services/hitl/telegram_bot.py (new file)
INPUT SCHEMAS:

alert: dict
decision: OpsDecision
OUTPUT SCHEMAS: None (sends Telegram message)

ACCEPTANCE CRITERIA:

 notify(alert, decision) async function
 Uses python-telegram-bot library
 Message includes: policy name, resource, metric, value
 Shows: recommended action, confidence, reasoning
 Prompts: "Reply 1 (approve) / 2 (ignore) / STOP AUTONOMY"
 Uses TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from ENV
BLOCKERS: None

TICKET P7-002
GOAL: Implement kill-switch handler
FILES / MODULES:

backend/services/hitl/telegram_bot.py
INPUT SCHEMAS:

message: str  # "STOP AUTONOMY"
OUTPUT SCHEMAS: None (sets DB flag)

ACCEPTANCE CRITERIA:

 Detect "STOP AUTONOMY" command
 Write to ops_control_flags table: key="kill_switch", value="active"
 Reply confirmation message
 All future actions check this flag before executing
BLOCKERS: P5a-001

TICKET P7-003
GOAL: Implement approval/rejection listener
FILES / MODULES:

backend/services/hitl/telegram_bot.py
INPUT SCHEMAS:

message: str  # "1" or "2"
alert_id: int
OUTPUT SCHEMAS: None (updates DB, triggers action)

ACCEPTANCE CRITERIA:

 Background listener for Telegram messages
 On "1" (approve): update status to approved, trigger ActionExecutor
 On "2" (reject): update status to rejected, log only
 Associates reply with pending alert (track chat context)
BLOCKERS: P7-001

TICKET P7-004
GOAL: Integrate HITL notification into decision routing
FILES / MODULES:

backend/main.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS: None

ACCEPTANCE CRITERIA:

 After OpsDecisionAgent.decide()
 If decision.requires_approval == True: call telegram_bot.notify()
 If decision.requires_approval == False: auto-execute (Phase 8)
 Update alert status to pending_approval or auto_executing
BLOCKERS: P6-003, P7-001

PHASE 8: Action Executor & Feedback Loop (5 tickets)
TICKET P8-001
GOAL: Create ActionExecutor class with action routing
FILES / MODULES:

backend/services/action_executor.py (new file)
INPUT SCHEMAS:

decision: OpsDecision
alert: dict
OUTPUT SCHEMAS:

{
    "success": bool,
    "method": str,  # "terraform" or "api"
    "resolved": bool
}
ACCEPTANCE CRITERIA:

 ActionExecutor.execute(decision, alert) static method
 ACTION_MAP routes action names to handler functions
 Returns success, method, resolved status
 Checks kill-switch flag before executing
BLOCKERS: None

TICKET P8-002
GOAL: Implement _scale_up_vm() action handler (Terraform modify)
FILES / MODULES:

backend/services/action_executor.py
INPUT SCHEMAS:

alert: dict  # contains resource name
OUTPUT SCHEMAS:

{
    "success": bool,
    "method": "terraform"
}
ACCEPTANCE CRITERIA:

 Look up run_id from deployment_metadata using resource name
 Use Gemini to modify machine_type in .tf files
 Write updated files to run directory
 Trigger terraform apply (reuses Phase 3 validation loop)
 Returns success status
BLOCKERS: P5a-003, P3-003

TICKET P8-003
GOAL: Implement _restart_instance() action handler (GCP API)
FILES / MODULES:

backend/services/action_executor.py
INPUT SCHEMAS:

alert: dict  # contains resource name, zone
OUTPUT SCHEMAS:

{
    "success": bool,
    "method": "api"
}
ACCEPTANCE CRITERIA:

 Uses google-cloud-compute library
 Calls InstancesClient().reset()
 Returns success status
 No Terraform state modification
BLOCKERS: None

TICKET P8-004
GOAL: Implement poll_metric() for feedback loop
FILES / MODULES:

backend/services/action_executor.py
INPUT SCHEMAS:

resource_id: str
metric_path: str
threshold: float
OUTPUT SCHEMAS:

{
    "current_value": float,
    "resolved": bool
}
ACCEPTANCE CRITERIA:

 Uses GCP Monitoring timeSeries.list API
 Query window: last 5 minutes
 Aggregation: ALIGN_MEAN
 Compares against threshold
 Returns current value and resolved boolean
BLOCKERS: None

TICKET P8-005
GOAL: Add post-action feedback loop
FILES / MODULES:

backend/services/action_executor.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS: None

ACCEPTANCE CRITERIA:

 After execute() completes: wait 30 seconds
 Call poll_metric() to check current metric value
 If resolved: update alert status to resolved
 If not resolved: re-escalate to human via Telegram
 Log outcome with reasoning
BLOCKERS: P8-004, P7-001

PHASE 9: Frontend Updates (3 tickets)
TICKET P9-001
GOAL: Create OpsDashboard page with 3 sections
FILES / MODULES:

frontend/cloud-canvas-gcp/src/pages/OpsDashboard.tsx (new file)
frontend/cloud-canvas-gcp/src/App.tsx
 (add route)
INPUT SCHEMAS:

GET /ops/alerts → Alert[]
OUTPUT SCHEMAS: None (UI only)

ACCEPTANCE CRITERIA:

 Section A: Active Alerts feed (poll every 5s)
 Section B: Pending Approvals (approve/reject buttons)
 Section C: Action History (executed actions with outcomes)
 Alert cards show: resource, metric, value, severity badge, decision, confidence
 Route /ops added to App.tsx
BLOCKERS: None

TICKET P9-002
GOAL: Add ops API endpoints (alerts CRUD)
FILES / MODULES:

backend/main.py
INPUT SCHEMAS: None

OUTPUT SCHEMAS:

GET /ops/alerts → [{ "id": 1, "policy_name": "...", "status": "pending", ... }]
POST /ops/alerts/{id}/approve → { "success": true }
POST /ops/alerts/{id}/reject → { "success": true }
ACCEPTANCE CRITERIA:

 GET /ops/alerts (filterable by status query param)
 POST /ops/alerts/{id}/approve triggers ActionExecutor
 POST /ops/alerts/{id}/reject updates status
BLOCKERS: P8-001

TICKET P9-003
GOAL: Update Deployment page with verification card
FILES / MODULES:

frontend/cloud-canvas-gcp/src/pages/Deployment.tsx
INPUT SCHEMAS:

verification: {
  reachable: boolean;
  ip: string;
  status_code: number;
}
OUTPUT SCHEMAS: None (UI only)

ACCEPTANCE CRITERIA:

 After status = completed, show verification result card
 Green badge if reachable, red if not
 Display IP address and status code
 Link to Ops Dashboard
BLOCKERS: P4-004

PHASE 10: Integration & Polish (1 ticket)
TICKET P10-001
GOAL: End-to-end smoke test script
FILES / MODULES:

backend/test_e2e.py (new file)
INPUT SCHEMAS: None

OUTPUT SCHEMAS: Test results (pass/fail)

ACCEPTANCE CRITERIA:

 Test 1: POST /generate-graph returns plan + graph
 Test 2: POST /generate_terraform creates validated .tf files
 Test 3: POST /execute runs terraform apply successfully
 Test 4: Verify deployment metadata persisted
 Test 5: POST /ops/webhook creates alert + decision
 Test 6: Manual approval flow (documented, not automated)
 All tests pass with real Gemini API
BLOCKERS: All previous phases

SERIALIZATION REQUIREMENTS
CRITICAL PATH (MUST BE SEQUENTIAL):

P1-001, P1-002, P1-003, P1-004 (LLM Migration)
P2-001, P2-002, P2-003, P2-004 (Planner)
P5-002, P5-003 (Monitoring Schema)
P3-001, P3-002, P3-003 (Terraform Validation)
P4-001, P4-002, P4-003, P4-004 (Verification)
P5a-001, P5a-002, P5a-003 (Metadata Registry)
P6-001, P6-002, P6-003 (Ops Decision)
P7-001, P7-002, P7-003, P7-004 (HITL)
P8-001, P8-002, P8-003, P8-004, P8-005 (Action Executor)
P9-001, P9-002, P9-003 (Frontend)
P10-001 (Integration Test)
PARALLEL OPPORTUNITIES:

After P1-004: Can do P2-001, P3-001, P5-001, P5-006 in parallel
After P5-002: Can do P5-003 and P5-004 in parallel
P7-001, P7-002 can be developed in parallel
P8-002, P8-003, P8-004 can be developed in parallel
All frontend tickets (P9-*) can run in parallel
ESTIMATED TIMELINE:

Week 1: P1 + P2 (9 tickets)
Week 2: P3 + P4 + P5.1-5.5 (16 tickets)
Week 3: P5a + P6 + P7 (10 tickets)
Week 4: P8 + P9 + P10 (9 tickets)
TOTAL: 43 atomic tickets