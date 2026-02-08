INFRAai
Fully Autonomous Infrastructure & Ops Agent
End-to-End Technical Execution Plan

Core Goal
An autonomous Ops Agent that deploys infrastructure via Terraform, monitors live services, detects issues, asks humans only when required, and takes action automatically after approval via Telegram or Discord — with confidence scoring, explainability logs, and a human kill-switch for safety.
High-Level Architecture
#
Component
Role
1
User Prompt
Natural language infra goal from user
2
LLM (Gemini 2.5 Pro)
Reasoning + structured JSON output
3
Infra Planner Agent
Architecture, cost estimate, risk flags
4
Terraform Generator
Validated .tf files with auto-fix loop
5
Terraform Apply
Deployment to GCP with live terminal logs
6
Verification Agent
HTTP health check + IP reachability
7
Deployment Metadata Registry
Persist context for ops agent
8
Monitoring Hooks
GCP Cloud Monitoring → webhook
9
Ops Decision Agent
Severity analysis + action recommendation
10
Human-in-the-Loop
Telegram/Discord approval gate
11
Action Agent
Execute via Terraform modify or GCP API
12
Feedback Loop
Re-check metric → resolve or re-escalate



Gap Analysis — Current State vs. Target
Area
Current State
Target State
LLM Provider
Groq / Llama 3
Gemini 2.5 Pro (structured output + reasoning)
Terraform Validation
None — errors only at execution
Validate loop with auto-fix before deploy
Deployment
Docker runs apply, retry on propagation errors
Full deploy agent with failure diagnosis + self-heal
Post-Deploy
Nothing
Verification agent (IP reachable, HTTP health check)
Monitoring
None
GCP Cloud Monitoring → webhook → ops agent
Ops Decision
None
Gemini-powered on-call agent with confidence scores
Human-in-the-Loop
None
Telegram / Discord notification + approval with kill-switch
Action Executor
None
Scale VM / modify firewall / restart via Terraform or API
Deployment Metadata
Not persisted
Registry (Redis/Firestore) for stateful agent context
Feedback Loop
None
Post-action metric re-check + re-escalation
Explainability
None
Reasoning logs + confidence scores on every decision
Frontend
Graph → Terraform → Deploy monitor
Ops dashboard, alert feed, approval UI, dry-run mode



PHASE 1  —  LLM Migration — Groq → Gemini 2.5 Pro
💡 Why first: Everything downstream — planning, generation, validation, ops — depends on Gemini's structured output and native reasoning. This is the blocker for all other phases.
Task 1.1  Swap LLM backend to Gemini
File: backend/services/llmchat/factory.py
Add a GeminiProvider class alongside existing Groq / OpenAI providers.
Use the google-genai SDK (pip install google-genai).
Model string: gemini-2.5-pro (confirm latest at runtime).
Route selection via env var: LLM_PROVIDER=gemini.
All providers must conform to the same interface: generate(messages) → text.
File: .env
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
Task 1.2  Enforce structured JSON output
📌 Why: The Planner Agent and Ops Decision Agent both need strict JSON. Gemini supports response_schema natively via Pydantic models — no parsing hacks.
File: backend/services/llmchat/factory.py  →  GeminiProvider
Add an optional response_schema parameter to generate().
When provided, pass it as generation_config to the Gemini client — forces valid JSON conforming to the schema.
Define Pydantic schemas in a new file: backend/services/schemas.py.
File: backend/services/schemas.py  —  Core Schemas
class InfraPlan(BaseModel):
    cloud: str                    # "gcp"
    stack_type: str               # "backend_api", "web_app"
    region: str                   # "asia-south1"
    machine_type: str             # "e2-standard-4"
    autoscaling: bool
    estimated_cost_usd: float
    risk_flags: List[str]         # ["firewall", "cost_spike"]

class OpsDecision(BaseModel):
    severity: str                 # "low", "medium", "high"
    recommended_action: str       # "scale_up_vm", "restart"
    requires_approval: bool
    confidence: float             # 0.0 – 1.0
    reasoning: str                # Why this decision
Task 1.3  Replace all prompt calls in graph_generator.py
Swap the Groq client instantiation to use the factory with LLM_PROVIDER=gemini.
No prompt text changes needed — Gemini is instruction-compatible.
Test: POST /generate-graph with a simple prompt. Confirm graph JSON is valid.

