from services.llmchat.factory import get_llm


class InfraGraphGenerator:
    def __init__(self, llm_provider=None):
        self.llm = get_llm(llm_provider)

    # -------- TEXT PROMPT --------
    def build_prompt(self, user_prompt, available_nodes):
        return [
            {
                "role": "system",
                "content": open("services/prompts/infra_graph.txt").read()
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

    # -------- IMAGE PROMPT --------
    def image_instruction(self):
        return open("services/prompts/infra_graph_image.txt").read()

    # -------- NORMALIZE --------
    def normalize(self, graph):
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])

        ids = {n["id"] for n in nodes}

        def ensure_node(id_, label):
            if id_ not in ids:
                nodes.append({
                    "id": id_,
                    "type": "cloudNode",
                    "data": {
                        "label": label,
                        "category": "networking",
                        "icon": label.lower(),
                        "cloud": "aws"
                    },
                    "config": {}
                })
                ids.add(id_)

        ensure_node("vpc", "VPC")
        ensure_node("subnet", "Subnet")

        if not any(e for e in edges if e["source"] == "vpc" and e["target"] == "subnet"):
            edges.append({
                "source": "vpc",
                "target": "subnet",
                "relation": "contains"
            })

        graph["nodes"] = nodes
        graph["edges"] = edges
        return graph

    # -------- GENERATE --------
    def generate(self, user_prompt, available_nodes, input_type="text", image_path=None):

        # 🔥 IMAGE FLOW (2 STEP)
        if input_type == "image":
            detected = self.llm.detect_services_from_image(
                image_path=image_path,
                instruction=self.image_instruction()
            )

            services = detected.get("services", [])

            text_prompt = (
                "Create a cloud infra graph using these services:\n"
                + ", ".join(services)
            )

            messages = self.build_prompt(text_prompt, available_nodes)
            response = self.llm.generate_json(messages)

        else:
            messages = self.build_prompt(user_prompt, available_nodes)
            response = self.llm.generate_json(messages)

        graph = self.normalize(response.get("graph", {}))
        return {
            "summary": response.get("summary", ""),
            "graph": graph
        }
