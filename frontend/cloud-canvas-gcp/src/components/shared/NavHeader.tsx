import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, LayoutGrid, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from '@clerk/clerk-react';

interface NavHeaderProps {
  showBackButton?: boolean;
  backPath?: string;
  rightContent?: React.ReactNode;
}

export default function NavHeader({ 
  showBackButton = false, 
  backPath = '/',
  rightContent 
}: NavHeaderProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="p-4 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-2">
        {showBackButton && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(backPath)}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <Link to="/" className="flex items-center gap-2">
          <LayoutGrid className="w-6 h-6 text-primary" />
          <span className="text-foreground font-bold text-xl italic">cloud</span>
          <span className="text-muted-foreground text-sm">.architect</span>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        {rightContent}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9"
              }
            }}
          />
        </SignedIn>
      </div>
    </header>
  );
}
