import { Outlet } from 'react-router-dom';
import GlobalChatOverlay from '@/components/chat/GlobalChatOverlay';

const AppLayoutWithChat = () => (
  <>
    <Outlet />
    <GlobalChatOverlay />
  </>
);

export default AppLayoutWithChat;
