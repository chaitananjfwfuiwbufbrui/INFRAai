import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DisconnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: string;
  onConfirm: () => void;
}

export default function DisconnectModal({ open, onOpenChange, platform, onConfirm }: DisconnectModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Disconnect {platform}</DialogTitle>
          <DialogDescription>
            Are you sure you want to disconnect {platform}? You will stop receiving notifications through this channel.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Disconnect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
