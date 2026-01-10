import { useState, useEffect } from 'react';
import { useCloudNodes, getCategoryColor } from '@/hooks/useCloudNodes';
import { ChevronDown, ChevronRight, Search, PanelLeftClose, Cloud, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LeftPanelProps {
  onDragStart: (event: React.DragEvent, nodeType: string, nodeLabel: string, category: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const cloudProviders = [
  { value: 'gcp', label: 'Google Cloud Platform', icon: '🔵' },
  { value: 'aws', label: 'Amazon Web Services', icon: '🟠' },
  { value: 'azure', label: 'Microsoft Azure', icon: '🔷' },
];

const LeftPanel = ({ onDragStart, isCollapsed, onToggleCollapse }: LeftPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  
  const { categories, loading, error } = useCloudNodes(selectedProvider);
  
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Update expanded categories when categories change
  useEffect(() => {
    setExpandedCategories(categories.map(c => c.id));
  }, [categories]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredCategories = categories.map(category => ({
    ...category,
    nodes: category.nodes.filter(node =>
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.nodes.length > 0);

  if (isCollapsed) {
    return null;
  }

  return (
    <div className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg text-foreground mb-1">Components</h2>
          <p className="text-xs text-muted-foreground">Drag nodes to canvas</p>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          title="Collapse panel"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Cloud Provider Dropdown */}
      <div className="p-3 border-b border-sidebar-border">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          Cloud Provider
        </label>
        <Select value={selectedProvider || ''} onValueChange={(value) => setSelectedProvider(value || null)}>
          <SelectTrigger className="w-full bg-input border-border">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-primary" />
              <SelectValue placeholder="Select provider" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border z-50">
            {cloudProviders.map((provider) => (
              <SelectItem key={provider.value} value={provider.value}>
                <div className="flex items-center gap-2">
                  <span>{provider.icon}</span>
                  <span>{provider.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading nodes...</span>
          </div>
        )}

        {error && (
          <div className="p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">Make sure the API is running</p>
          </div>
        )}

        {!loading && !error && filteredCategories.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {selectedProvider ? 'No nodes found' : 'Select a cloud provider to load nodes'}
            </p>
          </div>
        )}

        {!loading && !error && filteredCategories.map((category) => (
          <div key={category.id} className="border-b border-sidebar-border">
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-sidebar-accent transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', getCategoryColor(category.id))} />
                <span className="font-medium text-sm text-foreground">{category.label}</span>
                <span className="text-xs text-muted-foreground">({category.nodes.length})</span>
              </div>
              {expandedCategories.includes(category.id) ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {expandedCategories.includes(category.id) && (
              <div className="px-3 pb-3 space-y-1">
                {category.nodes.map((node) => {
                  const IconComponent = node.icon;
                  return (
                    <div
                      key={node.id}
                      className="draggable-node"
                      draggable
                      onDragStart={(e) => onDragStart(e, node.id, node.label, node.category)}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        getCategoryColor(category.id)
                      )}>
                        <IconComponent className="w-4 h-4 text-background" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {node.label}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {node.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeftPanel;
