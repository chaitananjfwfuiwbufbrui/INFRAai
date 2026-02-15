import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, ExternalLink } from 'lucide-react';

interface ConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: string;
  onConfirm: () => void;
}

export default function ConnectModal({ open, onOpenChange, platform, onConfirm }: ConnectModalProps) {
  const isTelegram = platform === 'Telegram';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {platform}</DialogTitle>
          <DialogDescription>
            {isTelegram
              ? 'Scan this QR code in Telegram to link your workspace.'
              : `Authorize ${platform} to connect with your workspace.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center gap-4">
          {isTelegram ? (
            <div className="w-48 h-48 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/30">
              <QrCode className="w-20 h-20 text-muted-foreground" />
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <ExternalLink className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Click below to authorize {platform}. You'll be redirected to complete the setup.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            {isTelegram ? "I've Connected" : `Connect ${platform}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
