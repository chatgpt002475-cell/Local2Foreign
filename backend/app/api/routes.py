"""
LiveVoice AI - Central API Router
"""

import time
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from .languages import languages_router
from .diagnostics import diagnostics_router
from .settings import settings_router
from .voice import voice_router
from .tunnel import tunnel_router
from ..services.translation import translation_service
from ..services.tts import tts_service
from ..services.asr import asr_service
from ..languages.registry import validate_language_pair

api_router = APIRouter(prefix="/api")

api_router.include_router(languages_router)
api_router.include_router(diagnostics_router)
api_router.include_router(settings_router)
api_router.include_router(voice_router)
api_router.include_router(tunnel_router)

class TranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str
    synthesize_audio: Optional[bool] = True
    voice: Optional[str] = None
    pitch: Optional[str] = "+0Hz"
    rate: Optional[str] = "+0%"

class TranslateResponse(BaseModel):
    source_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    audio_base64: Optional[str] = None
    audio_format: Optional[str] = None
    latency_ms: int

@api_router.post("/translate", response_model=TranslateResponse)
async def translate_text(req: TranslateRequest):
    valid, reason = validate_language_pair(req.source_lang, req.target_lang)
    if not valid:
        raise HTTPException(status_code=400, detail=reason)

    start = time.perf_counter()
    trans_text, _ms = await translation_service.translate(req.text, req.source_lang, req.target_lang)

    b64_audio = None
    fmt = None
    if req.synthesize_audio:
        b64_audio, _tms, fmt = await tts_service.synthesize_speech(
            trans_text,
            language=req.target_lang,
            voice=req.voice,
            rate=req.rate or "+0%",
            pitch=req.pitch or "+0Hz"
        )

    total_elapsed = int((time.perf_counter() - start) * 1000)

    return TranslateResponse(
        source_text=req.text,
        translated_text=trans_text,
        source_lang=req.source_lang,
        target_lang=req.target_lang,
        audio_base64=b64_audio,
        audio_format=fmt,
        latency_ms=total_elapsed
    )

@api_router.post("/asr/transcribe")
async def transcribe_audio_file(
    file: UploadFile = File(...),
    language: str = Form("te")
):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty audio payload")

    res = await asr_service.transcribe_pcm_audio(contents, language=language)
    return res
