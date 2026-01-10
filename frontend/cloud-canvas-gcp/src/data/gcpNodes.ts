import { 
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
  LucideIcon
} from 'lucide-react';

export type NodeCategory = 'compute' | 'networking' | 'storage' | 'database' | 'messaging' | 'security';

export interface GCPNodeDefinition {
  id: string;
  label: string;
  category: NodeCategory;
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
  nodes: GCPNodeDefinition[];
}

export const gcpNodeCategories: NodeCategoryDefinition[] = [
  {
    id: 'compute',
    label: 'Compute',
    color: 'node-compute',
    nodes: [
      {
        id: 'compute-engine',
        label: 'Compute Engine',
        category: 'compute',
        icon: Server,
        description: 'Virtual machines on GCP',
        connections: {
          canConnectTo: ['cloud-storage', 'cloud-sql', 'firestore', 'pub-sub', 'vpc'],
          canReceiveFrom: ['load-balancer', 'vpc', 'cloud-nat'],
        },
      },
      {
        id: 'cloud-run',
        label: 'Cloud Run',
        category: 'compute',
        icon: Cloud,
        description: 'Serverless container platform',
        connections: {
          canConnectTo: ['cloud-storage', 'cloud-sql', 'firestore', 'pub-sub', 'secret-manager'],
          canReceiveFrom: ['load-balancer', 'pub-sub', 'cloud-tasks'],
        },
      },
      {
        id: 'app-engine',
        label: 'App Engine',
        category: 'compute',
        icon: Layers,
        description: 'Fully managed serverless platform',
        connections: {
          canConnectTo: ['cloud-storage', 'cloud-sql', 'firestore', 'pub-sub'],
          canReceiveFrom: ['load-balancer'],
        },
      },
      {
        id: 'gke-cluster',
        label: 'GKE Cluster',
        category: 'compute',
        icon: Container,
        description: 'Managed Kubernetes cluster',
        connections: {
          canConnectTo: ['cloud-storage', 'cloud-sql', 'firestore', 'pub-sub', 'vpc'],
          canReceiveFrom: ['load-balancer', 'vpc'],
        },
      },
    ],
  },
  {
    id: 'networking',
    label: 'Networking',
    color: 'node-networking',
    nodes: [
      {
        id: 'vpc',
        label: 'VPC',
        category: 'networking',
        icon: Network,
        description: 'Virtual Private Cloud',
        connections: {
          canConnectTo: ['subnet', 'compute-engine', 'gke-cluster'],
          canReceiveFrom: ['cloud-nat', 'load-balancer'],
        },
      },
      {
        id: 'subnet',
        label: 'Subnet',
        category: 'networking',
        icon: Workflow,
        description: 'VPC subnet',
        connections: {
          canConnectTo: ['compute-engine', 'gke-cluster'],
          canReceiveFrom: ['vpc'],
        },
      },
      {
        id: 'load-balancer',
        label: 'Load Balancer',
        category: 'networking',
        icon: Globe,
        description: 'Cloud Load Balancer',
        connections: {
          canConnectTo: ['compute-engine', 'cloud-run', 'app-engine', 'gke-cluster'],
          canReceiveFrom: ['cloud-dns'],
        },
      },
      {
        id: 'cloud-nat',
        label: 'Cloud NAT',
        category: 'networking',
        icon: Radio,
        description: 'Network Address Translation',
        connections: {
          canConnectTo: ['vpc'],
          canReceiveFrom: ['compute-engine', 'gke-cluster'],
        },
      },
      {
        id: 'cloud-dns',
        label: 'Cloud DNS',
        category: 'networking',
        icon: Globe,
        description: 'DNS service',
        connections: {
          canConnectTo: ['load-balancer'],
          canReceiveFrom: [],
        },
      },
    ],
  },
  {
    id: 'storage',
    label: 'Storage',
    color: 'node-storage',
    nodes: [
      {
        id: 'cloud-storage',
        label: 'Cloud Storage',
        category: 'storage',
        icon: HardDrive,
        description: 'Object storage bucket',
        connections: {
          canConnectTo: ['bigquery'],
          canReceiveFrom: ['compute-engine', 'cloud-run', 'app-engine', 'gke-cluster'],
        },
      },
      {
        id: 'persistent-disk',
        label: 'Persistent Disk',
        category: 'storage',
        icon: HardDrive,
        description: 'Block storage for VMs',
        connections: {
          canConnectTo: [],
          canReceiveFrom: ['compute-engine', 'gke-cluster'],
        },
      },
    ],
  },
  {
    id: 'database',
    label: 'Databases',
    color: 'node-database',
    nodes: [
      {
        id: 'cloud-sql',
        label: 'Cloud SQL',
        category: 'database',
        icon: Database,
        description: 'Managed MySQL/PostgreSQL',
        connections: {
          canConnectTo: [],
          canReceiveFrom: ['compute-engine', 'cloud-run', 'app-engine', 'gke-cluster'],
        },
      },
      {
        id: 'firestore',
        label: 'Firestore',
        category: 'database',
        icon: Database,
        description: 'NoSQL document database',
        connections: {
          canConnectTo: [],
          canReceiveFrom: ['compute-engine', 'cloud-run', 'app-engine', 'gke-cluster'],
        },
      },
      {
        id: 'bigquery',
        label: 'BigQuery',
        category: 'database',
        icon: BarChart3,
        description: 'Data warehouse & analytics',
        connections: {
          canConnectTo: [],
          canReceiveFrom: ['cloud-storage'],
        },
      },
    ],
  },
  {
    id: 'messaging',
    label: 'Messaging',
    color: 'node-messaging',
    nodes: [
      {
        id: 'pub-sub',
        label: 'Pub/Sub',
        category: 'messaging',
        icon: MessageSquare,
        description: 'Messaging and streaming',
        connections: {
          canConnectTo: ['cloud-run', 'compute-engine', 'gke-cluster'],
          canReceiveFrom: ['compute-engine', 'cloud-run', 'app-engine', 'gke-cluster'],
        },
      },
      {
        id: 'cloud-tasks',
        label: 'Cloud Tasks',
        category: 'messaging',
        icon: FileText,
        description: 'Task queue service',
        connections: {
          canConnectTo: ['cloud-run', 'app-engine'],
          canReceiveFrom: ['compute-engine', 'cloud-run', 'app-engine'],
        },
      },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    color: 'node-security',
    nodes: [
      {
        id: 'iam-role',
        label: 'IAM Role',
        category: 'security',
        icon: Shield,
        description: 'Identity and Access Management',
        connections: {
          canConnectTo: ['service-account'],
          canReceiveFrom: [],
        },
      },
      {
        id: 'service-account',
        label: 'Service Account',
        category: 'security',
        icon: Key,
        description: 'Service identity',
        connections: {
          canConnectTo: ['compute-engine', 'cloud-run', 'gke-cluster'],
          canReceiveFrom: ['iam-role'],
        },
      },
      {
        id: 'secret-manager',
        label: 'Secret Manager',
        category: 'security',
        icon: Lock,
        description: 'Secrets management',
        connections: {
          canConnectTo: [],
          canReceiveFrom: ['compute-engine', 'cloud-run', 'app-engine', 'gke-cluster'],
        },
      },
    ],
  },
];

export const getAllNodes = (): GCPNodeDefinition[] => {
  return gcpNodeCategories.flatMap(cat => cat.nodes);
};

export const getNodeById = (id: string): GCPNodeDefinition | undefined => {
  return getAllNodes().find(node => node.id === id);
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
