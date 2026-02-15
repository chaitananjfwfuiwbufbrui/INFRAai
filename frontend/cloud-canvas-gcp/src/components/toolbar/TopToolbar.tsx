import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Save,
  CheckCircle,
  Undo2,
  Redo2,
  Trash2,
  FileJson,
  Sun,
  Moon,
  ArrowRight,
  Upload,
  LayoutGrid,
  Sparkles,
  Loader2,
  Settings
} from 'lucide-react';
import { useArchitectureStore } from '@/store/architectureStore';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiEndpoints, apiRequest } from '@/lib/api';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from '@clerk/clerk-react';

const TopToolbar = () => {
  const navigate = useNavigate();
  const { nodes, edges, clearCanvas, loadArchitecture } = useArchitectureStore();
  const { theme, toggleTheme } = useTheme();
  const [isValidated, setIsValidated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertNodesToInfraSpec = () => {
    const resources = nodes.map((node) => {
      const baseResource: Record<string, unknown> = {
        type: node.data.icon || node.data.category,
        name: node.data.label.toLowerCase().replace(/\s+/g, '-'),
      };
      if (node.data.config) {
        Object.entries(node.data.config).forEach(([key, value]) => {
          baseResource[key] = value;
        });
      }
      return baseResource;
    });
    return {
      provider: 'gcp',
      project_name: 'demo-app',
      region: 'us-central1',
      resources,
    };
  };

  const handleGenerate = async () => {
    if (nodes.length === 0) {
      toast.info('Canvas is empty', { description: 'Add some nodes to generate Terraform' });
      return;
    }
    setIsGenerating(true);
    try {
      const infraSpec = convertNodesToInfraSpec();
      const response = await apiRequest<{ run_id: string; files: string[] }>(
        apiEndpoints.generateTerraform,
        {
          method: 'POST',
          headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ infra_spec: infraSpec }),
        }
      );
      toast.success('Terraform generated successfully!');
      navigate('/infrastructure', { state: { runId: response.run_id } });
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('Failed to generate Terraform', { description: 'Please check your connection and try again' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const monitoring = useArchitectureStore.getState().monitoring;
    const architecture = { nodes, edges, monitoring };
    localStorage.setItem('gcp-architecture', JSON.stringify(architecture));
    toast.success('Architecture saved successfully');
  };

  const handleExport = () => {
    const architecture = { nodes, edges };
    const blob = new Blob([JSON.stringify(architecture, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'architecture.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Architecture exported as JSON');
  };

  const handleValidate = () => {
    const unconfiguredNodes = nodes.filter(n => !n.data.configured);
    if (unconfiguredNodes.length > 0) {
      toast.warning(`${unconfiguredNodes.length} node(s) not configured`, { description: 'Configure all nodes for a complete architecture' });
      setIsValidated(false);
    } else if (nodes.length === 0) {
      toast.info('Canvas is empty', { description: 'Add some nodes to start designing' });
      setIsValidated(false);
    } else {
      toast.success('Architecture validated', { description: 'All nodes are properly configured' });
      setIsValidated(true);
    }
  };

  const handleProceed = () => { navigate('/deploy'); };

  const handleClear = () => {
    if (nodes.length === 0) { toast.info('Canvas is already empty'); return; }
    if (confirm('Are you sure you want to clear the canvas?')) { clearCanvas(); toast.success('Canvas cleared'); }
  };

  const handleImport = () => { fileInputRef.current?.click(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        if (data.nodes && Array.isArray(data.nodes) && data.edges && Array.isArray(data.edges)) {
          loadArchitecture(data.nodes, data.edges);
          if (data.monitoring) {
            useArchitectureStore.getState().setMonitoring(data.monitoring);
          }
          toast.success('Architecture imported successfully');
          setIsValidated(false);
        } else {
          toast.error('Invalid architecture file', { description: 'File must contain nodes and edges arrays' });
        }
      } catch (error) {
        toast.error('Failed to parse JSON file', { description: 'Please ensure the file is valid JSON' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="h-14 bg-background border-b border-border/50 flex items-center justify-between px-4 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
          <LayoutGrid className="w-3.5 h-3.5 text-background" />
        </div>
        <span className="font-serif text-lg font-semibold text-foreground">Kairos</span>
        <span className="font-serif text-lg font-semibold text-primary">.AI</span>
      </Link>

      <div className="flex items-center gap-1.5">
        <button className="toolbar-button" title="Undo">
          <Undo2 className="w-4 h-4" />
        </button>
        <button className="toolbar-button" title="Redo">
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-border/50 mx-1.5" />

        <button className="toolbar-button" onClick={handleSave}>
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Save</span>
        </button>

        <button className="toolbar-button" onClick={handleImport}>
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Import</span>
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />

        <button className="toolbar-button" onClick={handleExport}>
          <FileJson className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button className="toolbar-button primary" onClick={handleValidate}>
          <CheckCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Validate</span>
        </button>

        {isValidated && (
          <Button onClick={handleProceed} className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
            Proceed <ArrowRight className="w-4 h-4" />
          </Button>
        )}

        {nodes.length > 0 && (
          <Button onClick={handleGenerate} disabled={isGenerating} className="rounded-full bg-foreground hover:bg-foreground/90 text-background gap-2">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span className="hidden sm:inline">Generating...</span></>
            ) : (
              <><Sparkles className="w-4 h-4" /><span className="hidden sm:inline">Generate</span></>
            )}
          </Button>
        )}

        <div className="w-px h-6 bg-border/50 mx-1.5" />

        <button className="toolbar-button text-destructive hover:bg-destructive/10" onClick={handleClear} title="Clear Canvas">
          <Trash2 className="w-4 h-4" />
        </button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          className="rounded-full text-muted-foreground hover:text-foreground"
        >
          <Settings className="w-4.5 h-4.5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full text-muted-foreground hover:text-foreground">
          {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
        </Button>

        <SignedOut>
          <SignInButton mode="modal">
            <Button variant="outline" size="sm" className="rounded-full px-5">Sign In</Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
        </SignedIn>
      </div>
    </header>
  );
};

export default TopToolbar;