PHASE 2  —  Planner Agent
💡 Why: Currently the system goes straight from user prompt → graph generation. This phase adds an explicit planning step that makes architectural, cost, and risk decisions before generating any graph or Terraform.
Task 2.1  Create the Planner Agent service
File: backend/services/planner_agent.py
class PlannerAgent:
    def plan(self, goal: str) -> InfraPlan:
        messages = [
            {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
            {"role": "user",  "content": goal}
        ]
        return gemini.generate(messages, response_schema=InfraPlan)
File: backend/services/prompts/planner.py
System prompt instructs Gemini to: pick a single cloud (GCP only for now).
Choose region and machine type based on cost / latency tradeoffs.
Estimate monthly cost (rough rule-based is fine for demo).
Flag risks: open firewalls, cost spikes, no redundancy.
Task 2.2  Wire Planner into the generate-graph endpoint
File: backend/main.py  →  POST /generate-graph
Current flow:  prompt → graph_generator.generate()
New flow:  prompt → PlannerAgent.plan() → InfraPlan → graph_generator.generate(prompt, plan)
Pass InfraPlan into graph_generator so it uses the chosen region, machine type, and risk flags.
Return plan in the API response alongside summary and graph so the frontend can display it.
Task 2.3  Update API response schema
{
  "plan": {
    "cloud": "gcp",
    "stack_type": "backend_api",
    "region": "asia-south1",
    "machine_type": "e2-standard-4",
    "autoscaling": false,
    "estimated_cost_usd": 82.0,
    "risk_flags": ["firewall"]
  },
  "summary": "...",
  "graph": { ... }
}

PHASE 3  —  Terraform Validation & Auto-Fix Loop
💡 Why: This converts the system from "run and hope" to "agentic." Currently Terraform errors are only discovered during apply. The target validates before deploy and auto-fixes using Gemini.
Task 3.1  Add a validation step in terraform_executor.py
File: backend/services/terraform_executor.py
def run(run_id, action):
    terraform_init(run_id)
    for attempt in range(MAX_FIX_ATTEMPTS):   # 3 attempts
        result = terraform_validate(run_id)
        if result.success:
            break
        fixed_code = TerraformFixAgent.fix(
            error=result.stderr,
            current_files=read_tf_files(run_id)
        )
        write_tf_files(run_id, fixed_code)
        log(f"Auto-fix attempt {attempt+1}")
    if not result.success:
        set_status(run_id, "failed", reason="validation_exhausted")
        return
    terraform_apply(run_id)
Task 3.2  Create the Terraform Fix Agent
File: backend/services/terraform_fix_agent.py
class TerraformFixAgent:
    @staticmethod
    def fix(error: str, current_files: dict) -> dict:
        prompt = build_fix_prompt(error, current_files)
        response = gemini.generate(prompt, response_schema=TerraformFiles)
        return response   # { "main.tf": ..., "variables.tf": ... }
Prompt includes exact terraform validate stderr output and all current .tf file contents.
Instructs Gemini to output only corrected files — no explanation.
Common errors handled: missing provider block, wrong resource attributes, undefined variables, API not enabled.
Task 3.3  Update status phases
starting → initializing → validating → fix_attempt_1 → fix_attempt_2 → planning → applying → finalizing

PHASE 4  —  Post-Deployment Verification Agent
💡 Why: A successful terraform apply does not mean the service is reachable. This agent confirms liveness after every deploy.
Task 4.1  Create the Verification Agent
File: backend/services/verification_agent.py
class VerificationAgent:
    @staticmethod
    def verify(run_id: str) -> dict:
        ip = extract_public_ip(run_id)        # parse terraform output
        for attempt in range(VERIFY_ATTEMPTS):  # 5 attempts, 10s apart
            try:
                r = httpx.get(f"http://{ip}/", timeout=5)
                if r.status_code < 500:
                    return {"reachable": True, "ip": ip, "status_code": r.status_code}
            except (ConnectError, TimeoutException):
                pass
            time.sleep(10)
        return {"reachable": False, "ip": ip, "status_code": None}
Task 4.2  Wire verification into executor post-apply
File: backend/services/terraform_executor.py
After a successful apply, call VerificationAgent.verify(run_id).
If not reachable → set status to deploy_success_verify_failed.
If reachable → set status to completed.
Task 4.3  Expose verification result in status endpoint
GET /runs/{run_id}/status  →
{
  "status": "completed",
  "phase": "verified",
  "verification": { "reachable": true, "ip": "34.x.x.x", "status_code": 200 }
}

PHASE 5  —  Autonomous Monitoring — Terraform-Driven Alerts
💡 Why (redesigned): The previous plan created alert policies manually via gcloud CLI — that breaks autonomy. Alerts must be generated by Terraform as part of resource creation, driven by the Planner Agent based on resource type. Every resource gets its correct metrics automatically. No manual steps.
Task 5.1  Resource-to-Metric Profile Registry
📌 Why: Different resource types expose different metrics. A compute instance needs CPU + disk alerts. A Cloud SQL instance needs connection-count + query-latency alerts. The Planner Agent must know this mapping before it generates any Terraform.
File: backend/services/monitoring/metric_profiles.py
METRIC_PROFILES = {
  "google_compute_instance": [
    {
      "name": "cpu_high",
      "metric": "compute.googleapis.com/instance/cpu/utilization",
      "threshold": 0.80,
      "duration": "60s",
      "severity": "critical"
    },
    {
      "name": "disk_read_high",
      "metric": "compute.googleapis.com/instance/disk/read_bytes_count",
      "threshold": 100000000,
      "duration": "120s",
      "severity": "warning"
    }
  ],
  "google_sql_database_instance": [
    {
      "name": "sql_cpu_high",
      "metric": "cloudsql.googleapis.com/database/cpu/utilization",
      "threshold": 0.75,
      "duration": "60s",
      "severity": "critical"
    },
    {
      "name": "sql_connections_high",
      "metric": "cloudsql.googleapis.com/database/database_connections",
      "threshold": 100,
      "duration": "60s",
      "severity": "warning"
    }
  ],
  "google_compute_instance_group_manager": [
    {
      "name": "asg_cpu_high",
      "metric": "compute.googleapis.com/instance/cpu/utilization",
      "threshold": 0.70,
      "duration": "120s",
      "severity": "critical"
    }
  ]
}
This registry is the single source of truth. When the Planner Agent decides which resources to create, it looks up this map to know exactly which alert policies must be generated alongside them.
Task 5.2  Upgrade Planner Agent — Include Monitoring in the Plan
📌 Why: Previously the Planner only output infra resources. Now it must also output the monitoring configuration for each resource. This makes observability a first-class citizen of the plan, not an afterthought.
File: backend/services/planner_agent.py  +  backend/services/schemas.py
Updated InfraPlan schema
class MonitoringPolicy(BaseModel):
    resource_ref: str          # matches a resource name in the plan
    metric_name: str           # e.g. "cpu_high"
    metric_path: str           # full GCP metric string
    threshold: float
    duration: str              # "60s"
    severity: str              # "critical" | "warning"

class InfraPlan(BaseModel):
    cloud: str
    stack_type: str
    region: str
    machine_type: str
    autoscaling: bool
    estimated_cost_usd: float
    risk_flags: List[str]
    monitoring: List[MonitoringPolicy]   # NEW — auto-populated
Planner logic
class PlannerAgent:
    def plan(self, goal: str) -> InfraPlan:
        # Step 1: Gemini decides the infra resources
        base_plan = gemini.generate(messages, response_schema=InfraPlan)

        # Step 2: Bind monitoring policies automatically
        base_plan.monitoring = self._bind_monitoring(base_plan)
        return base_plan

    def _bind_monitoring(self, plan: InfraPlan) -> List[MonitoringPolicy]:
        policies = []
        for resource in plan.resources:
            profiles = METRIC_PROFILES.get(resource.type, [])
            for profile in profiles:
                policies.append(MonitoringPolicy(
                    resource_ref=resource.name,
                    metric_name=profile["name"],
                    metric_path=profile["metric"],
                    threshold=profile["threshold"],
                    duration=profile["duration"],
                    severity=profile["severity"]
                ))
        return policies
The Planner output now looks like this:
{
  "resources": ["compute_instance", "cloud_sql"],
  "monitoring": [
    { "resource_ref": "backend-vm-1", "metric_name": "cpu_high",
      "metric_path": "compute.googleapis.com/instance/cpu/utilization",
      "threshold": 0.80, "duration": "60s", "severity": "critical" },
    { "resource_ref": "backend-vm-1", "metric_name": "disk_read_high",
      "metric_path": "compute.googleapis.com/instance/disk/read_bytes_count",
      "threshold": 100000000, "duration": "120s", "severity": "warning" },
    { "resource_ref": "app-db", "metric_name": "sql_cpu_high",
      "metric_path": "cloudsql.googleapis.com/database/cpu/utilization",
      "threshold": 0.75, "duration": "60s", "severity": "critical" },
    { "resource_ref": "app-db", "metric_name": "sql_connections_high",
      "metric_path": "cloudsql.googleapis.com/database/database_connections",
      "threshold": 100, "duration": "60s", "severity": "warning" }
  ]
}
Task 5.3  Terraform Generator — Monitoring Resources
🔥 Core fix: Alert policies are no longer created by a one-time CLI command. The Terraform generator reads the monitoring array from the plan and emits google_monitoring_notification_channel and google_monitoring_alert_policy resources into the same .tf files as the application infrastructure.
File: backend/services/terraform_generator.py
Step 1 — Webhook notification channel (created once per deploy)
resource "google_monitoring_notification_channel" "ops_webhook" {
  project      = var.project_id
  display_name = "INFRAai Ops Webhook"
  type         = "webhook_verified"

  labels = {
    url = var.ops_webhook_url   # injected at plan time
  }
}
Step 2 — Alert policy per monitoring entry (generated in a loop)
# Generator iterates over plan.monitoring and emits one block per policy

resource "google_monitoring_alert_policy" "${policy.metric_name}" {
  project      = var.project_id
  display_name = "${policy.resource_ref} — ${policy.metric_name}"
  combiner     = "OR"

  conditions {
    display_name = "${policy.metric_name} > ${policy.threshold}"

    condition_threshold {
      filter          = "metric.type=\"${policy.metric_path}\"
                         AND resource.labels.instance_name=\"${policy.resource_ref}\""
      comparison      = "COMPARISON_GT"
      threshold_value = ${policy.threshold}
      duration        = "${policy.duration}"

      aggregation {
        alignment_period   = "${policy.duration}"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.ops_webhook.id
  ]
}
File: backend/services/terraform_generator.py  —  generation loop
def generate_monitoring_tf(plan: InfraPlan) -> str:
    blocks = []
    # Notification channel — one per deployment
    blocks.append(WEBHOOK_CHANNEL_TEMPLATE)

    # Alert policy — one per monitoring entry in the plan
    for policy in plan.monitoring:
        blocks.append(ALERT_POLICY_TEMPLATE.format(
            name=policy.metric_name,
            resource_ref=policy.resource_ref,
            metric_path=policy.metric_path,
            threshold=policy.threshold,
            duration=policy.duration
        ))
    return "\n".join(blocks)
This function is called by the main Terraform generator right after it emits the application resources. The monitoring .tf blocks land in the same main.tf, so terraform apply creates everything in a single atomic operation.
Task 5.4  Ops Webhook Receiver
The webhook endpoint itself does not change. What changes is the guarantee: alerts will always exist because Terraform created them as part of the deployment. No manual setup, no missing policies.
File: backend/main.py  →  POST /ops/webhook
@app.post("/ops/webhook")
async def ops_webhook(payload: dict):
    normalized = normalize_alert(payload)
    decision = OpsDecisionAgent.decide(normalized)
    save_alert(normalized, decision)
    return {"received": True, "decision_id": decision.id}
Normalization — GCP alert payloads are deeply nested
def normalize_alert(payload: dict) -> dict:
    incident = payload.get("incident", {})
    condition = incident.get("condition", {})
    resource  = incident.get("resource", {})
    return {
        "policy_name": incident.get("policy_name"),
        "resource":    resource.get("labels", {}).get("instance_name"),
        "metric":      condition.get("metricType", "").split("/")[-1],
        "value":       condition.get("currentValue"),
        "severity":    incident.get("severity", "warning"),
        "cloud":       "gcp",
        "resource_type": resource.get("type", "unknown")
    }
Task 5.5  Persist Alerts
File: Database  →  ops_alerts table
CREATE TABLE ops_alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    policy_name     TEXT,
    resource        TEXT,
    resource_type   TEXT,           -- NEW: gcp_compute_instance, etc.
    cloud           TEXT DEFAULT 'gcp',
    metric          TEXT,
    value           REAL,
    severity        TEXT,           -- NEW: critical | warning
    decision_json   TEXT,
    status          TEXT DEFAULT 'pending',  -- pending | approved | rejected | executed
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
The added resource_type and severity columns let the Ops Decision Agent and the frontend filter and prioritise alerts without re-parsing the decision JSON every time.

PHASE 5a  —  Deployment Metadata Registry
🔥 Why judges love this: The ops agent needs context after deployment. A stateful registry makes the system truly agentic — it knows what was deployed, what monitoring is attached, and can act on it later.
After terraform apply completes, the agent persists a metadata document so that downstream Ops and Action agents have full context about the deployment, including its monitoring configuration.
File: Storage  →  Redis / Firestore / DB
{
  "deployment_id": "abc123",
  "cloud": "gcp",
  "services": ["compute_instance", "cloud_sql"],
  "region": "asia-south1",
  "terraform_state": "gs://bucket/state/abc123",
  "alert_webhook": "https://ops-agent/webhook",
  "resource_map": { "backend-vm-1": "run_abc123" },
  "monitoring": [
    { "resource": "backend-vm-1", "policy": "cpu_high", "threshold": 0.80 },
    { "resource": "backend-vm-1", "policy": "disk_read_high", "threshold": 100000000 },
    { "resource": "app-db", "policy": "sql_cpu_high", "threshold": 0.75 }
  ]
}
Populated by parsing terraform output after a successful apply.
The resource_map links live resource names back to their original run_id — critical for the Action Executor.
The monitoring array mirrors what Terraform created, so the Ops Agent can look up thresholds and severity without re-querying GCP.

PHASE 6  —  Ops Decision Agent
❤️ The heart of the system: This is Gemini doing live operational reasoning — the core agentic differentiator. It receives alerts, analyzes severity, and recommends actions with confidence scores and reasoning.
Task 6.1  Create the Ops Decision Agent
File: backend/services/ops_decision_agent.py
class OpsDecisionAgent:
    @staticmethod
    def decide(alert: dict) -> OpsDecision:
        messages = [
            {"role": "system", "content": OPS_DECISION_SYSTEM_PROMPT},
            {"role": "user",  "content": json.dumps(alert)}
        ]
        return gemini.generate(messages, response_schema=OpsDecision)
File: backend/services/prompts/ops_decision.py
Act as an on-call DevOps engineer.
Decide: ignore / auto-fix / escalate to human based on alert type and severity.
For demo: CPU > 90% → scale up. Firewall block → modify rule. Unknown → ask human.
Always include reasoning and confidence so the UI can show why Gemini made the decision.
Decision Logic
if alert.severity == "critical":
    requires_approval = True
elif alert.type in KNOWN_FIXES:
    requires_approval = False   # auto-fix
else:
    requires_approval = True    # unknown → ask human
Known Auto-Fix Reference
Problem
Auto-Action
CPU utilization high
Scale EC2 / VM or enable ASG
Pod crash / restart loop
Restart pod via kubectl
Disk usage full
Increase volume size
Service health check failing
Redeploy latest version
Memory pressure
Scale up instance tier
Firewall rule blocking traffic
Modify firewall rule via Terraform

Task 6.2  Decision routing logic
if decision.requires_approval:
    store_pending_decision(alert, decision)
    notify_human(alert, decision)       # Telegram / Discord
else:
    ActionExecutor.execute(decision, alert)
    store_executed_decision(alert, decision)

PHASE 7  —  Human-in-the-Loop — Telegram / Discord
👍 Demo strength: Judges need to see safe autonomy. This is the human approval gate — the agent asks before acting on critical decisions.
Task 7.1  Telegram Bot integration
File: backend/services/hitl/telegram_bot.py
async def notify(alert: dict, decision: OpsDecision):
    text = (
        f"\U0001f6a8 {alert['policy_name']}\n\n"
        f"Resource: {alert['resource']}\n"
        f"Metric: {alert['metric']} = {alert['value']}\n\n"
        f"Suggested: {decision.recommended_action}\n"
        f"Confidence: {decision.confidence}\n"
        f"Reason: {decision.reasoning}\n\n"
        "Reply 1 (approve) / 2 (ignore) / STOP AUTONOMY"
    )
    await bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=text)
Task 7.2  Approval Listener + Kill-Switch
File: backend/services/hitl/telegram_bot.py
Run a background listener (or use Telegram webhook mode).
On reply 1 (YES / approve): call ActionExecutor.execute(), update status to approved + executed.
On reply 2 (NO / ignore): update status to rejected, log it.
On STOP AUTONOMY: set a global kill-switch flag. All pending and future agent actions are halted until manually reset.
🛡️ Kill-Switch: The STOP AUTONOMY command is a safety net. It halts all autonomous actions immediately — bonus points for responsible AI design.
Task 7.3  (Optional) Discord fallback
Same pattern as Telegram using discord.py. Wire as an alternative channel based on env var HITL_CHANNEL=telegram|discord. For demo, Telegram alone is sufficient.

PHASE 8  —  Action Executor Agent + Feedback Loop
🤖 Executes + Learns: After approval (or auto-decision), this agent performs the actual infra change. The feedback loop then re-checks the metric to confirm resolution — true autonomy.
Task 8.1  Create the Action Executor
File: backend/services/action_executor.py
class ActionExecutor:
    ACTION_MAP = {
        "scale_up_vm":      _scale_up_vm,
        "modify_firewall":  _modify_firewall,
        "restart_instance": _restart_instance,
    }
    @staticmethod
    def execute(decision, alert) -> dict:
        handler = ACTION_MAP.get(decision.recommended_action)
        if not handler:
            return {"success": False, "error": "unknown_action"}
        return handler(alert)
Approach A — Terraform Modify + Apply (preferred)
Keeps Terraform state consistent. Used for scaling, firewall changes, and any structural modification.
def _scale_up_vm(alert):
    run_id = lookup_run_for_resource(alert["resource"])
    new_files = gemini.generate(
        prompt=f"Change machine_type to e2-standard-8 for {alert['resource']}",
        context=read_tf_files(run_id),
        response_schema=TerraformFiles
    )
    write_tf_files(run_id, new_files)
    run_terraform(run_id, action="apply")   # reuses Phase 3 validation loop
    return {"success": True, "method": "terraform"}
Approach B — Direct GCP API Call (faster)
Used for simple, stateless operations like instance restart.
def _restart_instance(alert):
    client = compute_v1.InstancesClient()
    client.reset(project=PROJECT_ID, zone=ZONE, instance=alert["resource"])
    return {"success": True, "method": "api"}
Task 8.2  Post-action verification (Feedback Loop)
🔁 Feedback Loop: After every action, wait 30s then re-poll the metric. If resolved → mark done. If not → re-escalate to human. This closes the autonomous loop.
# After execute():
time.sleep(30)
new_value = poll_metric(alert["resource"], alert["metric"])
result["resolved"] = new_value < THRESHOLD
if not result["resolved"]:
    # Re-escalate — the loop is not closed until the issue is fixed
    notify_human(alert, decision, note="Action taken but metric still elevated")
Every action is logged with: action taken, reason, who approved, outcome.
Explainability log example: "I detected high CPU. Past fixes show scaling works. Risk is low. Asking human for approval."

PHASE 9  —  Frontend Updates
👁️ Why: The backend agents are invisible without UI. The demo needs to show the entire ops loop visually — alerts, decisions, approvals, and outcomes.
Task 9.1  Ops Dashboard page
File: frontend/cloud-canvas-gcp/src/pages/OpsDashboard.tsx  →  Route: /ops
Section A — Active Alerts feed: Poll GET /ops/alerts every 5s. Display each alert as a card with resource name, metric, value, severity badge, decision, confidence, and status.
Section B — Pending Approvals: Show alerts where status = pending. Approve / Reject buttons call POST /ops/alerts/{id}/approve or /reject. This is the web-based alternative to Telegram for the demo.
Section C — Action History: Show executed actions with outcome (Resolved / Unresolved) and reasoning logs.
Task 9.2  New backend endpoints for ops
GET  /ops/alerts                     → all alerts (filterable by status)
POST /ops/alerts/{id}/approve        → trigger ActionExecutor, update status
POST /ops/alerts/{id}/reject         → update status to rejected
Task 9.3  Update Deployment page
File: frontend/cloud-canvas-gcp/src/pages/Deployment.tsx
After status = completed, show verification result card: green for reachable, red if not.
Add dry-run preview panel: before any action, show exactly what Terraform will change.
Add link to the Ops Dashboard.
Task 9.4  Update Landing page to show the plan
File: frontend/cloud-canvas-gcp/src/pages/Landing.tsx
After /generate-graph returns, show the plan object as a summary card before navigating to canvas.
Display: Cloud, region, machine type, estimated cost, risk flags, and confidence score.
Add a Proceed button to continue to canvas.
Task 9.5  Add route to App.tsx
<Route path="/ops" element={<OpsDashboard />} />
Add a nav link in NavHeader.tsx or TopToolbar.tsx.

PHASE 10  —  Integration, Wiring & Demo Polish
Task 10.1  Resource-to-run mapping
Handled by the Deployment Metadata Registry (Phase 5a). The resource_map in the metadata document links live resource names back to their run_id so the Action Executor can find the right Terraform files.
Task 10.2  End-to-end smoke test script
File: backend/test_e2e.py
POST a prompt to /generate-graph → confirm plan + graph returned.
POST to /generate_terraform → confirm Terraform files generated.
POST to /execute → confirm validation runs (do not apply to GCP in test mode).
POST a fake alert to /ops/webhook → confirm decision + HITL triggered.
Run this before the demo to confirm all paths work.
Task 10.3  Credential and env checklist
Environment Variable
Source
GEMINI_API_KEY
Google AI Studio or Vertex AI
LLM_PROVIDER
Set to: gemini
CLERK_SECRET_KEY
Clerk dashboard
TELEGRAM_BOT_TOKEN
BotFather in Telegram
TELEGRAM_CHAT_ID
Chat ID where bot posts
GCP_PROJECT_ID
Your demo GCP project
NGROK_URL
Public URL for webhook (local dev)
HITL_CHANNEL
Set to: telegram or discord
REDIS_URL / FIRESTORE_PROJECT
For deployment metadata registry

Task 10.4  Demo flow rehearsal
Practice this exact sequence end-to-end before the demo:
Open Landing → type "Deploy a backend API for 10k users under $100/month".
Plan card renders: cost estimate, region, risk flags, confidence score.
Canvas loads — point out graph structure and component relationships.
Navigate to Infrastructure — show Terraform code in Monaco editor.
Deploy — show live terminal logs and validation / auto-fix phases.
Verification card appears: service reachable at public IP (or flagged if not).
Dry-run preview confirms changes before any action is taken.
Simulate: POST a high-CPU alert to /ops/webhook via curl.
Ops Dashboard — alert card appears with Gemini's decision + reasoning + confidence.
Telegram — approval message with numbered options appears.
Reply YES (or click Approve in dashboard) — action executes.
Feedback loop: metric re-checked, status shows Resolved.
Test kill-switch: reply STOP AUTONOMY — agent halts cleanly.

High-Impact Add-Ons
These additions are low-effort, high-impact features that judges reward. All are wired into the core phases above.

Add-On
Description
Impact
Confidence Score
Every decision includes a 0–1 confidence value so judges see calibrated AI reasoning
High
Dry-Run Mode
Before executing, the agent previews exactly what Terraform will change and asks for confirmation
High
Kill-Switch
Human can reply STOP AUTONOMY to halt all agent actions immediately — safety net
High
Multi-Cloud Story
Architecture uses adapter pattern; swap monitoring/action handlers for AWS support
Medium
Explainability Logs
Every decision includes natural-language reasoning: why this action, what risk, what precedent
High


Execution Order Summary
Phases 2, 3, and 5 can run in parallel after Phase 1 completes. Phase 5a (Metadata Registry) runs alongside Phase 5.

Phase
Title
Dependencies
Can Parallel?
1
LLM Migration (Groq → Gemini)
None — BLOCKER
No
2
Planner Agent
Phase 1
Yes (after 1)
3
Terraform Validation + Auto-Fix
Phase 1
Yes (after 1)
4
Post-Deploy Verification Agent
Phase 3
No
5
GCP Monitoring + Webhook
Phase 1
Yes (after 1)
5a
Deployment Metadata Registry
Phase 3
Yes (after 1)
6
Ops Decision Agent
Phases 1, 5
No
7
Human-in-the-Loop (Telegram)
Phase 6
No
8
Action Executor + Feedback Loop
Phases 6, 7
No
9
Frontend Updates
Phases 2, 4, 5, 6
No
10
Integration + Demo Polish
All phases
No
—
High-Impact Add-Ons
Phase 6+
No


