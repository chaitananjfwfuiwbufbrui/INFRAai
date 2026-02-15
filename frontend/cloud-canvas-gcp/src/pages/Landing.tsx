import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, LayoutGrid } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useArchitectureStore } from '@/store/architectureStore';
import NavHeader from '@/components/shared/NavHeader';
import { apiEndpoints } from '@/lib/api';
import { ENABLE_CLERK_AUTH, CLERK_PUBLISHABLE_KEY } from '@/config/app.config';

const LandingWithAuth = lazy(() => import('./LandingWithAuth'));

const dummyProjects = [
  { id: '1', name: 'E-Commerce Platform', preview: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop', lastEdited: '2 hours ago' },
  { id: '2', name: 'ML Pipeline Architecture', preview: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop', lastEdited: 'Yesterday' },
  { id: '3', name: 'Microservices Setup', preview: 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=400&h=300&fit=crop', lastEdited: '3 days ago' },
  { id: '4', name: 'Data Lake Architecture', preview: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&h=300&fit=crop', lastEdited: '1 week ago' },
];

export { dummyProjects };

const LandingNoAuth = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { loadArchitecture } = useArchitectureStore();

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('prompt', prompt.trim());
      const response = await fetch(apiEndpoints.generateGraph, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to generate architecture');
      const data = await response.json();
      if (data.graph?.nodes && data.graph?.edges) loadArchitecture(data.graph.nodes, data.graph.edges);
      navigate('/canvas', { state: { prompt: prompt.trim(), summary: data.summary, openChat: true } });
    } catch (error) {
      console.error('Error generating architecture:', error);
      navigate('/canvas', { state: { prompt: prompt.trim(), openChat: true } });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavHeader />

      <main className="flex-1 flex flex-col items-center px-4 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card text-sm text-muted-foreground mb-6">
            <span className="w-2 h-2 rounded-full bg-accent" />
            AI-powered cloud architecture
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-semibold text-foreground mb-4 leading-[1.1]">
            What will you <span className="italic">build</span> today?
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Create stunning cloud architectures by chatting with AI.
          </p>
        </div>

        <div className="w-full max-w-2xl mb-16">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your infrastructure..."
              className="bg-transparent border-0 text-foreground placeholder:text-muted-foreground resize-none min-h-[100px] focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground rounded-full w-8 h-8"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
                className="rounded-full bg-foreground text-background hover:bg-foreground/90 gap-2 px-6"
              >
                <Sparkles className="w-4 h-4" />
                {isLoading ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Recent Projects</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {dummyProjects.map((project) => (
              <div
                key={project.id}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-foreground/20 transition-colors cursor-pointer group"
                onClick={() => navigate('/canvas')}
              >
                <div className="aspect-video bg-muted overflow-hidden">
                  <img
                    src={project.preview}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-foreground truncate">{project.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{project.lastEdited}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

const Landing = () => {
  if (ENABLE_CLERK_AUTH && CLERK_PUBLISHABLE_KEY) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <LandingWithAuth />
      </Suspense>
    );
  }
  return <LandingNoAuth />;
};

export default Landing;
