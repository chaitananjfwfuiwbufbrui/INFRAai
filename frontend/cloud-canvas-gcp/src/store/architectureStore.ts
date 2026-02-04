import { create } from 'zustand';
import { Node, Edge, addEdge, Connection, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from '@xyflow/react';

export interface GCPNodeData {
  label: string;
  category: string;
  icon: string;
  configured: boolean;
  config: Record<string, string>;
  [key: string]: unknown;
}

interface ArchitectureState {
  nodes: Node<GCPNodeData>[];
  edges: Edge[];
  selectedNode: Node<GCPNodeData> | null;

  // Actions
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node<GCPNodeData>) => void;
  selectNode: (node: Node<GCPNodeData> | null) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, string>) => void;
  deleteSelectedNode: () => void;
  clearCanvas: () => void;
  loadArchitecture: (nodes: Node<GCPNodeData>[], edges: Edge[]) => void;

  monitoring: any[];
  setMonitoring: (policies: any[]) => void;
}

export const useArchitectureStore = create<ArchitectureState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as Node<GCPNodeData>[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(
        {
          ...connection,
          type: 'smoothstep',
          animated: true,
        },
        get().edges
      ),
    });
  },

  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
    });
  },

  selectNode: (node) => {
    set({ selectedNode: node });
  },

  updateNodeConfig: (nodeId, config) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, config, configured: true } }
          : node
      ),
    });
  },

  deleteSelectedNode: () => {
    const { selectedNode, nodes, edges } = get();
    if (!selectedNode) return;

    set({
      nodes: nodes.filter((n) => n.id !== selectedNode.id),
      edges: edges.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id),
      selectedNode: null,
    });
  },

  clearCanvas: () => {
    set({ nodes: [], edges: [], selectedNode: null });
  },

  loadArchitecture: (nodes, edges) => {
    set({ nodes, edges, selectedNode: null });
  },

  monitoring: [],
  setMonitoring: (policies) => set({ monitoring: policies }),
}));
