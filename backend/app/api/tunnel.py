"""
LiveVoice AI - Tunnel & Permanent Hosting Coordination API
Provides the permanent local Wi-Fi URL, active public tunnel URL, and QR coordinates.
"""

import os
import socket
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

tunnel_router = APIRouter(prefix="/tunnel", tags=["tunnel"])

PUBLIC_LINK_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "current_public_link.txt")

class TunnelStatus(BaseModel):
    local_ip: str
    local_ip_url: str
    local_hostname_url: str
    local_mdns_url: str
    public_url: Optional[str]
    active_url: str
    is_tunnel_active: bool

def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

@tunnel_router.get("/status", response_model=TunnelStatus)
async def get_tunnel_status():
    local_ip = get_local_ip()
    hostname = socket.gethostname()
    local_ip_url = f"http://{local_ip}:8000"
    local_hostname_url = f"http://{hostname}:8000"
    local_mdns_url = f"http://{hostname}.local:8000"

    public_url = None
    if os.path.exists(PUBLIC_LINK_FILE):
        try:
            with open(PUBLIC_LINK_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content.startswith("http"):
                    public_url = content
        except Exception:
            pass

    return TunnelStatus(
        local_ip=local_ip,
        local_ip_url=local_ip_url,
        local_hostname_url=local_hostname_url,
        local_mdns_url=local_mdns_url,
        public_url=public_url,
        active_url=public_url or local_ip_url,
        is_tunnel_active=bool(public_url)
    )

@tunnel_router.post("/update")
async def update_tunnel_url(payload: dict):
    new_url = payload.get("url", "").strip()
    if new_url and new_url.startswith("http"):
        with open(PUBLIC_LINK_FILE, "w", encoding="utf-8") as f:
            f.write(new_url)
    return {"status": "updated", "url": new_url}
