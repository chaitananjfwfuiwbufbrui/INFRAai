import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, LayoutGrid } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
} from '@clerk/clerk-react';
import { useArchitectureStore } from '@/store/architectureStore';
import NavHeader from '@/components/shared/NavHeader';
import { apiEndpoints } from '@/lib/api';

// Dummy project data
const dummyProjects = [
  {
    id: '1',
    name: 'E-Commerce Platform',
    preview: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    lastEdited: '2 hours ago',
  },
  {
    id: '2',
    name: 'ML Pipeline Architecture',
    preview: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    lastEdited: 'Yesterday',
  },
  {
    id: '3',
    name: 'Microservices Setup',
    preview: 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=400&h=300&fit=crop',
    lastEdited: '3 days ago',
  },
  {
    id: '4',
    name: 'Data Lake Architecture',
    preview: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&h=300&fit=crop',
    lastEdited: '1 week ago',
  },
];

const Landing = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { loadArchitecture } = useArchitectureStore();

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    if (!isSignedIn) {
      // Will be handled by SignInButton click
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('prompt', prompt.trim());

      const response = await fetch(apiEndpoints.generateGraph, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate architecture');
      }

      const data = await response.json();

      // Load the graph into the canvas
      if (data.graph?.nodes && data.graph?.edges) {
        loadArchitecture(data.graph.nodes, data.graph.edges);
      }

      // Navigate to canvas with the prompt and summary
      navigate('/canvas', { 
        state: { 
          prompt: prompt.trim(),
          summary: data.summary,
          openChat: true 
        } 
      });
    } catch (error) {
      console.error('Error generating architecture:', error);
      // Still navigate but without pre-loaded architecture
      navigate('/canvas', { state: { prompt: prompt.trim(), openChat: true } });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isSignedIn) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            What will you <span className="text-primary italic">build</span> today?
          </h1>
          <p className="text-muted-foreground text-lg">
            Create stunning cloud architectures by chatting with AI.
          </p>
        </div>

        {/* Prompt Input */}
        <div className="w-full max-w-2xl mb-12">
          <div className="bg-card border border-border rounded-xl p-4 relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Let's build..."
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
              
              <SignedIn>
                <Button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isLoading}
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isLoading ? 'Generating...' : 'Plan'}
                </Button>
              </SignedIn>
              
              <SignedOut>
                <SignInButton mode="modal">
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground hover:bg-secondary gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Sign in to Plan
                  </Button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </div>

        {/* Projects Grid - Only shown when signed in */}
        <SignedIn>
          <div className="w-full max-w-5xl">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              Last Worked On
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {dummyProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => navigate('/canvas')}
                >
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img
                      src={project.preview}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-foreground truncate">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">{project.lastEdited}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SignedIn>
      </main>
    </div>
  );
};

export default Landing;
