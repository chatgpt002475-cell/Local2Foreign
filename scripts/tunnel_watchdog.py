"""
LiveVoice AI - Auto-Healing Tunnel Watchdog
Ensures a public tunnel is always running, monitors edge health,
auto-restarts if Cloudflare terminates the session, and maintains
both the permanent local Wi-Fi link and active public URL.
"""

import os
import re
import sys
import time
import socket
import subprocess
import threading
import httpx

CLOUDFLARED_BIN = r"C:\Users\naidu\.tools\cloudflared.exe"
WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
LINK_FILE = os.path.join(WORKSPACE_DIR, "current_public_link.txt")
HTML_FILE = os.path.join(WORKSPACE_DIR, "current_public_link.html")

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.1.4"

def update_link_files(public_url: str):
    local_ip = get_local_ip()
    try:
        with open(LINK_FILE, "w", encoding="utf-8") as f:
            f.write(public_url)
    except Exception as e:
        print(f"[Watchdog] Error writing link file: {e}")

    try:
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LiveVoice AI - Permanent Gateway</title>
  <meta http-equiv="refresh" content="0; url={public_url}">
  <script>window.location.href = "{public_url}";</script>
</head>
<body style="font-family:sans-serif; text-align:center; padding:40px; background:#0f172a; color:#fff;">
  <h2>Connecting to LiveVoice AI...</h2>
  <p><a href="{public_url}" style="color:#818cf8; font-size:18px;">Click here to enter</a></p>
  <hr style="border-color:#334155; margin:30px auto; max-width:400px;" />
  <p style="color:#94a3b8; font-size:13px;">Permanent Wi-Fi Link: <a href="http://{local_ip}:8000" style="color:#38bdf8;">http://{local_ip}:8000</a></p>
</body>
</html>"""
        with open(HTML_FILE, "w", encoding="utf-8") as f:
            f.write(html_content)
    except Exception as e:
        print(f"[Watchdog] Error writing HTML file: {e}")

    # Notify backend API
    try:
        httpx.post("http://localhost:8000/api/tunnel/update", json={"url": public_url}, timeout=3.0)
    except Exception:
        pass

def run_tunnel():
    local_ip = get_local_ip()
    print("=" * 65)
    print(" LIVEVOICE AI - PERMANENT HOSTING WATCHDOG ACTIVE")
    print(f" Permanent Local Wi-Fi Link: http://{local_ip}:8000")
    print("=" * 65)

    while True:
        print("\n[Watchdog] Launching Cloudflare Tunnel...")
        cmd = [CLOUDFLARED_BIN, "tunnel", "--url", "http://localhost:8000"]
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace"
        )

        current_url = None
        tunnel_alive = True

        for line in iter(process.stdout.readline, ""):
            line_str = line.strip()
            # Look for assigned tunnel URL
            match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line_str)
            if match and not current_url:
                current_url = match.group(0)
                update_link_files(current_url)
                print("\n" + "#" * 65)
                print(f" [ONLINE] Public Remote Link: {current_url}")
                print(f" [ONLINE] Speaker Studio:    {current_url}/?mode=speaker&room=LIVE-8821")
                print(f" [ONLINE] Listener Portal:   {current_url}/?mode=listener&room=LIVE-8821")
                print(f" [ONLINE] Permanent Wi-Fi:   http://{local_ip}:8000")
                print("#" * 65 + "\n")

            # Check for disconnect / expiration errors
            if "Unauthorized: Tunnel not found" in line_str or "tunnel activity timeout" in line_str:
                print(f"[Watchdog] Detected tunnel expiration: {line_str}")
                tunnel_alive = False
                break

            if process.poll() is not None:
                tunnel_alive = False
                break

        # If process exited or tunnel died, clean up and restart
        try:
            process.terminate()
            process.wait(timeout=5)
        except Exception:
            process.kill()

        print("[Watchdog] Tunnel session ended. Auto-recovering in 3 seconds...")
        time.sleep(3)

if __name__ == "__main__":
    run_tunnel()
