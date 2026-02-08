# INFRAai - Critical Missing Components Action Plan

## Executive Summary

**Current State:** Foundation layer complete, but autonomous loop is broken  
**Critical Gap:** System can decide but cannot execute or remember  
**Priority:** Close the autonomous operations loop

---

## 🎯 Three Critical Missing Pieces

### 1. **The "Hands" - Action Executor** 🔴 CRITICAL
**Why:** The brain can think, but the body cannot act  
**Impact:** Entire ops automation is dead without this

### 2. **The "Memory" - Deployment Registry** 🔴 CRITICAL  
**Why:** Agent is blind to past context and resource relationships  
**Impact:** Cannot correlate alerts to deployments or make informed decisions

### 3. **The "Interface" - Ops Dashboard** 🟡 HIGH PRIORITY  
**Why:** No visibility into autonomous decision-making  
**Impact:** Demo quality, trust, and human oversight

---

## 📋 Detailed Action Items

## PHASE 1: Action Executor (The Missing Hands)

### Goal
Enable the system to execute decisions made by the Ops Decision Agent

### Current Problem
```
Alert → Gemini analyzes → Decides "Scale VM to 4 nodes" → Saves to SQLite → STOPS
```

### Desired Flow
```
Alert → Gemini analyzes → Decides "Scale VM to 4 nodes" → Action Executor modifies Terraform → Re-plan → Re-apply → Deployment
```

### Implementation Tasks

#### **Task 1.1: Create Action Executor Core**
**File:** `backend/services/action_executor.py`

**Required Functions:**
```python
class ActionExecutor:
    def __init__(self, terraform_executor, deployment_registry):
        """Initialize with Terraform executor and registry"""
        
    async def execute_action(self, action_decision: dict) -> dict:
        """
        Main entry point
        Input: {
            "action": "scale_up",
            "resource_id": "vm-1",
            "target_value": 4,
            "run_id": "uuid-of-original-deployment"
        }
        Output: {
            "success": bool,
            "new_run_id": str,
            "changes_applied": dict
        }
        """
        
    async def _modify_terraform(self, run_id: str, modifications: dict):
        """Modify the Terraform files for a given run"""
        
    async def _validate_and_apply(self, run_id: str) -> dict:
        """Run terraform plan and apply with validation loop"""
        
    async def _rollback_on_failure(self, run_id: str, backup_path: str):
        """Rollback to previous state if deployment fails"""
```

**Key Requirements:**
- [ ] Locate the original Terraform run directory using `run_id`
- [ ] Create a backup of current `.tf` files
- [ ] Modify the target parameter (e.g., `node_count`, `machine_type`)
- [ ] Trigger `terraform plan` to preview changes
- [ ] If plan succeeds, execute `terraform apply`
- [ ] Leverage existing `TerraformFixAgent` if validation fails
- [ ] Update deployment registry with new state
- [ ] Return execution results

**Integration Points:**
- Hook into `/ops/webhook` approval callback
- Use existing `terraform_executor.py` for plan/apply
- Call `deployment_registry` to update metadata

---

#### **Task 1.2: Define Action Types**
**File:** `backend/models/action_types.py`

**Supported Actions:**
```python
from enum import Enum

class ActionType(Enum):
    SCALE_UP = "scale_up"          # Increase node_count or machine_type
    SCALE_DOWN = "scale_down"      # Decrease resources
    RESTART = "restart"            # Recreate resource (taint + apply)
    MODIFY_CONFIG = "modify_config" # Change configuration parameters
    ROLLBACK = "rollback"          # Revert to previous state
```

**Action Schema:**
```python
from pydantic import BaseModel

class ActionRequest(BaseModel):
    action_type: ActionType
    resource_id: str
    run_id: str
    parameters: dict  # e.g., {"node_count": 4} or {"machine_type": "n1-standard-2"}
    confidence: float
    reason: str
```

---

#### **Task 1.3: Wire to Telegram Approval**
**File:** `backend/ops/webhook.py`

**Current Code (Approximate):**
```python
# When user clicks "Approve" button in Telegram
if callback_data == "approve":
    # Currently: just updates SQLite
    await db.update_alert_status(alert_id, "approved")
```

