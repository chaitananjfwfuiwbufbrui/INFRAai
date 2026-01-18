import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  Code2, 
  Layout, 
  Server, 
  Network, 
  Shield, 
  Database, 
  Scale,
  Github,
  Plus,
  ArrowRight,
  File,
  FolderOpen,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import Editor from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import NavHeader from '@/components/shared/NavHeader';
import { apiEndpoints, apiRequest } from '@/lib/api';
import { toast } from 'sonner';

// Dummy Terraform files
const terraformFiles = {
  'main.tf': `# Main Terraform Configuration
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# VPC Network
resource "google_compute_network" "main" {
  name                    = "\${var.project_name}-vpc"
  auto_create_subnetworks = false
}

# Subnet
resource "google_compute_subnetwork" "main" {
  name          = "\${var.project_name}-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

# Compute Instance
resource "google_compute_instance" "app" {
  count        = 2
  name         = "\${var.project_name}-vm-\${count.index + 1}"
  machine_type = "e2-medium"
  zone         = "\${var.region}-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network    = google_compute_network.main.id
    subnetwork = google_compute_subnetwork.main.id
    access_config {}
  }
}

# Cloud Storage Bucket
resource "google_storage_bucket" "data" {
  name     = "\${var.project_id}-data-bucket"
  location = var.region
  
  uniform_bucket_level_access = true
}

# Load Balancer
resource "google_compute_global_address" "lb" {
  name = "\${var.project_name}-lb-ip"
}`,
  'variables.tf': `# Variable Definitions

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "project_name" {
  description = "Name prefix for resources"
  type        = string
  default     = "myapp"
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "machine_type" {
  description = "VM machine type"
  type        = string
  default     = "e2-medium"
}`,
  'outputs.tf': `# Output Definitions

output "vpc_id" {
  description = "The ID of the VPC"
  value       = google_compute_network.main.id
}

output "subnet_id" {
  description = "The ID of the subnet"
  value       = google_compute_subnetwork.main.id
}

output "instance_ips" {
  description = "The external IPs of compute instances"
  value       = google_compute_instance.app[*].network_interface[0].access_config[0].nat_ip
}

output "bucket_url" {
  description = "The URL of the storage bucket"
  value       = google_storage_bucket.data.url
}

output "load_balancer_ip" {
  description = "The global IP of the load balancer"
  value       = google_compute_global_address.lb.address
}`
};

// Dummy infrastructure data
const infrastructureSummary = {
  resources: [
    { icon: Server, count: 2, name: 'Virtual Machines', spec: 'e2-medium' },
    { icon: Network, count: 1, name: 'Virtual Network', spec: 'VPC' },
    { icon: Shield, count: 3, name: 'Security Rules', spec: 'Firewall' },
    { icon: Database, count: 1, name: 'Storage Account', spec: 'Cloud Storage' },
    { icon: Scale, count: 1, name: 'Load Balancer', spec: 'Global HTTP(S)' },
  ],
  explanations: [
    'Create a private network isolated from public internet',
    'Deploy 2 compute instances for high availability',
    'Allow HTTPS traffic only through firewall rules',
    'Store application data securely in cloud storage',
    'Automatically balance traffic between instances',
  ],
  costs: [
    { name: 'Compute', amount: 6200 },
    { name: 'Networking', amount: 800 },
    { name: 'Storage', amount: 300 },
  ]
};

