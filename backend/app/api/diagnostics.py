"""
LiveVoice AI - Diagnostics & Health Endpoints
"""

import time
import os
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from ..services.session_manager import session_manager
from ..languages.registry import get_all_languages
from ..config import settings

diagnostics_router = APIRouter(prefix="/diagnostics", tags=["Diagnostics"])

start_time = time.time()

class DiagnosticsHealthResponse(BaseModel):
    status: str
    uptime_seconds: int
    backend_version: str
    active_sessions: int
    cpu_percent: float
    memory_percent: float
    models_loaded: List[str]
    supported_languages_count: int

@diagnostics_router.get("/health", response_model=DiagnosticsHealthResponse)
async def get_system_health():
    uptime = int(time.time() - start_time)
    
    cpu = 0.0
    mem = 0.0
    if HAS_PSUTIL:
        try:
            cpu = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory().percent
        except Exception:
            pass

    return DiagnosticsHealthResponse(
        status="healthy",
        uptime_seconds=uptime,
        backend_version=settings.APP_VERSION,
        active_sessions=session_manager.get_active_count(),
        cpu_percent=cpu,
        memory_percent=mem,
        models_loaded=["Edge-Neural-TTS", "Local-Speech-VAD", "Indic-Multilingual-MT"],
        supported_languages_count=len(get_all_languages())
    )
