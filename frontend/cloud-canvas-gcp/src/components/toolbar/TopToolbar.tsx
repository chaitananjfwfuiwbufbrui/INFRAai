import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, 
  Download, 
  CheckCircle, 
  Undo2, 
  Redo2, 
  Trash2,
  FileJson,
  Cloud,
  Sun,
  Moon,
  ArrowRight,
  Upload
} from 'lucide-react';
import { useArchitectureStore } from '@/store/architectureStore';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const TopToolbar = () => {
  const navigate = useNavigate();
  const { nodes, edges, clearCanvas, loadArchitecture } = useArchitectureStore();
  const { theme, toggleTheme } = useTheme();
  const [isValidated, setIsValidated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const architecture = { nodes, edges };
    localStorage.setItem('gcp-architecture', JSON.stringify(architecture));
    toast.success('Architecture saved successfully');
  };

  const handleExport = () => {
    const architecture = { nodes, edges };
    const blob = new Blob([JSON.stringify(architecture, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gcp-architecture.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Architecture exported as JSON');
  };

  const handleValidate = () => {
    const unconfiguredNodes = nodes.filter(n => !n.data.configured);
    if (unconfiguredNodes.length > 0) {
      toast.warning(`${unconfiguredNodes.length} node(s) not configured`, {
        description: 'Configure all nodes for a complete architecture'
      });
      setIsValidated(false);
    } else if (nodes.length === 0) {
      toast.info('Canvas is empty', {
        description: 'Add some nodes to start designing'
      });
      setIsValidated(false);
    } else {
      toast.success('Architecture validated', {
        description: 'All nodes are properly configured'
      });
      setIsValidated(true);
    }
  };

  const handleProceed = () => {
    navigate('/deploy');
  };

  const handleClear = () => {
    if (nodes.length === 0) {
      toast.info('Canvas is already empty');
      return;
    }
    if (confirm('Are you sure you want to clear the canvas?')) {
      clearCanvas();
      toast.success('Canvas cleared');
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

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
          toast.success('Architecture imported successfully');
          setIsValidated(false);
        } else {
          toast.error('Invalid architecture file', {
            description: 'File must contain nodes and edges arrays'
          });
        }
      } catch (error) {
        toast.error('Failed to parse JSON file', {
          description: 'Please ensure the file is valid JSON'
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input so same file can be imported again
    e.target.value = '';
  };

  return (
    <header className="h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Cloud className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-foreground leading-none">Cloud Architect</h1>
            <span className="text-xs text-muted-foreground">GCP Edition</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="toolbar-button" title="Undo">
          <Undo2 className="w-4 h-4" />
        </button>
        <button className="toolbar-button" title="Redo">
          <Redo2 className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <button className="toolbar-button" onClick={handleSave}>
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Save</span>
        </button>
        
        <button className="toolbar-button" onClick={handleImport}>
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Import</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        
        <button className="toolbar-button" onClick={handleExport}>
          <FileJson className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
        
        <button className="toolbar-button primary" onClick={handleValidate}>
          <CheckCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Validate</span>
        </button>

        {isValidated && (
          <Button
            onClick={handleProceed}
            className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
          >
            Proceed
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <button 
          className="toolbar-button text-destructive hover:bg-destructive/10" 
          onClick={handleClear}
          title="Clear Canvas"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </div>
    </header>
  );
};

export default TopToolbar;
