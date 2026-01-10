import { Node } from '@xyflow/react';
import { GCPNodeData, useArchitectureStore } from '@/store/architectureStore';
import { getNodeById, getCategoryColor } from '@/data/gcpNodes';
import { X, Settings, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface RightPanelProps {
  selectedNode: Node<GCPNodeData> | null;
  onClose: () => void;
}

const RightPanel = ({ selectedNode, onClose }: RightPanelProps) => {
  const { updateNodeConfig, deleteSelectedNode } = useArchitectureStore();
  const [localConfig, setLocalConfig] = useState<Record<string, string>>({});

  const nodeDefinition = selectedNode ? getNodeById(selectedNode.data.icon) : null;
  const IconComponent = nodeDefinition?.icon;

  useEffect(() => {
    if (selectedNode) {
      setLocalConfig(selectedNode.data.config || {});
    }
  }, [selectedNode]);

  const handleConfigChange = (key: string, value: string) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (selectedNode) {
      updateNodeConfig(selectedNode.id, localConfig);
    }
  };

  const handleDelete = () => {
    deleteSelectedNode();
    onClose();
  };

  if (!selectedNode || !nodeDefinition) {
    return (
      <div className="w-80 bg-sidebar border-l border-sidebar-border flex flex-col items-center justify-center h-full p-6 text-center">
        <Settings className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Node Selected</h3>
        <p className="text-sm text-muted-foreground">
          Click on a node in the canvas to view and edit its configuration
        </p>
      </div>
    );
  }

  const configFields = getConfigFields(selectedNode.data.icon);

  return (
    <div className="w-80 bg-sidebar border-l border-sidebar-border flex flex-col h-full animate-slide-in">
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Node Configuration</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="panel-section">
          <div className="flex items-start gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
              getCategoryColor(selectedNode.data.category)
            )}>
              {IconComponent && <IconComponent className="w-6 h-6 text-background" />}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{selectedNode.data.label}</h3>
              <p className="text-xs text-muted-foreground capitalize mb-2">
                {selectedNode.data.category}
              </p>
              <div className="flex items-center gap-1.5">
                {selectedNode.data.configured ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs text-accent">Configured</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Not configured</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <h4 className="panel-title">Description</h4>
          <p className="text-sm text-muted-foreground">{nodeDefinition.description}</p>
        </div>

        <div className="panel-section">
          <h4 className="panel-title">Configuration</h4>
          <div className="space-y-4">
            {configFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key} className="text-xs text-foreground">
                  {field.label}
                </Label>
                <Input
                  id={field.key}
                  placeholder={field.placeholder}
                  value={localConfig[field.key] || ''}
                  onChange={(e) => handleConfigChange(field.key, e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="panel-section">
          <h4 className="panel-title">Connections</h4>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-muted-foreground">Can connect to:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {nodeDefinition.connections.canConnectTo.length > 0 ? (
                  nodeDefinition.connections.canConnectTo.map((conn) => (
                    <span key={conn} className="px-2 py-0.5 bg-secondary rounded text-xs text-foreground">
                      {getNodeById(conn)?.label || conn}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">None</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Can receive from:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {nodeDefinition.connections.canReceiveFrom.length > 0 ? (
                  nodeDefinition.connections.canReceiveFrom.map((conn) => (
                    <span key={conn} className="px-2 py-0.5 bg-secondary rounded text-xs text-foreground">
                      {getNodeById(conn)?.label || conn}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">None</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button onClick={handleSave} className="w-full">
          Save Configuration
        </Button>
        <Button
          onClick={handleDelete}
          variant="outline"
          className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Node
        </Button>
      </div>
    </div>
  );
};

const getConfigFields = (nodeType: string): { key: string; label: string; placeholder: string }[] => {
  const commonFields: Record<string, { key: string; label: string; placeholder: string }[]> = {
    'compute-engine': [
      { key: 'name', label: 'Instance Name', placeholder: 'my-instance' },
      { key: 'machineType', label: 'Machine Type', placeholder: 'e2-medium' },
      { key: 'zone', label: 'Zone', placeholder: 'us-central1-a' },
    ],
    'cloud-run': [
      { key: 'name', label: 'Service Name', placeholder: 'my-service' },
      { key: 'image', label: 'Container Image', placeholder: 'gcr.io/project/image' },
      { key: 'region', label: 'Region', placeholder: 'us-central1' },
    ],
    'cloud-storage': [
      { key: 'name', label: 'Bucket Name', placeholder: 'my-bucket' },
      { key: 'location', label: 'Location', placeholder: 'US' },
      { key: 'storageClass', label: 'Storage Class', placeholder: 'STANDARD' },
    ],
    'cloud-sql': [
      { key: 'name', label: 'Instance Name', placeholder: 'my-db-instance' },
      { key: 'database', label: 'Database Name', placeholder: 'mydb' },
      { key: 'tier', label: 'Tier', placeholder: 'db-f1-micro' },
    ],
    'vpc': [
      { key: 'name', label: 'VPC Name', placeholder: 'my-vpc' },
      { key: 'cidr', label: 'IP Range', placeholder: '10.0.0.0/16' },
    ],
    'pub-sub': [
      { key: 'topicName', label: 'Topic Name', placeholder: 'my-topic' },
      { key: 'subscription', label: 'Subscription', placeholder: 'my-subscription' },
    ],
  };

  return commonFields[nodeType] || [
    { key: 'name', label: 'Name', placeholder: 'Enter name' },
  ];
};

export default RightPanel;
