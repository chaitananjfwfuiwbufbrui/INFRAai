import { useState, useCallback } from 'react';

export interface CommunicationChannel {
  id: string;
  name: string;
  connected: boolean;
  connectedAt?: string;
}

const initialChannels: CommunicationChannel[] = [
  { id: 'telegram', name: 'Telegram', connected: false },
  { id: 'slack', name: 'Slack', connected: false },
  { id: 'discord', name: 'Discord', connected: false },
];

export function useCommunications() {
  const [channels, setChannels] = useState<CommunicationChannel[]>(initialChannels);

  const connect = useCallback((id: string) => {
    setChannels(prev =>
      prev.map(ch =>
        ch.id === id ? { ...ch, connected: true, connectedAt: new Date().toISOString() } : ch
      )
    );
  }, []);

  const disconnect = useCallback((id: string) => {
    setChannels(prev =>
      prev.map(ch =>
        ch.id === id ? { ...ch, connected: false, connectedAt: undefined } : ch
      )
    );
  }, []);

  return { channels, connect, disconnect };
}
