import { useState, useEffect } from 'react';
import { LucideIcon, Server, Cloud, Globe, Network, HardDrive, Database, MessageSquare, Shield, Container, Layers, Radio, Lock, Key, FileText, Workflow, BarChart3 } from 'lucide-react';

export type NodeCategory = 'compute' | 'networking' | 'storage' | 'database' | 'messaging' | 'security';

export interface CloudNodeAPI {
  id: string;
  label: string;
  category: string;
  cloud: string;
  icon: string;
  description: string;
  connections: {
    canConnectTo: string[];
    canReceiveFrom: string[];
  };
}

export interface CloudNodeDefinition {
  id: string;
  label: string;
  category: NodeCategory;
  cloud: string;
  icon: LucideIcon;
  description: string;
  connections: {
    canConnectTo: string[];
    canReceiveFrom: string[];
  };
}

export interface NodeCategoryDefinition {
  id: NodeCategory;
  label: string;
  color: string;
  nodes: CloudNodeDefinition[];
}

// Map icon string names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Server,
  Cloud,
  Globe,
  Network,
  HardDrive,
  Database,
  MessageSquare,
  Shield,
  Container,
  Layers,
  Radio,
  Lock,
  Key,
  FileText,
  Workflow,
  BarChart3,
};

const categoryLabels: Record<string, string> = {
  compute: 'Compute',
  networking: 'Networking',
  storage: 'Storage',
  database: 'Databases',
  messaging: 'Messaging',
  security: 'Security',
};

const categoryColors: Record<string, string> = {
  compute: 'node-compute',
  networking: 'node-networking',
  storage: 'node-storage',
  database: 'node-database',
  messaging: 'node-messaging',
  security: 'node-security',
};

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    compute: 'bg-node-compute',
    networking: 'bg-node-networking',
    storage: 'bg-node-storage',
    database: 'bg-node-database',
    messaging: 'bg-node-messaging',
    security: 'bg-node-security',
  };
  return colors[category] || 'bg-primary';
};

export const getCategoryBorderColor = (category: string): string => {
  const colors: Record<string, string> = {
    compute: 'border-node-compute',
    networking: 'border-node-networking',
    storage: 'border-node-storage',
    database: 'border-node-database',
    messaging: 'border-node-messaging',
    security: 'border-node-security',
  };
  return colors[category] || 'border-primary';
};

const API_BASE_URL = 'http://localhost:8000';

export const useCloudNodes = (cloudProvider: string | null) => {
  const [nodes, setNodes] = useState<CloudNodeDefinition[]>([]);
  const [categories, setCategories] = useState<NodeCategoryDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNodes = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const url = cloudProvider 
          ? `${API_BASE_URL}/nodes?cloud=${cloudProvider}`
          : `${API_BASE_URL}/nodes`;
        
        const response = await fetch(url, {
          headers: {
            'accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch nodes: ${response.statusText}`);
        }

        const data: CloudNodeAPI[] = await response.json();

        // Transform API response to our format with icon components
        const transformedNodes: CloudNodeDefinition[] = data.map(node => ({
          ...node,
          category: node.category as NodeCategory,
          icon: iconMap[node.icon] || Server, // Fallback to Server icon
        }));

        setNodes(transformedNodes);

        // Group nodes by category
        const categoryMap = new Map<string, CloudNodeDefinition[]>();
        transformedNodes.forEach(node => {
          const existing = categoryMap.get(node.category) || [];
          categoryMap.set(node.category, [...existing, node]);
        });

        // Create category definitions
        const categoryDefs: NodeCategoryDefinition[] = Array.from(categoryMap.entries()).map(([catId, catNodes]) => ({
          id: catId as NodeCategory,
          label: categoryLabels[catId] || catId,
          color: categoryColors[catId] || 'node-compute',
          nodes: catNodes,
        }));

        setCategories(categoryDefs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch nodes');
        console.error('Error fetching cloud nodes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNodes();
  }, [cloudProvider]);

  const getNodeById = (id: string): CloudNodeDefinition | undefined => {
    return nodes.find(node => node.id === id);
  };

  const getAllNodes = (): CloudNodeDefinition[] => {
    return nodes;
  };

  return {
    nodes,
    categories,
    loading,
    error,
    getNodeById,
    getAllNodes,
  };
};
