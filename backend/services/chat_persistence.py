import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

class ChatPersistence:
    def __init__(self, data_dir: str = "data/chats"):
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)

    def _get_file_path(self, run_id: str) -> str:
        return os.path.join(self.data_dir, f"{run_id}.json")

    def save_chat(self, run_id: str, user_msg: str, llm_msg: str, nodes: Optional[List[Dict[str, Any]]] = None):
        """
        Appends a new interaction to the chat history for a given run_id.
        Also updates the current node state if provided.
        """
        file_path = self._get_file_path(run_id)
        
        data = {
            "run_id": run_id,
            "created_at": datetime.utcnow().isoformat(),
            "history": [],
            "current_nodes": []
        }

        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    print(f"Warning: Could not decode existing chat file for {run_id}. Starting fresh.")

        # Append new interaction
        interaction = {
            "timestamp": datetime.utcnow().isoformat(),
            "user": user_msg,
            "llm": llm_msg
        }
        data["history"].append(interaction)

        # Update nodes if provided
        if nodes is not None:
            data["current_nodes"] = nodes
            
        data["last_updated"] = datetime.utcnow().isoformat()

        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)
        
        print(f"[ChatPersistence] Saved interaction for run_id {run_id}")

    def load_chat(self, run_id: str) -> Dict[str, Any]:
        """
        Loads the chat history and state for a given run_id.
        """
        file_path = self._get_file_path(run_id)
        if not os.path.exists(file_path):
            return None
        
        with open(file_path, "r") as f:
            return json.load(f)

    def get_history_context(self, run_id: str) -> str:
        """
        Returns a formatted string of the chat history to be used as context for the LLM.
        """
        data = self.load_chat(run_id)
        if not data or not data.get("history"):
            return ""
        
        context = "PREVIOUS CHAT HISTORY:\n"
        for item in data["history"]:
            context += f"USER: {item['user']}\n"
            context += f"ASSISTANT: {item['llm']}\n"
            context += "---\n"
        
        return context
