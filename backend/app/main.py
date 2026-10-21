"""
LiveVoice AI - Main FastAPI Application with Unified Permanent Hosting
Serves API routes, WebSocket streaming, and built React UI from a single unified port (8000).
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import settings
from .api.routes import api_router
from .websockets.translation_ws import ws_router

app = FastAPI(
    title="LiveVoice AI API",
    description="Live Streaming Voice Translation Platform supporting 20 languages.",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware (allows all local network origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API and WebSocket Routers
app.include_router(api_router)
app.include_router(ws_router)

@app.get("/healthz", tags=["Health"])
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}

# Resolve frontend dist directory
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
dist_dir = os.path.join(project_root, "frontend", "dist")
assets_dir = os.path.join(dist_dir, "assets")

if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa_frontend(full_path: str = ""):
    # Do not intercept API, WebSockets, or Swagger documentation
    if full_path.startswith("api/") or full_path.startswith("ws/") or full_path in ["docs", "redoc", "openapi.json", "healthz"]:
        raise HTTPException(status_code=404, detail="Not Found")

    # If static file exists directly (e.g. vite.svg, favicon.ico)
    candidate_file = os.path.join(dist_dir, full_path)
    if full_path and os.path.isfile(candidate_file):
        return FileResponse(candidate_file)

    # Return index.html for all client-side routes (/, /?mode=speaker, /?mode=listener)
    index_file = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)

    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "ready",
        "docs": "/docs",
        "websocket": "/ws/translate"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
