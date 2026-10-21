"""
LiveVoice AI - Settings Endpoints
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ..config import settings

settings_router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsPayload(BaseModel):
    local_only_mode: bool
    ai_provider: str
    openai_api_key: Optional[str] = None
    default_source_lang: str
    default_target_lang: str
    voice_speed: float
    voice_pitch: float
    audio_chunk_ms: int
    vad_silence_threshold_ms: int
    vad_energy_threshold: int
    session_timeout_minutes: int
    allow_telemetry: bool
    save_transcripts_locally: bool

@settings_router.get("", response_model=SettingsPayload)
async def get_app_settings():
    return SettingsPayload(
        local_only_mode=settings.LOCAL_ONLY_MODE,
        ai_provider=settings.AI_PROVIDER,
        openai_api_key=settings.OPENAI_API_KEY if settings.OPENAI_API_KEY else None,
        default_source_lang=settings.DEFAULT_SOURCE_LANG,
        default_target_lang=settings.DEFAULT_TARGET_LANG,
        voice_speed=1.0,
        voice_pitch=1.0,
        audio_chunk_ms=settings.AUDIO_FRAME_MS,
        vad_silence_threshold_ms=settings.VAD_SILENCE_THRESHOLD_MS,
        vad_energy_threshold=settings.VAD_ENERGY_THRESHOLD,
        session_timeout_minutes=settings.SESSION_TIMEOUT_MINUTES,
        allow_telemetry=False,
        save_transcripts_locally=False,
    )

@settings_router.post("", response_model=SettingsPayload)
async def update_app_settings(payload: SettingsPayload):
    settings.LOCAL_ONLY_MODE = payload.local_only_mode
    settings.AI_PROVIDER = payload.ai_provider
    if payload.openai_api_key is not None:
        settings.OPENAI_API_KEY = payload.openai_api_key
    settings.DEFAULT_SOURCE_LANG = payload.default_source_lang
    settings.DEFAULT_TARGET_LANG = payload.default_target_lang
    settings.VAD_SILENCE_THRESHOLD_MS = payload.vad_silence_threshold_ms
    settings.VAD_ENERGY_THRESHOLD = payload.vad_energy_threshold
    settings.SESSION_TIMEOUT_MINUTES = payload.session_timeout_minutes
    return payload
