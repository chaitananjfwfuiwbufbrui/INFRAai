import { useState, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import AIChatPopup from './AIChatPopup';

const GlobalChatOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMaximized(false);
  }, []);

  const handleToggleMaximize = useCallback(() => {
    setIsMaximized(prev => !prev);
  }, []);

  const handleNewMessage = useCallback(() => {
    if (!isOpen) {
      setUnreadCount(prev => prev + 1);
    }
  }, [isOpen]);

  return (
    <>
      {/* Dimmed overlay when maximized */}
      {isOpen && isMaximized && (
        <div
          className="fixed inset-0 bg-black/40 z-[9998] transition-opacity"
          onClick={handleClose}
        />
      )}

      {/* Floating chat icon */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
          aria-label="Open AI Chat"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      <AIChatPopup
        isOpen={isOpen}
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={handleToggleMaximize}
        onNewMessage={handleNewMessage}
      />
    </>
  );
};

export default GlobalChatOverlay;
