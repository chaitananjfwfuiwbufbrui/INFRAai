import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GCPNodeData } from '@/store/architectureStore';
import { getCategoryColor, getCategoryBorderColor } from '@/hooks/useCloudNodes';
import { CheckCircle2, AlertCircle, Server, Cloud, Globe, Network, HardDrive, Database, MessageSquare, Shield, Container, Layers, Radio, Lock, Key, FileText, Workflow, BarChart3, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Map icon string names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Server,
  Cloud,
  Globe,
  Network,
  HardDrive,
  Database,
  MessageSquare,
  Shield,
  Container,
  Layers,
  Radio,
  Lock,
  Key,
  FileText,
  Workflow,
  BarChart3,
};

type GCPNodeProps = NodeProps & { data: GCPNodeData };

const GCPNode = memo(({ data, selected }: GCPNodeProps) => {
  // data.icon now contains the icon name string from API
  const IconComponent = iconMap[data.icon] || Server;

  return (
    <div
      className={cn(
        'node-card animate-fade-in',
        selected && 'selected',
        getCategoryBorderColor(data.category)
      )}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="node-handle !-top-1.5"
      />
      
      {/* Left Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="node-handle !-left-1.5"
      />
      
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          getCategoryColor(data.category)
        )}>
          <IconComponent className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground truncate">
              {data.label}
            </span>
            {data.configured ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
          <span className="text-xs text-muted-foreground capitalize">
            {data.category}
          </span>
        </div>
      </div>

      {/* Right Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="node-handle !-right-1.5"
      />

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="node-handle !-bottom-1.5"
      />
    </div>
  );
});

GCPNode.displayName = 'GCPNode';

export default GCPNode;
