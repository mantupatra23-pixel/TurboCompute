# backend/provider/vast_adapter.py
import os
import requests
from typing import Dict

class VastAdapter:
    """
    Minimal Vast.ai adapter.
    Requires environment var VAST_API_KEY (Vast personal API key).
    NOTE: This is a simple example — update error handling and fields per Vast API docs.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base = "https://vast.ai/api/v0"

    def _headers(self):
        return {"Authorization": f"Bearer {self.api_key}"}

    def create_instance(self, plan_code: str, runtime_hours: int = 1) -> Dict:
        """
        plan_code: user selection (could be image id/offering id)
        For Vast.ai, you typically POST to /offers or /tasks depending on API.
        Here we use a simplified approach to create a task.
        """
        # Example simplified payload — modify per your Vast.ai account and image/offering
        payload = {
            "image": plan_code,   # or 'offer_id' depending on UI
            "price": 0.0,
            "duration": int(runtime_hours * 3600),
            "ninstance": 1
        }
        # NOTE: Adapter MUST be adjusted with correct Vast endpoints for your plan.
        url = f"{self.base}/tasks/create"
        resp = requests.post(url, json=payload, headers=self._headers(), timeout=30)
        resp.raise_for_status()
        data = resp.json()
        # For demo, return simplified structure:
        return {"id": data.get("task_id", data.get("id")), "status": "running", "ip": data.get("ip", None), "raw": data}

    def get_instance_status(self, provider_instance_id: str) -> Dict:
        url = f"{self.base}/tasks/{provider_instance_id}"
        resp = requests.get(url, headers=self._headers(), timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return {"id": provider_instance_id, "status": data.get("status", "running"), "ip": data.get("ip", None), "raw": data}

    def terminate_instance(self, provider_instance_id: str):
        url = f"{self.base}/tasks/{provider_instance_id}/stop"
        resp = requests.post(url, headers=self._headers(), timeout=20)
        resp.raise_for_status()
        return resp.json()