export default function Infrastructure() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get runId from URL params (persists on refresh)
  const urlRunId = searchParams.get('runId');
  // Also check location state for initial navigation from canvas
  const stateRunId = (location.state as { runId?: string } | null)?.runId;
  
  const [isCodeView, setIsCodeView] = useState(false);
  const [selectedFile, setSelectedFile] = useState('main.tf');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [jsonConfig, setJsonConfig] = useState('');
  const [projectId, setProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<Record<string, string>>(terraformFiles);
  const [runId, setRunId] = useState<string | null>(urlRunId);
  const [hasFetched, setHasFetched] = useState(false);

  // If we got runId from state (navigation), update URL params
  useEffect(() => {
    if (stateRunId && !urlRunId) {
      setSearchParams({ runId: stateRunId });
      setRunId(stateRunId);
      // Clear location state
      window.history.replaceState({}, document.title);
    }
  }, [stateRunId, urlRunId, setSearchParams]);

  // Fetch run details if runId is available
  useEffect(() => {
    const fetchRunDetails = async () => {
      const currentRunId = urlRunId || stateRunId;
      if (currentRunId && !hasFetched) {
        setIsLoading(true);
        setRunId(currentRunId);
        
        try {
          const response = await apiRequest<{ run_id: string; files: Record<string, string> }>(
            apiEndpoints.getRunDetails(currentRunId),
            {
              method: 'GET',
              headers: {
                'accept': 'application/json',
              },
            }
          );
          
          setLoadedFiles(response.files);
          // Set first file as selected
          const fileNames = Object.keys(response.files);
          if (fileNames.length > 0) {
            setSelectedFile(fileNames[0]);
          }
          
          setHasFetched(true);
          toast.success('Terraform files loaded successfully!');
        } catch (error) {
          console.error('Failed to fetch run details:', error);
          toast.error('Failed to load Terraform files', {
            description: 'Using default templates instead'
          });
          setHasFetched(true);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchRunDetails();
  }, [urlRunId, stateRunId, hasFetched]);

  const totalCost = infrastructureSummary.costs.reduce((sum, item) => sum + item.amount, 0);

  const handleCreate = async () => {
    if (!runId) {
      toast.error('No run ID available');
      return;
    }

    if (!projectId.trim()) {
      toast.error('Please enter a Project ID');
      return;
    }

    setIsCreating(true);

    try {
      await apiRequest<{ status: string }>(
        apiEndpoints.execute,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            run_id: runId,
            action: 'apply',
            project_id: projectId.trim(),
            sa_key_json: jsonConfig,
            auto_approve: true,
          }),
        }
      );

      toast.success('Infrastructure deployment started!');
      // Navigate to deployment page with runId as URL param
      navigate(`/deployment?runId=${runId}&projectId=${encodeURIComponent(projectId.trim())}`, { 
        state: { platform: selectedPlatform, saKeyJson: jsonConfig } 
      });
      setIsCreateDialogOpen(false);
      setSelectedPlatform(null);
      setJsonConfig('');
      setProjectId('');
    } catch (error) {
      console.error('Failed to execute deployment:', error);
      toast.error('Failed to start deployment', {
        description: 'Please check your configuration and try again'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const headerRightContent = (
    <>
      {/* Code/No-Code Toggle */}
      <div className="flex items-center gap-3 bg-muted/50 rounded-full px-4 py-2">
        <Layout className={cn("h-4 w-4 transition-colors", !isCodeView ? "text-primary" : "text-muted-foreground")} />
        <Switch
          checked={isCodeView}
          onCheckedChange={setIsCodeView}
          className="data-[state=checked]:bg-primary"
        />
        <Code2 className={cn("h-4 w-4 transition-colors", isCodeView ? "text-primary" : "text-muted-foreground")} />
      </div>

      <Button variant="ghost" size="icon" asChild>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer">
          <Github className="h-5 w-5" />
        </a>
      </Button>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Infrastructure</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Select Platform</Label>
              <div className="grid grid-cols-3 gap-3">
                {['AWS', 'GCP', 'Azure'].map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-center font-medium",
                      selectedPlatform === platform
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    )}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Project ID</Label>
              <Input
                placeholder='my-gcp-project-id'
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-3">
              <Label>Service Account JSON</Label>
              <Textarea
                placeholder='Paste your service account JSON key here...'
                value={jsonConfig}
                onChange={(e) => setJsonConfig(e.target.value)}
                className="min-h-[150px] font-mono text-sm"
              />
            </div>

            <Button 
              onClick={handleCreate} 
              className="w-full"
              disabled={!selectedPlatform || !projectId.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                'Create Infrastructure'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavHeader 
        showBackButton 
        backPath="/canvas" 
        rightContent={headerRightContent}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          /* LOADING STATE */
          <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Cooking your infrastructure...</h2>
              <p className="text-muted-foreground">Generating Terraform files from your architecture</p>
              {runId && (
                <p className="text-xs text-muted-foreground mt-2 font-mono">Run ID: {runId}</p>
              )}
            </div>
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : isCodeView ? (
          /* CODE VIEW */
          <div className="flex gap-4 h-[calc(100vh-10rem)]">
            {/* File Explorer */}
            <div className="w-64 bg-[#1e1e1e] rounded-lg border border-border overflow-hidden">
              <div className="p-3 border-b border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
                <FolderOpen className="h-4 w-4" />
                <span>terraform/</span>
              </div>
              <ScrollArea className="h-full">
                <div className="p-2">
                  {Object.keys(loadedFiles).map((filename) => (
                    <button
                      key={filename}
                      onClick={() => setSelectedFile(filename)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors",
                        selectedFile === filename
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <File className="h-4 w-4" />
                      {filename}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 rounded-lg overflow-hidden border border-border">
              <div className="bg-[#1e1e1e] px-4 py-2 border-b border-border/50 text-sm text-muted-foreground">
                {selectedFile}
              </div>
              <Editor
                height="calc(100% - 36px)"
                language="hcl"
                theme="vs-dark"
                value={loadedFiles[selectedFile] || ''}
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16 },
                }}
              />
            </div>
          </div>
        ) : (
          /* NON-CODE VIEW */
          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Resources Summary */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📦</span>
                  Resources to be Created ({infrastructureSummary.resources.reduce((sum, r) => sum + r.count, 0)})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {infrastructureSummary.resources.map((resource, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="p-3 rounded-lg bg-primary/10">
                        <resource.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">
                          {resource.count} × {resource.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {resource.spec}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Architecture Explanation */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🧠</span>
                  Architecture Explanation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-6 border border-border">
                  <p className="text-lg font-medium mb-4">Your infrastructure will:</p>
                  <ul className="space-y-3">
                    {infrastructureSummary.explanations.map((explanation, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-primary mt-1">•</span>
                        <span>{explanation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Visual Diff */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🔄</span>
                  Visual Diff (Before / After)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-semibold mb-4 text-muted-foreground">Current State</h4>
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="text-4xl mb-2">∅</div>
                      <p>No resources</p>
                    </div>
                  </div>
                  <div className="p-6 rounded-lg bg-green-500/10 border border-green-500/30">
                    <h4 className="font-semibold mb-4 text-green-500 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      After Apply
                    </h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <span className="text-lg">+</span> 2 Virtual Machines
                      </li>
                      <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <span className="text-lg">+</span> 1 Load Balancer
                      </li>
                      <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <span className="text-lg">+</span> 1 Secure Network
                      </li>
                      <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <span className="text-lg">+</span> 1 Storage Bucket
                      </li>
                      <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <span className="text-lg">+</span> 3 Firewall Rules
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Estimate */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  Estimated Monthly Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/20">
                  <div className="space-y-3">
                    {infrastructureSummary.costs.map((cost, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-muted-foreground">{cost.name}:</span>
                        <span className="font-mono">₹{cost.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-3 mt-3">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-primary">₹{totalCost.toLocaleString()} / month</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