**New Code:**
```python
from services.action_executor import ActionExecutor

if callback_data == "approve":
    # 1. Get the saved decision
    decision = await db.get_alert_decision(alert_id)
    
    # 2. Execute the action
    executor = ActionExecutor(terraform_executor, deployment_registry)
    result = await executor.execute_action(decision)
    
    # 3. Notify user of outcome
    if result["success"]:
        await telegram.send_message(f"✅ Action executed. New Run ID: {result['new_run_id']}")
    else:
        await telegram.send_message(f"❌ Failed: {result['error']}")
```

---

## PHASE 2: Deployment Registry (The Missing Memory)

### Goal
Build a centralized index that maps live resources to their Terraform runs

### Current Problem
```
Alert: "vm-1 CPU > 80%" → Agent has no idea which Terraform run created vm-1
                       → Cannot find state file or modify deployment
```

### Desired State
```
Alert: "vm-1 CPU > 80%" → Registry lookup: vm-1 → run_id: abc-123
                        → Load state from /runs/abc-123/terraform.tfstate
                        → Modify /runs/abc-123/main.tf
```

### Implementation Tasks

#### **Task 2.1: Design Registry Schema**
**Option A: SQLite Table** (Recommended for MVP)

```sql
CREATE TABLE deployments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT, -- 'active', 'failed', 'destroyed'
    terraform_dir TEXT, -- /terraform_runs/abc-123
    state_file_path TEXT
);

CREATE TABLE resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id INTEGER REFERENCES deployments(id),
    resource_type TEXT, -- 'google_compute_instance'
    resource_name TEXT, -- 'vm-1'
    resource_id TEXT, -- The actual GCP resource ID
    metadata JSON, -- Store additional context
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resource_name ON resources(resource_name);
CREATE INDEX idx_run_id ON deployments(run_id);
```

