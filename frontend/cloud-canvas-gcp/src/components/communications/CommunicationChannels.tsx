import { useState } from 'react';
import { MessageCircle, Hash, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ChannelCard from './ChannelCard';
import ConnectModal from './ConnectModal';
import DisconnectModal from './DisconnectModal';
import { useCommunications } from '@/hooks/useCommunications';
import { toast } from 'sonner';

const platformIcons: Record<string, React.ReactNode> = {
  telegram: <Radio className="w-5 h-5 text-muted-foreground" />,
  slack: <Hash className="w-5 h-5 text-muted-foreground" />,
  discord: <MessageCircle className="w-5 h-5 text-muted-foreground" />,
};

export default function CommunicationChannels() {
  const { channels, connect, disconnect } = useCommunications();
  const [connectModal, setConnectModal] = useState<string | null>(null);
  const [disconnectModal, setDisconnectModal] = useState<string | null>(null);

  const activeConnectChannel = channels.find(c => c.id === connectModal);
  const activeDisconnectChannel = channels.find(c => c.id === disconnectModal);

  const handleConnect = (id: string) => {
    connect(id);
    setConnectModal(null);
    const name = channels.find(c => c.id === id)?.name;
    toast.success(`${name} connected successfully`);
  };

  const handleDisconnect = (id: string) => {
    disconnect(id);
    setDisconnectModal(null);
    const name = channels.find(c => c.id === id)?.name;
    toast.success(`${name} disconnected`);
  };

  return (
    <>
      <Card className="border-border/50 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-serif">Communication Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {channels.map(ch => (
            <ChannelCard
              key={ch.id}
              name={ch.name}
              connected={ch.connected}
              connectedAt={ch.connectedAt}
              onConnect={() => setConnectModal(ch.id)}
              onDisconnect={() => setDisconnectModal(ch.id)}
              icon={platformIcons[ch.id]}
            />
          ))}
        </CardContent>
      </Card>

      <ConnectModal
        open={!!connectModal}
        onOpenChange={(open) => !open && setConnectModal(null)}
        platform={activeConnectChannel?.name ?? ''}
        onConfirm={() => connectModal && handleConnect(connectModal)}
      />

      <DisconnectModal
        open={!!disconnectModal}
        onOpenChange={(open) => !open && setDisconnectModal(null)}
        platform={activeDisconnectChannel?.name ?? ''}
        onConfirm={() => disconnectModal && handleDisconnect(disconnectModal)}
      />
    </>
  );
}
