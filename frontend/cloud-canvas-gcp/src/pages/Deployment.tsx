import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Server, Network, Shield, Database, Scale,
  CheckCircle2, Edit, Trash2, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import NavHeader from '@/components/shared/NavHeader';
import CommunicationChannels from '@/components/communications/CommunicationChannels';
import { cn } from '@/lib/utils';
import { apiEndpoints, apiRequest } from '@/lib/api';
import { toast } from 'sonner';

interface LocationState {
  platform?: string;
  saKeyJson?: string;
}

const statusCards = [
  { icon: Server, title: 'Compute', status: 'Healthy', statusType: 'success' as const, details: '2 VMs · Running' },
  { icon: Network, title: 'Network', status: 'Secured', statusType: 'success' as const, details: 'Private VNet' },
  { icon: Shield, title: 'Security', status: 'Protected', statusType: 'success' as const, details: 'HTTPS only · No public SSH' },
  { icon: Database, title: 'Storage', status: 'Available', statusType: 'success' as const, details: 'Encrypted' },
  { icon: Scale, title: 'Load Balancer', status: 'Active', statusType: 'success' as const, details: 'Global HTTP(S)' },
];

const architectureNodes = [
  { id: 'vm1', label: 'VM-1', status: 'running' as const, x: 100, y: 100 },
  { id: 'vm2', label: 'VM-2', status: 'running' as const, x: 100, y: 200 },
  { id: 'lb', label: 'Load Balancer', status: 'running' as const, x: 300, y: 150 },
  { id: 'storage', label: 'Storage', status: 'running' as const, x: 500, y: 150 },
  { id: 'network', label: 'VPC Network', status: 'running' as const, x: 300, y: 50 },
];

const getStatusColor = (statusType: 'success' | 'warning' | 'error') => {
  switch (statusType) {
    case 'success': return 'text-green-600 bg-green-500/5 border-green-500/20';
    case 'warning': return 'text-yellow-600 bg-yellow-500/5 border-yellow-500/20';
    case 'error': return 'text-red-600 bg-red-500/5 border-red-500/20';
  }
};

const getStatusDot = (status: 'running' | 'warning' | 'error') => {
  switch (status) {
    case 'running': return '🟢';
    case 'warning': return '🟡';
    case 'error': return '🔴';
  }
};

export default function Deployment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId');
  const projectId = searchParams.get('projectId');
  const state = location.state as LocationState | null;
  const [isDestroyDialogOpen, setIsDestroyDialogOpen] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);

  const handleModify = () => navigate('/canvas');

  const handleDestroy = async () => {
    if (!runId || !projectId) { toast.error('Missing run ID or project ID'); return; }
    setIsDestroying(true);
    try {
      await apiRequest<{ status: string }>(apiEndpoints.execute, {
        method: 'POST',
        headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId, action: 'destroy', project_id: projectId, sa_key_json: state?.saKeyJson || '', auto_approve: true }),
      });
      toast.success('Infrastructure destroyed successfully!');
      setIsDestroyDialogOpen(false);
      navigate('/infrastructure');
    } catch (error) {
      console.error('Failed to destroy infrastructure:', error);
      toast.error('Failed to destroy infrastructure', { description: 'Please try again or check your configuration' });
    } finally {
      setIsDestroying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavHeader showBackButton backPath="/infrastructure" />

      <main className="container mx-auto px-4 py-12 space-y-10 max-w-6xl">
        {/* Success Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-semibold mb-3">Infrastructure Deployed</h1>
          <p className="text-muted-foreground text-lg">
            7 resources were created successfully and are currently running.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {state?.platform && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                Platform: {state.platform}
              </span>
            )}
            {runId && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-muted-foreground text-sm font-mono">
                Run: {runId}
              </span>
            )}
            {projectId && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-muted-foreground text-sm font-mono">
                Project: {projectId}
              </span>
            )}
          </div>
        </div>

        {/* Status Cards */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Health Overview</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {statusCards.map((card, index) => (
              <Card key={index} className={cn("border rounded-2xl transition-all", getStatusColor(card.statusType))}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <card.icon className="h-5 w-5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{card.status}</span>
                  </div>
                  <h3 className="font-semibold text-foreground">{card.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{card.details}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Architecture Snapshot */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Architecture Snapshot</p>
          <Card className="border-border/50 rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Read-only view · Live status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-secondary/30 rounded-xl border border-border/50 min-h-[300px] overflow-hidden">
                <svg className="w-full h-[300px]" viewBox="0 0 600 300">
                  <line x1="150" y1="120" x2="300" y2="170" stroke="currentColor" strokeWidth="2" className="text-border" strokeDasharray="5,5" />
                  <line x1="150" y1="220" x2="300" y2="170" stroke="currentColor" strokeWidth="2" className="text-border" strokeDasharray="5,5" />
                  <line x1="350" y1="170" x2="480" y2="170" stroke="currentColor" strokeWidth="2" className="text-border" strokeDasharray="5,5" />
                  <line x1="320" y1="70" x2="320" y2="150" stroke="currentColor" strokeWidth="2" className="text-border" strokeDasharray="5,5" />
                  {architectureNodes.map((node) => (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                      <rect x="-45" y="-25" width="90" height="50" rx="12" className="fill-card stroke-border" strokeWidth="1.5" />
                      <text x="0" y="-5" textAnchor="middle" className="fill-foreground text-xs font-medium">{node.label}</text>
                      <text x="0" y="12" textAnchor="middle" className="text-sm">{getStatusDot(node.status)}</text>
                    </g>
                  ))}
                </svg>
                <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><span>🟢</span> Running</div>
                  <div className="flex items-center gap-1.5"><span>🟡</span> Warning</div>
                  <div className="flex items-center gap-1.5"><span>🔴</span> Error</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Communication Channels */}
        <section>
          <CommunicationChannels />
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button onClick={handleModify} variant="outline" size="lg" className="flex-1 gap-2 rounded-xl">
            <Edit className="h-5 w-5" /> Modify Architecture
          </Button>
          <Button onClick={() => setIsDestroyDialogOpen(true)} variant="destructive" size="lg" className="flex-1 gap-2 rounded-xl">
            <Trash2 className="h-5 w-5" /> Destroy Infrastructure
          </Button>
        </div>
      </main>

      <Dialog open={isDestroyDialogOpen} onOpenChange={setIsDestroyDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 font-serif">
              <Trash2 className="h-5 w-5" /> Destroy Infrastructure
            </DialogTitle>
            <DialogDescription>
              This action will permanently destroy all resources in this deployment. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-sm">
              <p className="font-medium text-destructive mb-2">The following will be destroyed:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>2 Virtual Machines</li>
                <li>1 VPC Network</li>
                <li>1 Load Balancer</li>
                <li>1 Storage Bucket</li>
                <li>3 Security Rules</li>
              </ul>
            </div>
            {runId && <p className="text-xs text-muted-foreground font-mono">Run ID: {runId}</p>}
            {projectId && <p className="text-xs text-muted-foreground font-mono">Project: {projectId}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDestroyDialogOpen(false)} disabled={isDestroying} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDestroy} disabled={isDestroying} className="rounded-xl">
              {isDestroying ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Destroying...</>) : 'Destroy All Resources'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
