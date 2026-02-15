import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ChannelCardProps {
  name: string;
  connected: boolean;
  connectedAt?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  icon: React.ReactNode;
}

export default function ChannelCard({ name, connected, connectedAt, onConnect, onDisconnect, icon }: ChannelCardProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:border-foreground/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
          {icon}
        </div>
        <div>
          <p className="font-medium text-foreground">{name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={connected ? 'default' : 'secondary'} className={cn('text-xs', connected && 'bg-green-500/15 text-green-500 border-green-500/30 hover:bg-green-500/20')}>
              {connected ? 'Connected' : 'Not Connected'}
            </Badge>
            {connected && connectedAt && (
              <span className="text-xs text-muted-foreground">
                since {new Date(connectedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
      <Button
        variant={connected ? 'outline' : 'default'}
        size="sm"
        onClick={connected ? onDisconnect : onConnect}
        className="rounded-full px-5"
      >
        {connected ? 'Disconnect' : 'Connect'}
      </Button>
    </div>
  );
}
