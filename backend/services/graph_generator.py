from services.llmchat.factory import get_llm


class InfraGraphGenerator:
    def __init__(self, llm_provider="gemini"):
        self.llm = get_llm(llm_provider)

    # --------------------------------------------------
    # TEXT PROMPT
    # --------------------------------------------------
    def build_prompt(self, user_prompt, available_nodes):
        return [
            {
                "role": "system",
                "content": open(
                    "services/prompts/infra_graph.txt",
                    "r",
                    encoding="utf-8"
                ).read()
            },
            {
                "role": "user",
                "content": f"""
User request:
{user_prompt}

Available nodes (JSON):
{available_nodes}
"""
            }
        ]

    # --------------------------------------------------
    # IMAGE PROMPT
    # --------------------------------------------------
    def build_prompt_image(self):
        return open(
            "services/prompts/infra_graph_image.txt",
            "r",
            encoding="utf-8"
        ).read()

    # --------------------------------------------------
    # GRAPH NORMALIZATION
    # --------------------------------------------------
    def normalize(self, graph):
        nodes = {n["id"]: n for n in graph.get("nodes", [])}
        edges = graph.get("edges", [])

        def get_label(node_id):
            return nodes[node_id]["data"]["label"]

        # ---------- 1. Ensure VPC ----------
        has_vpc = any(n["data"]["label"] == "VPC" for n in nodes.values())
        if not has_vpc:
            vpc_node = {
                "id": "vpc",
                "type": "cloudNode",
                "data": {
                    "label": "VPC",
                    "category": "networking",
                    "icon": "vpc",
                    "cloud": "aws"
                },
                "config": {}
            }
            graph["nodes"].insert(0, vpc_node)
            nodes["vpc"] = vpc_node

        # ---------- 2. Ensure Subnet ----------
        has_subnet = any(n["data"]["label"] == "Subnet" for n in nodes.values())
        if not has_subnet:
            subnet_node = {
                "id": "subnet",
                "type": "cloudNode",
                "data": {
                    "label": "Subnet",
                    "category": "networking",
                    "icon": "subnet",
                    "cloud": "aws"
                },
                "config": {}
            }
            graph["nodes"].append(subnet_node)
            nodes["subnet"] = subnet_node

            edges.append({
                "source": "vpc",
                "target": "subnet",
                "relation": "contains"
            })

        # ---------- 3. Clean invalid edges ----------
        cleaned_edges = []
        for e in edges:
            if e["source"] not in nodes or e["target"] not in nodes:
                continue

            src_label = get_label(e["source"])
            tgt_label = get_label(e["target"])

            # ❌ EC2 → VPC
            if src_label == "EC2" and tgt_label == "VPC":
                continue

            # ❌ Anything → Subnet except VPC
            if tgt_label == "Subnet" and src_label != "VPC":
                continue

            cleaned_edges.append(e)

        edges = cleaned_edges

        # ---------- 4. Enforce hierarchy ----------
        required_containment = {
            "EC2": "subnet",
            "RDS": "subnet"
        }

        for node_id, node in nodes.items():
            label = node["data"]["label"]
            if label in required_containment:
                parent = required_containment[label]

                exists = any(
                    e["source"] == parent
                    and e["target"] == node_id
                    and e["relation"] == "contains"
                    for e in edges
                )

                if not exists:
                    edges.append({
                        "source": parent,
                        "target": node_id,
                        "relation": "contains"
                    })

        graph["edges"] = edges
        return graph

    # --------------------------------------------------
    # GENERATE GRAPH
    # --------------------------------------------------
    def generate(
        self,
        user_prompt,
        available_nodes,
        input_type="text",
        image_path=None
    ):
        # ---------- TEXT ----------
        if input_type == "text":
            messages = self.build_prompt(user_prompt, available_nodes)
            response = self.llm.generate_json(messages)

        # ---------- IMAGE ----------
        elif input_type == "image":
            if not image_path:
                raise ValueError("image_path is required for image input")

            instruction = self.build_prompt_image()
            response = self.llm.generate_json_from_image(
                image_path=image_path,
                instruction=instruction
            )

        else:
            raise ValueError("input_type must be 'text' or 'image'")

        # ---------- EXTRACT ----------
        summary = response.get("summary", "")
        graph = response.get("graph", {})

        # ---------- NORMALIZE ----------
        graph = self.normalize(graph)

        return {
            "summary": summary,
            "graph": graph
        }
