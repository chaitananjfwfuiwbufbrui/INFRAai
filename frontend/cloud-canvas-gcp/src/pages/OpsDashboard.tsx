
import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Activity, Play, Pause, Zap } from 'lucide-react';
import NavHeader from '@/components/shared/NavHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function OpsDashboard() {
    const [alerts, setAlerts] = useState<any[]>([]);
    const [autonomyEnabled, setAutonomyEnabled] = useState(true);

    // Mock initial data for demo (until API is live)
    useEffect(() => {
        // In real app: fetch from GET /ops/alerts/active
        setAlerts([
            {
                id: 1,
                severity: 'critical',
                resource: 'vm-backend-1',
                metric: 'cpu_utilization',
                value: '92%',
                decision: {
                    action: 'scale_up',
                    confidence: 0.95,
                    reason: 'Consistently high CPU > 90% for 5 mins. Auto-scaling policy triggers at 80%.'
                },
                status: 'pending',
                timestamp: '2 mins ago'
            },
            {
                id: 2,
                severity: 'warning',
                resource: 'sql-db-main',
                metric: 'disk_usage',
                value: '78%',
                decision: {
                    action: 'ignore',
                    confidence: 0.88,
                    reason: 'Spike is transient due to nightly backup job. Will resolve automatically.'
                },
                status: 'pending',
                timestamp: '15 mins ago'
            }
        ]);
    }, []);

    const handleAction = async (alertId: number, action: 'approve' | 'reject') => {
        toast.info(`${action === 'approve' ? 'Executing' : 'Rejecting'} action for Alert #${alertId}...`);

        // Simulate API call
        setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== alertId));
            toast.success(`Action ${action}d successfully`);
        }, 1000);
    };

    const toggleAutonomy = () => {
        setAutonomyEnabled(!autonomyEnabled);
        toast(autonomyEnabled ? "Autonomy PAUSED (Kill-Switch Active)" : "Autonomy RESUMED");
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <NavHeader />

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Shield className="w-8 h-8 text-primary" />
                            Ops Automation Center
                        </h1>
                        <p className="text-muted-foreground mt-1">Autonomous infrastructure agent • Gemini 2.5 Pro</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${autonomyEnabled ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                            {autonomyEnabled ? <Activity className="w-4 h-4 animate-pulse" /> : <Pause className="w-4 h-4" />}
                            <span className="font-medium">{autonomyEnabled ? 'SYSTEM ACTIVE' : 'SYSTEM PAUSED'}</span>
                        </div>
                        <Button variant={autonomyEnabled ? "destructive" : "default"} onClick={toggleAutonomy}>
                            {autonomyEnabled ? 'STOP AUTONOMY' : 'RESUME'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Active Alerts Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            Pending Decisions
                        </h2>

                        {alerts.map((alert) => (
                            <Card key={alert.id} className="border-border">
                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                    <div>
                                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'} className="mb-2">
                                            {alert.severity.toUpperCase()}
                                        </Badge>
                                        <CardTitle className="text-lg">{alert.resource}</CardTitle>
                                        <p className="text-sm text-muted-foreground font-mono mt-1">
                                            {alert.metric} = <span className="text-foreground font-bold">{alert.value}</span>
                                        </p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                                </CardHeader>

                                <CardContent>
                                    <div className="bg-secondary/30 p-4 rounded-lg border border-border mb-4">
                                        <div className="flex items-start gap-3">
                                            <Zap className="w-5 h-5 text-purple-400 mt-1" />
                                            <div>
                                                <p className="font-medium text-purple-400 mb-1">Gemini Recommendation</p>
                                                <p className="text-sm mb-2">{alert.decision.reason}</p>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        Proposed: <code className="bg-black/20 px-1 rounded">{alert.decision.action}</code>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        Confidence: <span className="text-green-400">{(alert.decision.confidence * 100).toFixed(0)}%</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <Button variant="outline" onClick={() => handleAction(alert.id, 'reject')}>
                                            Ignore
                                        </Button>
                                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => handleAction(alert.id, 'approve')}>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Approve {alert.decision.action}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {alerts.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                                <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">All systems nominal</p>
                                <p className="text-muted-foreground">No active alerts requiring human attention.</p>
                            </div>
                        )}
                    </div>

                    {/* History / Status Column */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-500" />
                            Action History
                        </h2>

                        <Card className="border-border">
                            <CardContent className="pt-6">
                                <div className="relative border-l border-border ml-3 space-y-6 pb-2">
                                    <div className="ml-6 relative">
                                        <span className="absolute -left-[31px] bg-green-500 h-2.5 w-2.5 rounded-full ring-4 ring-background" />
                                        <p className="text-sm font-medium">Scaled vm-backend-cluster</p>
                                        <p className="text-xs text-muted-foreground">Approved by Human • 1h ago</p>
                                    </div>
                                    <div className="ml-6 relative">
                                        <span className="absolute -left-[31px] bg-green-500 h-2.5 w-2.5 rounded-full ring-4 ring-background" />
                                        <p className="text-sm font-medium">Restarted pod-payments-v1</p>
                                        <p className="text-xs text-muted-foreground">Auto-Fixed (Confidence 0.98) • 3h ago</p>
                                    </div>
                                    <div className="ml-6 relative">
                                        <span className="absolute -left-[31px] bg-red-500 h-2.5 w-2.5 rounded-full ring-4 ring-background" />
                                        <p className="text-sm font-medium">Ops Autonomy Paused</p>
                                        <p className="text-xs text-muted-foreground">Manual Override • 5h ago</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
