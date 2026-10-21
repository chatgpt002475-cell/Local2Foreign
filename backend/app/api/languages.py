"""
LiveVoice AI - Languages API Endpoints
"""

import time
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..languages.registry import get_all_languages, get_language, LanguageInfo
from ..services.translation import translation_service
from ..services.tts import tts_service

languages_router = APIRouter(prefix="/languages", tags=["Languages"])

class TestLanguageRequest(BaseModel):
    phrase: Optional[str] = None
    target_lang: Optional[str] = "en"

class TestLanguageResponse(BaseModel):
    success: bool
    source_code: str
    target_lang: str
    source_text: str
    translated_text: str
    audio_base64: Optional[str] = None
    asr_ms: int
    translation_ms: int
    tts_ms: int
    total_ms: int
    error: Optional[str] = None

@languages_router.get("", response_model=List[LanguageInfo])
async def list_languages():
    return get_all_languages()

@languages_router.get("/{code}", response_model=LanguageInfo)
async def get_language_details(code: str):
    info = get_language(code)
    if not info:
        raise HTTPException(status_code=404, detail=f"Language code '{code}' not recognized.")
    return info

@languages_router.post("/{code}/test", response_model=TestLanguageResponse)
async def test_language_endpoint(code: str, body: TestLanguageRequest):
    info = get_language(code)
    if not info:
        raise HTTPException(status_code=404, detail=f"Language '{code}' not supported.")

    source_text = body.phrase or (info.sample_phrases[0].native if info.sample_phrases else "Hello")
    target_lang = body.target_lang or "en"
    start_total = time.perf_counter()

    # Step 1: Simulate ASR decoding
    asr_ms = 25

    # Step 2: Translation
    translated_text, trans_ms = await translation_service.translate(source_text, code, target_lang)

    # Step 3: Neural TTS
    b64_audio, tts_ms, _fmt = await tts_service.synthesize_speech(translated_text, language=target_lang)

    total_ms = int((time.perf_counter() - start_total) * 1000)

    return TestLanguageResponse(
        success=True,
        source_code=code,
        target_lang=target_lang,
        source_text=source_text,
        translated_text=translated_text,
        audio_base64=b64_audio,
        asr_ms=asr_ms,
        translation_ms=trans_ms,
        tts_ms=tts_ms,
        total_ms=total_ms,
    )
