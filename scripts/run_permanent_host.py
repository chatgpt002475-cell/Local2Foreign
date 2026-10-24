"""
LiveVoice AI - Master Permanent Hosting Supervisor
Runs 24/7 in the background with auto-restart, dynamic IP discovery,
and resilient cloud tunnel failover.
"""

import os
import sys
import time
import socket
import subprocess
import threading
import re
import signal

PYTHON_EXE = r"C:\Users\naidu\.venvs\livevoice\Scripts\python.exe"
CLOUDFLARED_EXE = r"C:\Users\naidu\.tools\cloudflared.exe"
WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LINK_FILE = os.path.join(WORKSPACE_DIR, "current_public_link.txt")
HTML_FILE = os.path.join(WORKSPACE_DIR, "current_public_link.html")
LOG_FILE = os.path.join(WORKSPACE_DIR, "host_service.log")

stop_requested = False

def log(msg: str):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] {msg}"
    print(formatted)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass

def get_current_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def write_gateway_html(public_url: str, local_ip: str, hostname: str):
    try:
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LiveVoice AI - Permanent Gateway</title>
  <meta http-equiv="refresh" content="1; url={public_url}">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #090d16;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }}
    .card {{
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 20px;
      padding: 32px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
      text-align: center;
    }}
    h1 {{ font-size: 24px; margin-top: 0; color: #38bdf8; }}
    p {{ color: #94a3b8; font-size: 14px; line-height: 1.6; }}
    .btn {{
      display: inline-block;
      background: #2563eb;
      color: white;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 12px;
      font-weight: bold;
      margin: 16px 0;
      transition: background 0.2s;
    }}
    .btn:hover {{ background: #1d4ed8; }}
    .link-box {{
      background: #030712;
      border: 1px solid #374151;
      border-radius: 12px;
      padding: 12px;
      margin-top: 16px;
      text-align: left;
      font-family: monospace;
      font-size: 13px;
    }}
    .badge {{
      display: inline-block;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      background: #064e3b;
      color: #34d399;
      margin-bottom: 8px;
    }}
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">● LIVEVOICE PERMANENT HOST</span>
    <h1>LiveVoice AI Gateway</h1>
    <p>Redirecting to live voice translation platform...</p>
    
    <a href="{public_url}" class="btn">Enter Remote Session (Mobile 4G/5G)</a>

    <div class="link-box">
      <div style="color: #10b981; font-weight: bold; margin-bottom: 6px;">🏠 Permanent Local Wi-Fi Links:</div>
      <div style="margin-bottom: 4px;">• IP Link: <a href="http://{local_ip}:8000" style="color: #60a5fa;">http://{local_ip}:8000</a></div>
      <div style="margin-bottom: 4px;">• mDNS (Apple/Android): <a href="http://{hostname}.local:8000" style="color: #a78bfa;">http://{hostname}.local:8000</a></div>
      <div>• Windows Hostname: <a href="http://{hostname}:8000" style="color: #a78bfa;">http://{hostname}:8000</a></div>
    </div>
  </div>
</body>
</html>"""
        with open(HTML_FILE, "w", encoding="utf-8") as f:
            f.write(html)
    except Exception as e:
        log(f"Failed to write gateway HTML: {e}")

def run_uvicorn_service():
    """Runs Uvicorn on 0.0.0.0:8000 and auto-restarts if it ever terminates."""
    global stop_requested
    while not stop_requested:
        log("[Uvicorn] Starting server on 0.0.0.0:8000...")
        env = os.environ.copy()
        env["PYTHONPATH"] = WORKSPACE_DIR
        
        proc = subprocess.Popen(
            [PYTHON_EXE, "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"],
            cwd=WORKSPACE_DIR,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace"
        )

        for line in iter(proc.stdout.readline, ""):
            line_str = line.strip()
            if line_str:
                log(f"[Uvicorn] {line_str}")

        proc.wait()
        if stop_requested:
            break
        log("[Uvicorn] Process stopped unexpectedly. Restarting in 2 seconds...")
        time.sleep(2)

def run_tunnel_service():
    """Runs Cloudflare tunnel and updates public links with auto-healing."""
    global stop_requested
    if not os.path.exists(CLOUDFLARED_EXE):
        log(f"[Tunnel] cloudflared not found at {CLOUDFLARED_EXE}. Tunnel skipped.")
        return

    while not stop_requested:
        log("[Tunnel] Launching cloudflared tunnel...")
        proc = subprocess.Popen(
            [CLOUDFLARED_EXE, "tunnel", "--url", "http://localhost:8000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace"
        )

        current_url = None
        for line in iter(proc.stdout.readline, ""):
            line_str = line.strip()
            match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line_str)
            if match and not current_url and "api.trycloudflare.com" not in match.group(0):
                current_url = match.group(0)
                local_ip = get_current_local_ip()
                hostname = socket.gethostname()
                log(f"[Tunnel] ACTIVE PUBLIC URL: {current_url}")
                log(f"[Local]  PERMANENT WI-FI IP: http://{local_ip}:8000")
                log(f"[Local]  PERMANENT HOSTNAME: http://{hostname}.local:8000")

                try:
                    with open(LINK_FILE, "w", encoding="utf-8") as f:
                        f.write(current_url)
                except Exception as e:
                    log(f"Error saving link file: {e}")

                write_gateway_html(current_url, local_ip, hostname)

            if "ERR" in line_str or "error" in line_str.lower():
                log(f"[Tunnel Error] {line_str}")

        proc.wait()
        if stop_requested:
            break
        log("[Tunnel] Cloudflare session closed. Auto-reconnecting in 3 seconds...")
        time.sleep(3)

def network_ip_monitor():
    """Monitors Wi-Fi network changes and refreshes URLs if IP changes."""
    global stop_requested
    last_ip = get_current_local_ip()
    hostname = socket.gethostname()

    while not stop_requested:
        time.sleep(10)
        curr_ip = get_current_local_ip()
        if curr_ip != last_ip:
            log(f"[Network] Wi-Fi IP changed from {last_ip} to {curr_ip}!")
            last_ip = curr_ip
            public_url = "http://localhost:8000"
            if os.path.exists(LINK_FILE):
                try:
                    with open(LINK_FILE, "r", encoding="utf-8") as f:
                        public_url = f.read().strip()
                except Exception:
                    pass
            write_gateway_html(public_url, curr_ip, hostname)

def run_port_5173_forwarder():
    """Transparently forwards port 5173 traffic to port 8000 for full backwards-compatibility."""
    import asyncio

    async def pipe(reader, writer):
        try:
            while True:
                data = await reader.read(65536)
                if not data:
                    break
                writer.write(data)
                await writer.drain()
        except Exception:
            pass
        finally:
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass

    async def handle_client(client_reader, client_writer):
        try:
            target_reader, target_writer = await asyncio.open_connection("127.0.0.1", 8000)
            await asyncio.gather(
                pipe(client_reader, target_writer),
                pipe(target_reader, client_writer)
            )
        except Exception:
            try:
                client_writer.close()
            except Exception:
                pass

    async def server_main():
        try:
            server = await asyncio.start_server(handle_client, "0.0.0.0", 5173)
            log("[Proxy] Port 5173 forwarder active -> transparently mirroring port 8000")
            async with server:
                await server.serve_forever()
        except Exception as e:
            log(f"[Proxy] Port 5173 forwarder note: {e}")

    try:
        asyncio.run(server_main())
    except Exception as e:
        log(f"[Proxy] 5173 forwarder stopped: {e}")

def main():
    global stop_requested
    local_ip = get_current_local_ip()
    hostname = socket.gethostname()

    log("=" * 70)
    log(" LIVEVOICE AI — PERMANENT HOST SUPERVISOR STARTED")
    log(f" Host Machine Name:  {hostname}")
    log(f" Current Wi-Fi IP:   {local_ip}")
    log(f" Permanent Wi-Fi:    http://{local_ip}:8000")
    log(f" Permanent mDNS:     http://{hostname}.local:8000")
    log(f" Permanent Windows:  http://{hostname}:8000")
    log("=" * 70)

    # Thread 1: Uvicorn Server
    t_uvicorn = threading.Thread(target=run_uvicorn_service, daemon=True)
    t_uvicorn.start()

    # Wait 2 seconds for uvicorn to bind
    time.sleep(2)

    # Thread 2: Port 5173 Forwarder
    t_proxy = threading.Thread(target=run_port_5173_forwarder, daemon=True)
    t_proxy.start()

    # Thread 3: Tunnel Service
    t_tunnel = threading.Thread(target=run_tunnel_service, daemon=True)
    t_tunnel.start()

    # Thread 4: Network IP Monitor
    t_net = threading.Thread(target=network_ip_monitor, daemon=True)
    t_net.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log("Shutdown signal received. Stopping services...")
        stop_requested = True

if __name__ == "__main__":
    main()
