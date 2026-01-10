from service_registry import *
class InfraSpecBuilder:
    """
    Converts a user graph + node catalog into a strict Infra Spec
    """

    def __init__(self, node_catalog: list):
        # index catalog by id
        self.catalog = {n["id"]: n for n in node_catalog}

    def build(self, graph: dict) -> dict:
        nodes = graph["nodes"]
        edges = graph.get("edges", [])

        # ---------- 1. Detect cloud from node types ----------
        clouds = set()
        for n in nodes:
            node_type = n.get("type", "")
            if "gcp" in node_type.lower():
                clouds.add("gcp")
            elif "aws" in node_type.lower():
                clouds.add("aws")
            elif "azure" in node_type.lower():
                clouds.add("azure")

        if len(clouds) != 1:
            raise ValueError("Multi-cloud graphs not supported yet")

        cloud = clouds.pop()

        # ---------- 2. Build service entries ----------
        services = {}
        node_id_to_service = {}

        for n in nodes:
            catalog_id = self._get_catalog_id(n, preferred_cloud=cloud)
            canonical = CANONICAL_SERVICE_MAP[catalog_id]

            # Extract config from node data
            node_config = n.get("data", {}).get("config", {})
            
            services[canonical] = {
                "id": canonical,
                **DEFAULTS.get(canonical, {}),
                **node_config  # Merge node-specific config
            }

            node_id_to_service[n["id"]] = canonical

        # ---------- 3. Resolve relationships from edges ----------
        for e in edges:
            src = node_id_to_service[e["source"]]
            tgt = node_id_to_service[e["target"]]

            # Networking containment
            if src in ["vpc", "vnet"] and tgt == "subnet":
                services["subnet"]["vpc"] = src

            # Subnet attachments
            if src == "subnet" and tgt in ["compute_vm", "cloud_sql", "kubernetes"]:
                services[tgt]["subnet"] = "subnet"

            # Compute → storage
            if src == "compute_vm" and tgt in ["cloud_storage", "object_storage"]:
                services[tgt]["attached_to"] = "compute_vm"

            # Load balancer → compute
            if src == "load_balancer" and tgt == "compute_vm":
                services["compute_vm"]["behind_lb"] = True

        # ---------- 4. Final infra spec ----------
        infra_spec = {
            "provider": cloud,
            "services": services
        }

        return infra_spec
    def _get_catalog_id(self, node: dict, preferred_cloud: str = None) -> str:
        label = node["data"]["label"].strip().lower()

        matches = []
        for cid, c in self.catalog.items():
            if c["label"].strip().lower() == label:
                # If preferred_cloud is specified, filter by it
                if preferred_cloud:
                    if c["cloud"] == preferred_cloud:
                        matches.append(cid)
                else:
                    matches.append(cid)

        if len(matches) == 1:
            return matches[0]

        if len(matches) > 1:
            raise ValueError(f"Ambiguous catalog match for label: {label}. Matches: {matches}")

        raise ValueError(f"Node not found in catalog: {label}")