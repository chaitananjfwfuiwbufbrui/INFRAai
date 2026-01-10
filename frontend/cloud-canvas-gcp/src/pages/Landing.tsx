import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, Sun, Moon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

const Landing = () => {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = () => {
    if (prompt.trim()) {
      navigate('/canvas', { state: { prompt: prompt.trim() } });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-foreground font-bold text-xl italic">cloud</span>
          <span className="text-muted-foreground text-sm">.architect</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-20">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            What will you <span className="text-primary italic">build</span> today?
          </h1>
          <p className="text-muted-foreground text-lg">
            Create stunning cloud architectures by chatting with AI.
          </p>
        </div>

        {/* Prompt Input */}
        <div className="w-full max-w-2xl">
          <div className="bg-card border border-border rounded-xl p-4 relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Let's build"
              className="bg-transparent border-0 text-foreground placeholder:text-muted-foreground resize-none min-h-[100px] focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            />
            <div className="flex items-center justify-between mt-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full w-8 h-8"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground hover:bg-secondary gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Plan
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;
