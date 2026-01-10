import { useState, useCallback, useEffect } from 'react';
import { Node } from '@xyflow/react';
import TopToolbar from '@/components/toolbar/TopToolbar';
import LeftPanel from '@/components/panels/LeftPanel';
import RightPanel from '@/components/panels/RightPanel';
import ArchitectureCanvas from '@/components/canvas/ArchitectureCanvas';
import AIChatPopup from '@/components/chat/AIChatPopup';
import { GCPNodeData, useArchitectureStore } from '@/store/architectureStore';

const Index = () => {
  const [selectedNode, setSelectedNode] = useState<Node<GCPNodeData> | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const { selectNode, nodes } = useArchitectureStore();

  // Handle Ctrl+L for AI chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        setShowAIChat(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDragStart = useCallback((
    event: React.DragEvent,
    nodeType: string,
    nodeLabel: string,
    category: string
  ) => {
    event.dataTransfer.setData('application/gcpnode-type', nodeType);
    event.dataTransfer.setData('application/gcpnode-label', nodeLabel);
    event.dataTransfer.setData('application/gcpnode-category', category);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  // Single click to select node (for delete key)
  const handleNodeClick = useCallback((node: Node<GCPNodeData>) => {
    setSelectedNode(node);
    selectNode(node);
  }, [selectNode]);

  // Double click to open config panel
  const handleNodeDoubleClick = useCallback((node: Node<GCPNodeData>) => {
    setSelectedNode(node);
    selectNode(node);
    setShowConfig(true);
  }, [selectNode]);

  const handleClosePanel = useCallback(() => {
    setShowConfig(false);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      <TopToolbar />
      
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel 
          onDragStart={handleDragStart} 
          isCollapsed={leftPanelCollapsed}
          onToggleCollapse={() => setLeftPanelCollapsed(prev => !prev)}
        />
        
        <main className="flex-1 relative">
          {/* Expand button when panel is collapsed */}
          {leftPanelCollapsed && (
            <button
              onClick={() => setLeftPanelCollapsed(false)}
              className="absolute top-4 left-4 z-10 p-2 bg-card border border-border rounded-lg shadow-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="Expand panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <ArchitectureCanvas 
            onNodeClick={handleNodeClick} 
            onNodeDoubleClick={handleNodeDoubleClick}
          />
          
          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center max-w-md px-6">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Start Designing
                </h2>
                <p className="text-muted-foreground mb-6">
                  Drag GCP components from the left panel onto the canvas to start building your cloud architecture
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-secondary rounded text-xs font-mono">Drag</kbd>
                    <span>to add nodes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-secondary rounded text-xs font-mono">Double-click</kbd>
                    <span>to configure</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Ctrl+L</kbd> to chat with AI
                </p>
              </div>
            </div>
          )}
        </main>
        
        {showConfig && (
          <RightPanel selectedNode={selectedNode} onClose={handleClosePanel} />
        )}
      </div>

      {/* AI Chat Popup */}
      <AIChatPopup isOpen={showAIChat} onClose={() => setShowAIChat(false)} />
    </div>
  );
};

export default Index;
