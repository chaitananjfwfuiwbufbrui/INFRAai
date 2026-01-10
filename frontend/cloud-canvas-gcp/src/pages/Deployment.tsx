import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cloud, Key, CheckCircle2, Loader2, Copy, Sun, Moon, Terminal, Code2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useArchitectureStore } from '@/store/architectureStore';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

const Deployment = () => {
  const navigate = useNavigate();
  const { nodes } = useArchitectureStore();
  const { theme, toggleTheme } = useTheme();
  const [projectId, setProjectId] = useState('');
  const [serviceAccountKey, setServiceAccountKey] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [viewMode, setViewMode] = useState<'nocode' | 'code'>('nocode');
  const [deployedServices, setDeployedServices] = useState<string[]>([]);

  const handleDeploy = () => {
    if (!projectId || !serviceAccountKey) return;
    
    setIsDeploying(true);
    // Simulate deployment
    const services = nodes.map(n => n.data.label);
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < services.length) {
        setDeployedServices(prev => [...prev, services[index]]);
        index++;
      } else {
        clearInterval(interval);
        setIsDeploying(false);
      }
    }, 800);
  };

  const generateTerraformCode = () => {
    let code = `# Generated Terraform Configuration
# Project: ${projectId || 'your-project-id'}

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = "${projectId || 'your-project-id'}"
  region  = "us-central1"
}

`;

    nodes.forEach(node => {
      const resourceName = node.data.label.toLowerCase().replace(/\s+/g, '_');
      
      switch (node.data.type) {
        case 'compute_engine':
          code += `# Compute Engine Instance
resource "google_compute_instance" "${resourceName}" {
  name         = "${resourceName}"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }
}

`;
          break;
        case 'cloud_run':
          code += `# Cloud Run Service
resource "google_cloud_run_service" "${resourceName}" {
  name     = "${resourceName}"
  location = "us-central1"

  template {
    spec {
      containers {
        image = "gcr.io/cloudrun/hello"
      }
    }
  }
}

`;
          break;
        case 'cloud_storage':
          code += `# Cloud Storage Bucket
resource "google_storage_bucket" "${resourceName}" {
  name          = "${resourceName}-\${random_id.bucket_suffix.hex}"
  location      = "US"
  force_destroy = true

  uniform_bucket_level_access = true
}

`;
          break;
        case 'cloud_sql':
          code += `# Cloud SQL Instance
resource "google_sql_database_instance" "${resourceName}" {
  name             = "${resourceName}"
  database_version = "POSTGRES_14"
  region           = "us-central1"

  settings {
    tier = "db-f1-micro"
  }

  deletion_protection = false
}

`;
          break;
        case 'vpc':
          code += `# VPC Network
resource "google_compute_network" "${resourceName}" {
  name                    = "${resourceName}"
  auto_create_subnetworks = false
}

`;
          break;
        case 'load_balancer':
          code += `# HTTP Load Balancer
resource "google_compute_global_forwarding_rule" "${resourceName}" {
  name       = "${resourceName}"
  target     = google_compute_target_http_proxy.${resourceName}_proxy.id
  port_range = "80"
}

resource "google_compute_target_http_proxy" "${resourceName}_proxy" {
  name    = "${resourceName}-proxy"
  url_map = google_compute_url_map.${resourceName}_urlmap.id
}

resource "google_compute_url_map" "${resourceName}_urlmap" {
  name            = "${resourceName}-urlmap"
  default_service = google_compute_backend_service.${resourceName}_backend.id
}

`;
          break;
        case 'pubsub':
          code += `# Pub/Sub Topic
resource "google_pubsub_topic" "${resourceName}" {
  name = "${resourceName}"
}

resource "google_pubsub_subscription" "${resourceName}_sub" {
  name  = "${resourceName}-subscription"
  topic = google_pubsub_topic.${resourceName}.name
}

`;
          break;
        case 'firestore':
          code += `# Firestore Database
resource "google_firestore_database" "${resourceName}" {
  project     = "${projectId || 'your-project-id'}"
  name        = "(default)"
  location_id = "us-central"
  type        = "FIRESTORE_NATIVE"
}

`;
          break;
        default:
          code += `# ${node.data.label}
# Resource configuration for ${node.data.type}
# Add your configuration here

`;
      }
    });

    return code;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateTerraformCode());
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/canvas')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Cloud className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground leading-none">Deploy Architecture</h1>
              <span className="text-xs text-muted-foreground">GCP Deployment</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center bg-secondary rounded-lg p-1">
            <button
              onClick={() => setViewMode('nocode')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'nocode'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Eye className="w-4 h-4" />
              No Code
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'code'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Code2 className="w-4 h-4" />
              Code
            </button>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {viewMode === 'nocode' ? (
          <>
            {/* Credentials Panel */}
            <div className="w-96 border-r border-border bg-sidebar p-6 overflow-y-auto">
              <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Cloud Credentials
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectId" className="text-foreground">GCP Project ID</Label>
                  <Input
                    id="projectId"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="my-gcp-project"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="serviceKey" className="text-foreground">Service Account Key (JSON)</Label>
                  <textarea
                    id="serviceKey"
                    value={serviceAccountKey}
                    onChange={(e) => setServiceAccountKey(e.target.value)}
                    placeholder='{"type": "service_account", ...}'
                    className="mt-1.5 w-full h-32 px-3 py-2 bg-background border border-input rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <Button
                  onClick={handleDeploy}
                  disabled={!projectId || !serviceAccountKey || isDeploying}
                  className="w-full"
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4 mr-2" />
                      Deploy to GCP
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-medium text-foreground mb-3">Services to Deploy</h3>
                <div className="space-y-2">
                  {nodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No services in architecture</p>
                  ) : (
                    nodes.map(node => (
                      <div
                        key={node.id}
                        className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg text-sm"
                      >
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          deployedServices.includes(node.data.label)
                            ? 'bg-green-500'
                            : 'bg-muted-foreground'
                        )} />
                        <span className="text-foreground">{node.data.label}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Logs Panel */}
            <div className="flex-1 bg-background p-6 overflow-y-auto">
              <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-primary" />
                Deployment Logs
              </h2>

              <div className="bg-[#1e1e1e] rounded-lg p-4 font-mono text-sm min-h-[400px]">
                {deployedServices.length === 0 ? (
                  <p className="text-[#6a9955]"># Waiting to start deployment...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[#569cd6]">$ terraform init</p>
                    <p className="text-[#dcdcdc]">Initializing the backend...</p>
                    <p className="text-[#dcdcdc]">Initializing provider plugins...</p>
                    <p className="text-[#6a9955]">Terraform has been successfully initialized!</p>
                    <br />
                    <p className="text-[#569cd6]">$ terraform apply -auto-approve</p>
                    <br />
                    {deployedServices.map((service, index) => (
                      <div key={service} className="space-y-1">
                        <p className="text-[#dcdcdc]">
                          <span className="text-[#4ec9b0]">google_resource.{service.toLowerCase().replace(/\s+/g, '_')}</span>: Creating...
                        </p>
                        <p className="text-[#6a9955]">
                          <CheckCircle2 className="w-4 h-4 inline mr-1" />
                          google_resource.{service.toLowerCase().replace(/\s+/g, '_')}: Creation complete
                        </p>
                      </div>
                    ))}
                    {!isDeploying && deployedServices.length === nodes.length && nodes.length > 0 && (
                      <>
                        <br />
                        <p className="text-[#6a9955]">Apply complete! Resources: {nodes.length} added, 0 changed, 0 destroyed.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Code View - VS Code Style */
          <div className="flex-1 flex flex-col">
            {/* File Tabs */}
            <div className="h-10 bg-[#252526] border-b border-[#1e1e1e] flex items-center px-2">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-[#1e1e1e] text-[#cccccc] text-sm rounded-t">
                <Code2 className="w-4 h-4 text-[#519aba]" />
                main.tf
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                className="ml-auto h-7 w-7 text-[#cccccc] hover:text-white hover:bg-[#3c3c3c]"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            {/* Code Editor */}
            <div className="flex-1 bg-[#1e1e1e] overflow-auto">
              <div className="flex min-h-full">
                {/* Line Numbers */}
                <div className="py-4 px-3 text-right text-[#858585] text-sm font-mono select-none border-r border-[#3c3c3c] bg-[#1e1e1e]">
                  {generateTerraformCode().split('\n').map((_, i) => (
                    <div key={i} className="leading-6">{i + 1}</div>
                  ))}
                </div>

                {/* Code Content */}
                <pre className="flex-1 p-4 text-sm font-mono overflow-x-auto">
                  <code>
                    {generateTerraformCode().split('\n').map((line, i) => (
                      <div key={i} className="leading-6">
                        {line.startsWith('#') ? (
                          <span className="text-[#6a9955]">{line}</span>
                        ) : line.includes('resource') ? (
                          <>
                            <span className="text-[#569cd6]">resource</span>
                            <span className="text-[#dcdcdc]">{line.replace('resource', '')}</span>
                          </>
                        ) : line.includes('provider') ? (
                          <>
                            <span className="text-[#569cd6]">provider</span>
                            <span className="text-[#dcdcdc]">{line.replace('provider', '')}</span>
                          </>
                        ) : line.includes('terraform') ? (
                          <>
                            <span className="text-[#569cd6]">terraform</span>
                            <span className="text-[#dcdcdc]">{line.replace('terraform', '')}</span>
                          </>
                        ) : line.includes('=') ? (
                          <>
                            <span className="text-[#9cdcfe]">{line.split('=')[0]}</span>
                            <span className="text-[#dcdcdc]">=</span>
                            <span className="text-[#ce9178]">{line.split('=').slice(1).join('=')}</span>
                          </>
                        ) : (
                          <span className="text-[#dcdcdc]">{line}</span>
                        )}
                      </div>
                    ))}
                  </code>
                </pre>
              </div>
            </div>

            {/* Status Bar */}
            <div className="h-6 bg-[#007acc] flex items-center justify-between px-3 text-[11px] text-white">
              <div className="flex items-center gap-4">
                <span>Terraform</span>
                <span>UTF-8</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Ln {generateTerraformCode().split('\n').length}, Col 1</span>
                <span>Spaces: 2</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Deployment;