**Option B: JSON File Registry** (Simple, but won't scale)
```json
{
  "deployments": {
    "abc-123": {
      "user_id": "user_001",
      "created_at": "2026-02-01T10:00:00Z",
      "status": "active",
      "terraform_dir": "/terraform_runs/abc-123",
      "resources": [
        {
          "type": "google_compute_instance",
          "name": "vm-1",
          "id": "projects/my-project/zones/us-central1-a/instances/vm-1",
          "metadata": {"zone": "us-central1-a", "machine_type": "n1-standard-1"}
        }
      ]
    }
  }
}
```

---

#### **Task 2.2: Update Terraform Executor to Populate Registry**
**File:** `backend/services/terraform_executor.py`

**Add after successful `terraform apply`:**
```python
async def execute(self, plan: InfraPlan) -> dict:
    # ... existing code ...
    
    if apply_result.returncode == 0:
        # NEW: Extract resource information from state
        await self._register_deployment(run_id, terraform_dir)
    
    return result

async def _register_deployment(self, run_id: str, terraform_dir: str):
    """Parse terraform.tfstate and register all resources"""
    state_file = Path(terraform_dir) / "terraform.tfstate"
    state = json.loads(state_file.read_text())
    
    # Create deployment record
    deployment = await db.create_deployment(
        run_id=run_id,
        user_id=self.user_id,
        terraform_dir=str(terraform_dir),
        state_file_path=str(state_file)
    )
    
    # Extract resources from state
    for resource in state.get("resources", []):
        await db.create_resource(
            deployment_id=deployment.id,
            resource_type=resource["type"],
            resource_name=resource["name"],
            resource_id=resource["instances"][0]["attributes"]["id"],
            metadata=resource["instances"][0]["attributes"]
        )
```

---

#### **Task 2.3: Create Registry Query Interface**
**File:** `backend/services/deployment_registry.py`

```python
class DeploymentRegistry:
    def __init__(self, db_connection):
        self.db = db_connection
    
    async def get_deployment_by_resource(self, resource_name: str) -> dict:
        """
        Given a resource name (e.g., 'vm-1'), return deployment info
        """
        resource = await self.db.query(
            "SELECT * FROM resources WHERE resource_name = ?",
            (resource_name,)
        )
        
        if not resource:
            raise ResourceNotFoundError(f"No deployment found for {resource_name}")
        
        deployment = await self.db.query(
            "SELECT * FROM deployments WHERE id = ?",
            (resource.deployment_id,)
        )
        
        return {
            "run_id": deployment.run_id,
            "terraform_dir": deployment.terraform_dir,
            "state_file": deployment.state_file_path,
            "resource": resource
        }
    
    async def get_all_resources_for_deployment(self, run_id: str) -> list:
        """Get all resources created by a specific deployment"""
        pass
    
    async def mark_deployment_destroyed(self, run_id: str):
        """Update status when terraform destroy is run"""
        pass
```

---

#### **Task 2.4: Wire Registry to Ops Decision Agent**
**File:** `backend/ops/webhook.py`

```python
async def analyze_alert(alert_data: dict):
    # Extract resource name from alert
    resource_name = alert_data.get("resource_id", "unknown")
    
    # NEW: Look up deployment context
    try:
        deployment = await registry.get_deployment_by_resource(resource_name)
        context = f"""
        Resource: {resource_name}
        Deployment Run ID: {deployment['run_id']}
        Current State: {deployment['resource']['metadata']}
        Terraform Directory: {deployment['terraform_dir']}
        """
    except ResourceNotFoundError:
        context = "No deployment metadata found. This may be a manual resource."
    
    # Send to Gemini with full context
    decision = await gemini_agent.analyze(alert_data, context)
```

---

## PHASE 3: Ops Dashboard (The Missing Interface)

### Goal
Visualize the autonomous decision-making loop

### Implementation Tasks

#### **Task 3.1: Create OpsDashboard Component**
**File:** `frontend/src/pages/OpsDashboard.tsx`

**Required Sections:**
```typescript
interface OpsDashboardProps {}

export default function OpsDashboard() {
  return (
    <div className="ops-dashboard">
      {/* Section 1: Active Alerts */}
      <AlertsPanel />
      
      {/* Section 2: Agent Decisions */}
      <DecisionsPanel />
      
      {/* Section 3: Recent Actions */}
      <ActionsHistoryPanel />
      
      {/* Section 4: System Health */}
      <SystemHealthPanel />
    </div>
  );
}
```

**Key Features:**
- [ ] Real-time alert feed (WebSocket or polling)
- [ ] Show Gemini's confidence score for each decision
- [ ] Approve/Reject buttons (triggers Action Executor)
- [ ] Timeline view of all executed actions
- [ ] Link each action back to original alert and Terraform run

---

#### **Task 3.2: Create Supporting API Endpoints**
**File:** `backend/ops/routes.py`

```python
@router.get("/ops/alerts/active")
async def get_active_alerts():
    """Return all alerts awaiting approval"""
    
@router.get("/ops/decisions")
async def get_recent_decisions():
    """Return Gemini's recent decision history"""
    
@router.get("/ops/actions")
async def get_action_history():
    """Return executed actions with results"""
    
@router.post("/ops/approve/{alert_id}")
async def approve_action(alert_id: str):
    """Trigger action executor for approved decision"""
```

---

#### **Task 3.3: Update Landing Page**
**File:** `frontend/src/pages/LandingPage.tsx`

**Add:**
- [ ] Link to `/ops-dashboard` in main navigation
- [ ] Visual indicator showing "Autonomous Ops: Active" status
- [ ] Quick stats: "3 alerts analyzed, 2 actions approved today"

---

## PHASE 4: End-to-End Integration & Testing

### Goal
Close the loop and verify autonomous operations work

### **Task 4.1: Integration Test**
**Scenario:** Simulate a CPU alert and verify full loop

```
1. Deploy infrastructure via /infra endpoint
2. Trigger simulated Prometheus alert → webhook
3. Verify Ops Decision Agent analyzes alert
4. Approve decision via Telegram
5. Verify Action Executor modifies Terraform
6. Verify new deployment succeeds
7. Verify Registry updated with new state
8. Verify Dashboard shows action history
```

---

### **Task 4.2: Create Integration Test Script**
**File:** `tests/test_autonomous_loop.py`

```python
async def test_full_autonomous_loop():
    # 1. Deploy test infrastructure
    deploy_result = await client.post("/infra", json=test_plan)
    run_id = deploy_result.json()["run_id"]
    
    # 2. Simulate alert
    alert = {
        "resource_id": "vm-1",
        "metric": "cpu_usage",
        "value": 85,
        "threshold": 80
    }
    await client.post("/ops/webhook", json=alert)
    
    # 3. Verify decision was made
    decisions = await client.get("/ops/decisions")
    assert len(decisions.json()) > 0
    
    # 4. Approve action
    decision_id = decisions.json()[0]["id"]
    await client.post(f"/ops/approve/{decision_id}")
    
    # 5. Wait for execution
    await asyncio.sleep(30)
    
    # 6. Verify new deployment
    actions = await client.get("/ops/actions")
    assert actions.json()[0]["status"] == "success"
    
    # 7. Verify registry updated
    resources = await registry.get_all_resources_for_deployment(run_id)
    assert len(resources) > 0
```

---

## 🎯 Agentic Architecture Assessment

### Current State Analysis

#### ✅ **What IS Agentic**
1. **Terraform Fix Loop** - Self-correcting validation with Gemini
2. **Ops Decision Agent** - Autonomous alert analysis with confidence scoring
3. **Verification Agent** - Post-deployment health checks

#### 🟡 **What is WRAPPER (Not Agentic)**
1. **Terraform Generator** - Uses f-string templates, not LLM generation
2. **Monitoring Binding** - Static profile matching, not adaptive decision

#### 🔴 **What is MISSING (Breaks Autonomy)**
1. **Action Executor** - No code to execute decisions
2. **Deployment Registry** - No memory of past actions
3. **Feedback Loop** - Agent cannot learn from action outcomes

---

### Recommendations for "Moving to Agentic Side"

#### **Priority 1: Complete the Loop (Action Executor)**
Without execution, the agent is a "brain in a jar" - it can think but not act.

**Quick Win:** Implement basic action executor with hardcoded action types (scale up/down)  
**Future:** Let Gemini decide *how* to execute, not just *what* to do

---

#### **Priority 2: Replace Template Generator with LLM**
**Current:** `terraform_generator.py` uses Python templates  
**Proposed:** Feed `InfraPlan` JSON to Gemini, ask it to write Terraform

**Example Prompt:**
```
You are a Terraform expert. Generate valid Terraform code for GCP.

Plan:
{
  "compute": {
    "vms": [{"name": "web-server", "machine_type": "n1-standard-2"}]
  }
}

Output only valid Terraform code. Use google provider.
```

**Risk Mitigation:**
- Your existing `TerraformFixAgent` will catch any LLM hallucinations
- This creates an "Architecture of Trust" - generate boldly, validate strictly

---

#### **Priority 3: Adaptive Monitoring**
**Current:** Static metric profiles based on resource type  
**Proposed:** Ask Gemini "What metrics matter for this specific workload?"

**Example:**
```
User's infrastructure plan:
- 3 VMs running a Node.js API
- Cloud SQL database
- Load balancer

What Prometheus metrics should we track? Consider:
- Application-specific needs (Node.js)
- Dependencies (database queries)
- User experience (latency, error rates)
```

---

## 📊 Implementation Timeline

### Week 1: Core Autonomy
- [ ] Task 1.1-1.3: Action Executor (3 days)
- [ ] Task 2.1-2.2: Registry Schema + Population (2 days)
- [ ] Integration testing (2 days)

### Week 2: Memory & Interface
- [ ] Task 2.3-2.4: Registry Query Interface (2 days)
- [ ] Task 3.1-3.2: Ops Dashboard (3 days)
- [ ] Task 4.1-4.2: E2E Testing (2 days)

### Week 3: Polish & Agentic Upgrade
- [ ] Replace Terraform Generator with LLM (3 days)
- [ ] Implement adaptive monitoring (2 days)
- [ ] Documentation & demo preparation (2 days)

---

## 🎬 Success Criteria

**Minimum Viable Autonomous Loop:**
- [ ] Alert triggers → Agent analyzes → Human approves → Action executes → Infrastructure changes
- [ ] Registry can map any alert to its originating Terraform run
- [ ] Dashboard shows real-time decision flow

**Full Agentic System:**
- [ ] LLM generates Terraform (not templates)
- [ ] LLM decides monitoring strategy (not static profiles)
- [ ] Agent can execute multi-step action plans (not just single modifications)

---

## 📝 Final Thoughts

### The Core Issue
You have a brilliant agent that can **think** but cannot **act** or **remember**. 

The system is like a chess grandmaster who:
- Can analyze the board (Ops Decision Agent)
- Can suggest moves (Gemini decisions)
- **Cannot move the pieces** (No Action Executor)
- **Cannot see previous games** (No Registry)

### The Path Forward
1. **First:** Build the hands (Action Executor) - this unblocks everything
2. **Second:** Build the memory (Registry) - this makes decisions contextual
3. **Third:** Build the interface (Dashboard) - this makes it trustworthy
4. **Finally:** Make it fully agentic (LLM-generated Terraform)

---

**Next Step:** Should I proceed with implementing `action_executor.py` as the first critical file?