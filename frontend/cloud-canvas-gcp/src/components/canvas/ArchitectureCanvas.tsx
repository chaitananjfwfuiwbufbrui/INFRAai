import { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useArchitectureStore, GCPNodeData } from '@/store/architectureStore';
import GCPNode from './GCPNode';

const nodeTypes = {
  gcpNode: GCPNode,
};

interface ArchitectureCanvasProps {
  onNodeClick: (node: Node<GCPNodeData>) => void;
  onNodeDoubleClick: (node: Node<GCPNodeData>) => void;
}

const ArchitectureCanvasInner = ({ onNodeClick, onNodeDoubleClick }: ArchitectureCanvasProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, deleteSelectedNode, selectedNode } = useArchitectureStore();

  // Handle Delete key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedNode) {
        deleteSelectedNode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, deleteSelectedNode]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node<GCPNodeData>) => {
    onNodeClick(node);
  }, [onNodeClick]);

  const handleNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node<GCPNodeData>) => {
    onNodeDoubleClick(node);
  }, [onNodeDoubleClick]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/gcpnode-type');
      const nodeLabel = event.dataTransfer.getData('application/gcpnode-label');
      const nodeCategory = event.dataTransfer.getData('application/gcpnode-category');

      if (!nodeType || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 90,
        y: event.clientY - bounds.top - 30,
      };

      const newNode: Node<GCPNodeData> = {
        id: `${nodeType}-${Date.now()}`,
        type: 'gcpNode',
        position,
        data: {
          label: nodeLabel,
          category: nodeCategory,
          icon: nodeType,
          configured: false,
          config: {},
        },
      };

      addNode(newNode);
    },
    [addNode]
  );

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
        className="canvas-grid"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          className="!bg-[hsl(var(--canvas-bg))]"
        />
        <Controls className="!bg-card !border-border !rounded-lg" />
        <MiniMap 
          nodeStrokeWidth={3}
          className="!bg-card !border-border !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
};

const ArchitectureCanvas = (props: ArchitectureCanvasProps) => (
  <ReactFlowProvider>
    <ArchitectureCanvasInner {...props} />
  </ReactFlowProvider>
);

export default ArchitectureCanvas;
