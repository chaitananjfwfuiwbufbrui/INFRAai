import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Server,
  Network,
  Shield,
  Database,
  Scale,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import NavHeader from '@/components/shared/NavHeader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DeploymentStatus {
  run_id: string;
  status: 'running' | 'completed' | 'failed' | 'initializing';
  phase?: string;
  updated_at: number;
  error?: string;
  error_type?: string;
  tfstate?: any;
}

interface LogsResponse {
  run_id: string;
  logs: string;
  lines: string[];
}

const PHASE_LABELS: Record<string, string> = {
  starting: 'Starting',
  initializing: 'Initializing Terraform',
  validating: 'Validating Configuration',
  fix_attempt_1: 'Auto-fixing (Attempt 1/3)',
  fix_attempt_2: 'Auto-fixing (Attempt 2/3)',
  fix_attempt_3: 'Auto-fixing (Attempt 3/3)',
  planning: 'Planning Changes',
  applying: 'Applying Infrastructure',
  finalizing: 'Finalizing',
};

export default function Deployment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const runId = searchParams.get('runId');
  const projectId = searchParams.get('projectId');

  const [status, setStatus] = useState<DeploymentStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [resources, setResources] = useState<any[]>([]);

  // Poll status and logs
  useEffect(() => {
    if (!runId) {
      toast.error('No run ID provided');
      navigate('/infrastructure');
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(`http://localhost:8000/runs/${runId}/status`);
        const data: DeploymentStatus = await response.json();
        setStatus(data);

        // Extract resources from tfstate
        if (data.tfstate && data.tfstate.resources) {
          setResources(data.tfstate.resources);
        }
      } catch (error) {
        console.error('Failed to fetch status:', error);
      }
    };

    const fetchLogs = async () => {
      try {
        const response = await fetch(`http://localhost:8000/runs/${runId}/logs`);
        const data: LogsResponse = await response.json();
        setLogs(data.lines.filter(line => line.trim()));
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      }
    };

    // Initial fetch
    fetchStatus();
    fetchLogs();

    // Poll every 2 seconds if still running
    const statusInterval = setInterval(() => {
      fetchStatus();
    }, 2000);

    const logsInterval = setInterval(() => {
      fetchLogs();
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(logsInterval);
    };
  }, [runId, navigate]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleRetry = async () => {
    if (!runId || !projectId) {
      toast.error('Missing run ID or project ID');
      return;
    }

    setIsRetrying(true);

    try {
      const response = await fetch('http://localhost:8000/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          run_id: runId,
          action: 'apply',
          project_id: projectId,
          sa_key_json: '', // Should be stored somewhere
          auto_approve: true,
        }),
      });

      if (!response.ok) throw new Error('Retry failed');

      toast.success('Retrying deployment...');
      setStatus(null);
      setLogs([]);
    } catch (error) {
      console.error('Failed to retry:', error);
      toast.error('Failed to retry deployment');
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusIcon = () => {
    if (!status) return <Loader2 className="w-10 h-10 text-primary animate-spin" />;

    switch (status.status) {
      case 'completed':
        return <CheckCircle2 className="w-10 h-10 text-green-500" />;
      case 'failed':
        return <XCircle className="w-10 h-10 text-red-500" />;
      default:
        return <Loader2 className="w-10 h-10 text-primary animate-spin" />;
    }
  };

  const getStatusColor = () => {
    if (!status) return 'bg-primary/10';

    switch (status.status) {
      case 'completed':
        return 'bg-green-500/10';
      case 'failed':
        return 'bg-red-500/10';
      default:
        return 'bg-primary/10';
    }
  };

  const getStatusTitle = () => {
    if (!status) return 'Loading...';

    switch (status.status) {
      case 'completed':
        return 'Infrastructure Deployed Successfully';
      case 'failed':
        return 'Deployment Failed';
      case 'running':
        return status.phase ? PHASE_LABELS[status.phase] || status.phase : 'Deploying Infrastructure';
      default:
        return 'Initializing Deployment';
    }
  };

  const getResourceIcon = (type: string) => {
    if (type.includes('compute')) return Server;
    if (type.includes('network') || type.includes('subnetwork')) return Network;
    if (type.includes('firewall')) return Shield;
    if (type.includes('storage') || type.includes('bucket')) return Database;
    if (type.includes('load_balancer') || type.includes('forwarding')) return Scale;
    return Server;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavHeader showBackButton backPath="/infrastructure" />

      <main className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
        {/* Status Header */}
        <div className="text-center py-6">
          <div className={cn("inline-flex items-center justify-center w-20 h-20 rounded-full mb-4", getStatusColor())}>
            {getStatusIcon()}
          </div>
          <h1 className="text-3xl font-bold mb-2">{getStatusTitle()}</h1>
          {status?.phase && status.status === 'running' && (
            <p className="text-muted-foreground">
              {PHASE_LABELS[status.phase] || status.phase}
            </p>
          )}
          {status?.error && (
            <div className="mt-4 max-w-2xl mx-auto">
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-red-500 mb-1">Error Details:</p>
                    <p className="text-sm text-red-400 whitespace-pre-wrap font-mono">
                      {status.error}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deployment Info */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {runId && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-mono">
                Run: {runId}
              </div>
            )}
            {projectId && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm font-mono">
                Project: {projectId}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Terminal Logs */}
          <Card className="border-border lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Execution Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] w-full rounded-lg bg-black/90 p-4 font-mono text-sm">
                <div className="space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-green-400">Waiting for logs...</div>
                  ) : (
                    logs.map((line, index) => (
                      <div
                        key={index}
                        className={cn(
                          "whitespace-pre-wrap break-all",
                          line.includes('ERROR') || line.includes('FATAL') ? 'text-red-400' :
                            line.includes('WARNING') || line.includes('WARN') ? 'text-yellow-400' :
                              line.includes('SUCCESS') || line.includes('completed') ? 'text-green-400' :
                                'text-gray-300'
                        )}
                      >
                        {line}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Resources */}
          <Card className="border-border lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Resources {resources.length > 0 && `(${resources.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] w-full">
                {status?.status === 'completed' && resources.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No resources found in terraform state</p>
                  </div>
                )}
                {status?.status !== 'completed' && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin" />
                    <p>Resources will appear after deployment completes</p>
                  </div>
                )}
                {resources.length > 0 && (
                  <div className="space-y-3">
                    {resources.map((resource, index) => {
                      const ResourceIcon = getResourceIcon(resource.type);
                      return (
                        <div
                          key={index}
                          className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <ResourceIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate">
                                {resource.name}
                              </div>
                              <div className="text-sm text-muted-foreground font-mono truncate">
                                {resource.type}
                              </div>
                              {resource.instances && resource.instances[0]?.attributes && (
                                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                  {resource.instances[0].attributes.zone && (
                                    <div>Zone: {resource.instances[0].attributes.zone}</div>
                                  )}
                                  {resource.instances[0].attributes.machine_type && (
                                    <div>Type: {resource.instances[0].attributes.machine_type}</div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Active
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          {status?.status === 'failed' && (
            <Button
              onClick={handleRetry}
              size="lg"
              className="flex-1 gap-2"
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  Retry Deployment
                </>
              )}
            </Button>
          )}
          {status?.status === 'completed' && (
            <Button
              onClick={() => navigate('/infrastructure')}
              size="lg"
              className="flex-1 gap-2"
            >
              View Infrastructure
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
