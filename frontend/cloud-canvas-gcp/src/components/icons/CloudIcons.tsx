import {
  Server,
  Cloud,
  Container,
  Globe,
  HardDrive,
  Database,
  MessageSquare,
  Lock,
  Shuffle,
  Shield,
  Layers,
  Zap,
  BarChart,
  Package,
  Activity,
  Network,
} from 'lucide-react';

// Icon mapping object
export const iconMap = {
  Server,
  CloudIcon: Cloud,
  Container,
  Globe,
  HardDrive,
  Database,
  MessageSquare,
  Lock,
  Shuffle,
  Shield,
  Layers,
  Zap,
  BarChart,
  Package,
  Activity,
  Network,
};

// Type for valid icon names
export type IconName = keyof typeof iconMap;

// Helper function to get icon component
export const getIconComponent = (iconName: string) => {
  return iconMap[iconName as IconName] || Server; // Default to Server if icon not found
};

// Cloud node interface
export interface CloudNode {
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

// Cloud nodes data
export const cloudNodes: CloudNode[] = [
  {
    id: "compute-engine",
    label: "Compute Engine",
    category: "compute",
    cloud: "gcp",
    icon: "Server",
    description: "Virtual machines on GCP",
    connections: {
      canConnectTo: ["cloud-storage", "cloud-sql", "firestore", "pub-sub", "vpc"],
      canReceiveFrom: ["load-balancer", "vpc", "cloud-nat"]
    }
  },
  {
    id: "cloud-run",
    label: "Cloud Run",
    category: "compute",
    cloud: "gcp",
    icon: "CloudIcon",
    description: "Serverless container platform",
    connections: {
      canConnectTo: ["cloud-storage", "cloud-sql", "firestore", "pub-sub", "secret-manager"],
      canReceiveFrom: ["load-balancer", "pub-sub", "cloud-tasks"]
    }
  },
  {
    id: "gke-cluster",
    label: "GKE Cluster",
    category: "compute",
    cloud: "gcp",
    icon: "Container",
    description: "Managed Kubernetes cluster",
    connections: {
      canConnectTo: ["cloud-storage", "cloud-sql", "firestore", "pub-sub", "vpc"],
      canReceiveFrom: ["load-balancer", "vpc"]
    }
  },
  {
    id: "load-balancer",
    label: "Load Balancer",
    category: "networking",
    cloud: "gcp",
    icon: "Globe",
    description: "Cloud Load Balancer",
    connections: {
      canConnectTo: ["compute-engine", "cloud-run", "gke-cluster"],
      canReceiveFrom: ["cloud-dns"]
    }
  },
  {
    id: "cloud-storage",
    label: "Cloud Storage",
    category: "storage",
    cloud: "gcp",
    icon: "HardDrive",
    description: "Object storage bucket",
    connections: {
      canConnectTo: ["bigquery"],
      canReceiveFrom: ["compute-engine", "cloud-run", "gke-cluster"]
    }
  },
  {
    id: "cloud-sql",
    label: "Cloud SQL",
    category: "database",
    cloud: "gcp",
    icon: "Database",
    description: "Managed MySQL/PostgreSQL",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["compute-engine", "cloud-run", "gke-cluster"]
    }
  },
  {
    id: "firestore",
    label: "Firestore",
    category: "database",
    cloud: "gcp",
    icon: "Database",
    description: "NoSQL document database",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["compute-engine", "cloud-run", "gke-cluster"]
    }
  },
  {
    id: "pub-sub",
    label: "Pub/Sub",
    category: "messaging",
    cloud: "gcp",
    icon: "MessageSquare",
    description: "Messaging and streaming",
    connections: {
      canConnectTo: ["cloud-run", "compute-engine", "gke-cluster"],
      canReceiveFrom: ["compute-engine", "cloud-run", "gke-cluster"]
    }
  },
  {
    id: "secret-manager",
    label: "Secret Manager",
    category: "security",
    cloud: "gcp",
    icon: "Lock",
    description: "Secrets management",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["compute-engine", "cloud-run", "gke-cluster"]
    }
  },
  {
    id: "cloud-nat",
    label: "Cloud NAT",
    category: "networking",
    cloud: "gcp",
    icon: "Shuffle",
    description: "Outbound internet access for private resources",
    connections: {
      canConnectTo: ["vpc"],
      canReceiveFrom: ["compute-engine", "gke-cluster"]
    }
  },
  {
    id: "cloud-dns",
    label: "Cloud DNS",
    category: "networking",
    cloud: "gcp",
    icon: "Globe",
    description: "Managed DNS service",
    connections: {
      canConnectTo: ["load-balancer"],
      canReceiveFrom: []
    }
  },
  {
    id: "firewall-rules",
    label: "Firewall Rules",
    category: "networking",
    cloud: "gcp",
    icon: "Shield",
    description: "Network firewall rules",
    connections: {
      canConnectTo: ["compute-engine", "gke-cluster"],
      canReceiveFrom: ["vpc"]
    }
  },
  {
    id: "instance-group",
    label: "Instance Group",
    category: "compute",
    cloud: "gcp",
    icon: "Layers",
    description: "Managed group of VM instances",
    connections: {
      canConnectTo: ["compute-engine"],
      canReceiveFrom: ["load-balancer"]
    }
  },
  {
    id: "cloud-functions",
    label: "Cloud Functions",
    category: "compute",
    cloud: "gcp",
    icon: "Zap",
    description: "Event-driven serverless functions",
    connections: {
      canConnectTo: ["cloud-storage", "firestore", "pub-sub"],
      canReceiveFrom: ["pub-sub", "cloud-storage"]
    }
  },
  {
    id: "bigquery",
    label: "BigQuery",
    category: "analytics",
    cloud: "gcp",
    icon: "BarChart",
    description: "Serverless data warehouse",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["cloud-storage", "pub-sub"]
    }
  },
  {
    id: "artifact-registry",
    label: "Artifact Registry",
    category: "devops",
    cloud: "gcp",
    icon: "Package",
    description: "Container and artifact storage",
    connections: {
      canConnectTo: ["gke-cluster", "cloud-run"],
      canReceiveFrom: []
    }
  },
  {
    id: "cloud-monitoring",
    label: "Cloud Monitoring",
    category: "devops",
    cloud: "gcp",
    icon: "Activity",
    description: "Metrics, logs, and alerts",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["compute-engine", "gke-cluster", "cloud-run", "cloud-sql"]
    }
  },
  {
    id: "vpc",
    label: "VPC",
    category: "networking",
    cloud: "gcp",
    icon: "Network",
    description: "Virtual Private Cloud",
    connections: {
      canConnectTo: ["compute-engine", "gke-cluster"],
      canReceiveFrom: ["cloud-nat", "firewall-rules"]
    }
  },
  {
    id: "ec2",
    label: "EC2",
    category: "compute",
    cloud: "aws",
    icon: "Server",
    description: "Virtual machines on AWS",
    connections: {
      canConnectTo: ["s3", "rds", "dynamodb", "sqs", "vpc"],
      canReceiveFrom: ["alb", "vpc", "nat-gateway"]
    }
  },
  {
    id: "ecs",
    label: "ECS",
    category: "compute",
    cloud: "aws",
    icon: "Container",
    description: "Managed container service",
    connections: {
      canConnectTo: ["s3", "rds", "dynamodb", "sqs", "secrets-manager"],
      canReceiveFrom: ["alb"]
    }
  },
  {
    id: "eks",
    label: "EKS",
    category: "compute",
    cloud: "aws",
    icon: "Container",
    description: "Managed Kubernetes service",
    connections: {
      canConnectTo: ["s3", "rds", "dynamodb", "sqs", "vpc"],
      canReceiveFrom: ["alb", "vpc"]
    }
  },
  {
    id: "lambda",
    label: "Lambda",
    category: "compute",
    cloud: "aws",
    icon: "Zap",
    description: "Serverless compute",
    connections: {
      canConnectTo: ["s3", "dynamodb", "sqs"],
      canReceiveFrom: ["sqs", "s3", "eventbridge"]
    }
  },
  {
    id: "vpc",
    label: "VPC",
    category: "networking",
    cloud: "aws",
    icon: "Network",
    description: "Virtual Private Cloud",
    connections: {
      canConnectTo: ["subnet", "ec2", "eks"],
      canReceiveFrom: ["nat-gateway", "alb"]
    }
  },
  {
    id: "alb",
    label: "Application Load Balancer",
    category: "networking",
    cloud: "aws",
    icon: "Globe",
    description: "Layer 7 load balancer",
    connections: {
      canConnectTo: ["ec2", "ecs", "eks"],
      canReceiveFrom: ["route53"]
    }
  },
  {
    id: "route53",
    label: "Route 53",
    category: "networking",
    cloud: "aws",
    icon: "Globe",
    description: "DNS and traffic routing",
    connections: {
      canConnectTo: ["alb"],
      canReceiveFrom: []
    }
  },
  {
    id: "security-groups",
    label: "Security Groups",
    category: "networking",
    cloud: "aws",
    icon: "Shield",
    description: "Instance-level firewall",
    connections: {
      canConnectTo: ["ec2", "eks"],
      canReceiveFrom: ["vpc"]
    }
  },
  {
    id: "s3",
    label: "S3",
    category: "storage",
    cloud: "aws",
    icon: "HardDrive",
    description: "Object storage",
    connections: {
      canConnectTo: ["athena"],
      canReceiveFrom: ["ec2", "ecs", "eks", "lambda"]
    }
  },
  {
    id: "rds",
    label: "RDS",
    category: "database",
    cloud: "aws",
    icon: "Database",
    description: "Managed relational databases",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["ec2", "ecs", "eks"]
    }
  },
  {
    id: "dynamodb",
    label: "DynamoDB",
    category: "database",
    cloud: "aws",
    icon: "Database",
    description: "NoSQL key-value database",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["ec2", "ecs", "eks", "lambda"]
    }
  },
  {
    id: "sqs",
    label: "SQS",
    category: "messaging",
    cloud: "aws",
    icon: "MessageSquare",
    description: "Message queue service",
    connections: {
      canConnectTo: ["lambda", "ec2"],
      canReceiveFrom: ["lambda", "ec2"]
    }
  },
  {
    id: "eventbridge",
    label: "EventBridge",
    category: "messaging",
    cloud: "aws",
    icon: "Activity",
    description: "Event routing service",
    connections: {
      canConnectTo: ["lambda"],
      canReceiveFrom: []
    }
  },
  {
    id: "secrets-manager",
    label: "Secrets Manager",
    category: "security",
    cloud: "aws",
    icon: "Lock",
    description: "Secrets storage and rotation",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["ec2", "ecs", "eks", "lambda"]
    }
  },
  {
    id: "athena",
    label: "Athena",
    category: "analytics",
    cloud: "aws",
    icon: "BarChart",
    description: "Query data in S3 using SQL",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["s3"]
    }
  },
  {
    id: "ecr",
    label: "ECR",
    category: "devops",
    cloud: "aws",
    icon: "Package",
    description: "Container image registry",
    connections: {
      canConnectTo: ["ecs", "eks"],
      canReceiveFrom: []
    }
  },
  {
    id: "cloudwatch",
    label: "CloudWatch",
    category: "devops",
    cloud: "aws",
    icon: "Activity",
    description: "Logs, metrics, and alerts",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["ec2", "ecs", "eks", "rds", "lambda"]
    }
  },
  {
    id: "virtual-machines",
    label: "Virtual Machines",
    category: "compute",
    cloud: "azure",
    icon: "Server",
    description: "Virtual machines on Azure",
    connections: {
      canConnectTo: ["blob-storage", "azure-sql", "cosmos-db", "service-bus", "vnet"],
      canReceiveFrom: ["application-gateway", "vnet", "nat-gateway"]
    }
  },
  {
    id: "app-service",
    label: "App Service",
    category: "compute",
    cloud: "azure",
    icon: "CloudIcon",
    description: "Managed web app hosting",
    connections: {
      canConnectTo: ["blob-storage", "azure-sql", "cosmos-db", "service-bus", "key-vault"],
      canReceiveFrom: ["application-gateway"]
    }
  },
  {
    id: "aks",
    label: "AKS",
    category: "compute",
    cloud: "azure",
    icon: "Container",
    description: "Azure Kubernetes Service",
    connections: {
      canConnectTo: ["blob-storage", "azure-sql", "cosmos-db", "service-bus", "vnet"],
      canReceiveFrom: ["application-gateway", "vnet"]
    }
  },
  {
    id: "azure-functions",
    label: "Azure Functions",
    category: "compute",
    cloud: "azure",
    icon: "Zap",
    description: "Serverless event-driven compute",
    connections: {
      canConnectTo: ["blob-storage", "cosmos-db", "service-bus"],
      canReceiveFrom: ["service-bus", "blob-storage", "event-grid"]
    }
  },
  {
    id: "vnet",
    label: "Virtual Network",
    category: "networking",
    cloud: "azure",
    icon: "Network",
    description: "Azure Virtual Network",
    connections: {
      canConnectTo: ["subnet", "virtual-machines", "aks"],
      canReceiveFrom: ["nat-gateway", "application-gateway"]
    }
  },
  {
    id: "subnet",
    label: "Subnet",
    category: "networking",
    cloud: "azure",
    icon: "Network",
    description: "Subnet inside a Virtual Network",
    connections: {
      canConnectTo: ["virtual-machines", "aks", "app-service"],
      canReceiveFrom: ["vnet"]
    }
  },
  {
    id: "application-gateway",
    label: "Application Gateway",
    category: "networking",
    cloud: "azure",
    icon: "Globe",
    description: "Layer 7 load balancer",
    connections: {
      canConnectTo: ["virtual-machines", "app-service", "aks"],
      canReceiveFrom: ["azure-dns"]
    }
  },
  {
    id: "nat-gateway",
    label: "NAT Gateway",
    category: "networking",
    cloud: "azure",
    icon: "Shuffle",
    description: "Outbound internet access",
    connections: {
      canConnectTo: ["vnet"],
      canReceiveFrom: ["virtual-machines", "aks"]
    }
  },
  {
    id: "azure-dns",
    label: "Azure DNS",
    category: "networking",
    cloud: "azure",
    icon: "Globe",
    description: "DNS hosting service",
    connections: {
      canConnectTo: ["application-gateway"],
      canReceiveFrom: []
    }
  },
  {
    id: "network-security-groups",
    label: "Network Security Groups",
    category: "networking",
    cloud: "azure",
    icon: "Shield",
    description: "Network-level firewall rules",
    connections: {
      canConnectTo: ["virtual-machines", "aks"],
      canReceiveFrom: ["vnet"]
    }
  },
  {
    id: "blob-storage",
    label: "Blob Storage",
    category: "storage",
    cloud: "azure",
    icon: "HardDrive",
    description: "Object storage service",
    connections: {
      canConnectTo: ["synapse"],
      canReceiveFrom: ["virtual-machines", "app-service", "aks", "azure-functions"]
    }
  },
  {
    id: "azure-sql",
    label: "Azure SQL",
    category: "database",
    cloud: "azure",
    icon: "Database",
    description: "Managed SQL database",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["virtual-machines", "app-service", "aks"]
    }
  },
  {
    id: "cosmos-db",
    label: "Cosmos DB",
    category: "database",
    cloud: "azure",
    icon: "Database",
    description: "Globally distributed NoSQL database",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["virtual-machines", "app-service", "aks", "azure-functions"]
    }
  },
  {
    id: "service-bus",
    label: "Service Bus",
    category: "messaging",
    cloud: "azure",
    icon: "MessageSquare",
    description: "Enterprise message broker",
    connections: {
      canConnectTo: ["azure-functions", "virtual-machines"],
      canReceiveFrom: ["azure-functions", "virtual-machines"]
    }
  },
  {
    id: "event-grid",
    label: "Event Grid",
    category: "messaging",
    cloud: "azure",
    icon: "Activity",
    description: "Event routing service",
    connections: {
      canConnectTo: ["azure-functions"],
      canReceiveFrom: []
    }
  },
  {
    id: "key-vault",
    label: "Key Vault",
    category: "security",
    cloud: "azure",
    icon: "Lock",
    description: "Secrets, keys, and certificates",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["virtual-machines", "app-service", "aks", "azure-functions"]
    }
  },
  {
    id: "synapse",
    label: "Synapse Analytics",
    category: "analytics",
    cloud: "azure",
    icon: "BarChart",
    description: "Data warehousing and analytics",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["blob-storage"]
    }
  },
  {
    id: "container-registry",
    label: "Container Registry",
    category: "devops",
    cloud: "azure",
    icon: "Package",
    description: "Container image registry",
    connections: {
      canConnectTo: ["aks", "app-service"],
      canReceiveFrom: []
    }
  },
  {
    id: "azure-monitor",
    label: "Azure Monitor",
    category: "devops",
    cloud: "azure",
    icon: "Activity",
    description: "Logs, metrics, and alerts",
    connections: {
      canConnectTo: [],
      canReceiveFrom: ["virtual-machines", "aks", "app-service", "azure-sql", "azure-functions"]
    }
  }
];

// Example usage in your CloudIcons component:
/*
const CloudIcon: React.FC<{ node: CloudNode }> = ({ node }) => {
  const IconComponent = getIconComponent(node.icon);
  
  return (
    <div className="cloud-node">
      <IconComponent className="w-6 h-6" />
      <span>{node.label}</span>
    </div>
  );
};
*/
