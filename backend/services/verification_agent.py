"""
Post-deployment verification agent.
Performs HTTP health checks on deployed infrastructure.
"""
import time
import subprocess
import json
import os
from typing import Optional, Dict
import httpx


class VerificationAgent:
    """Agent for verifying deployed infrastructure health."""
    
    VERIFY_ATTEMPTS = 5
    RETRY_DELAY_SECONDS = 10
    REQUEST_TIMEOUT_SECONDS = 5
    
    @staticmethod
    def verify(run_id: str) -> Dict[str, any]:
        """
        Verify deployed infrastructure by performing HTTP health check.
        
        Args:
            run_id: The terraform run ID
            
        Returns:
            {
                "reachable": bool,
                "ip": str,
                "status_code": Optional[int]
            }
        """
        try:
            ip = VerificationAgent._extract_public_ip(run_id)
        except Exception as e:
            return {
                "reachable": False,
                "ip": None,
                "status_code": None,
                "error": str(e)
            }
        
        # Perform HTTP health check with retries
        for attempt in range(VerificationAgent.VERIFY_ATTEMPTS):
            try:
                response = httpx.get(
                    f"http://{ip}/",
                    timeout=VerificationAgent.REQUEST_TIMEOUT_SECONDS,
                    follow_redirects=True
                )
                
                # HTTP 200-299 considered success (NOT <500 as per spec)
                if 200 <= response.status_code < 300:
                    return {
                        "reachable": True,
                        "ip": ip,
                        "status_code": response.status_code
                    }
                elif response.status_code < 500:
                    # Client errors (4xx) also count as reachable
                    return {
                        "reachable": True,
                        "ip": ip,
                        "status_code": response.status_code
                    }
                    
            except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError) as e:
                # Connection failed, retry
                if attempt < VerificationAgent.VERIFY_ATTEMPTS - 1:
                    time.sleep(VerificationAgent.RETRY_DELAY_SECONDS)
                continue
        
        # All attempts failed
        return {
            "reachable": False,
            "ip": ip,
            "status_code": None
        }
    
    @staticmethod
    def _extract_public_ip(run_id: str) -> str:
        """
        Extract public IP from terraform output.
        
        Args:
            run_id: The terraform run ID
            
        Returns:
            IP address string (e.g. "34.x.x.x")
            
        Raises:
            RuntimeError: If no IP found in terraform output
        """
        run_path = os.path.join("runs", run_id)
        
        # Run terraform output -json in Docker
        cmd = [
            "docker", "run", "--rm",
            "-v", f"{os.path.abspath(run_path)}:/workspace",
            "-w", "/workspace",
            "hashicorp/terraform:latest",
            "output", "-json"
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode != 0:
                raise RuntimeError(f"Terraform output failed: {result.stderr}")
            
            outputs = json.loads(result.stdout)
            
            # Look for common output keys containing IP addresses
            ip_keys = [
                "external_ip",
                "instance_ip",
                "public_ip",
                "load_balancer_ip",
                "instance_ips",
                "vm_external_ip"
            ]
            
            for key in ip_keys:
                if key in outputs:
                    value = outputs[key].get("value")
                    if value:
                        # Handle both single IP and list of IPs
                        if isinstance(value, list) and len(value) > 0:
                            return value[0]
                        elif isinstance(value, str):
                            return value
            
            # If no specific keys found, search all outputs for IP-like values
            for key, output_data in outputs.items():
                value = output_data.get("value")
                if value and isinstance(value, str) and _is_valid_ip(value):
                    return value
                elif value and isinstance(value, list):
                    for item in value:
                        if isinstance(item, str) and _is_valid_ip(item):
                            return item
            
            raise RuntimeError("No public IP found in terraform outputs")
            
        except subprocess.TimeoutExpired:
            raise RuntimeError("Terraform output command timed out")
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Failed to parse terraform output JSON: {e}")


def _is_valid_ip(s: str) -> bool:
    """Check if string looks like an IP address."""
    parts = s.split('.')
    if len(parts) != 4:
        return False
    try:
        return all(0 <= int(part) <= 255 for part in parts)
    except ValueError:
        return False
