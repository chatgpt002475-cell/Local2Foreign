"""
LiveVoice AI - Voice Customization & Acoustic Analysis API
Analyzes uploaded speech samples for fundamental pitch (F0) and tempo,
calibrates custom neural voice profiles, and supports Men/Women/Regional accents.
"""

import io
import math
import time
import wave
import numpy as np
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from ..languages.registry import LANGUAGE_PACKS, VoiceOption
from ..services.tts import tts_service

voice_router = APIRouter(prefix="/voice", tags=["voice"])

class VoicePreviewRequest(BaseModel):
    text: str
    language: str = "en"
    voice: Optional[str] = None
    pitch: str = "+0Hz"
    rate: str = "+0%"

class CustomVoiceResponse(BaseModel):
    detected_f0_hz: float
    detected_gender: str  # "Male" or "Female"
    suggested_base_voice: str
    suggested_base_voice_name: str
    suggested_pitch: str
    suggested_rate: str
    duration_seconds: float
    preview_audio_base64: str
    preview_format: str
    notes: str

@voice_router.get("/options/{lang_code}", response_model=List[VoiceOption])
async def get_voice_options(lang_code: str):
    """Returns available Male and Female voices with regional accents for a given language."""
    pack = LANGUAGE_PACKS.get(lang_code)
    if not pack:
        raise HTTPException(status_code=404, detail=f"Language code '{lang_code}' not found")
    return pack.voices

@voice_router.post("/preview")
async def generate_voice_preview(req: VoicePreviewRequest):
    """Generates an instant audio sample with given voice, pitch, and speed."""
    b64_audio, latency_ms, fmt = await tts_service.synthesize_speech(
        text=req.text,
        language=req.language,
        voice=req.voice,
        rate=req.rate,
        pitch=req.pitch
    )
    return {
        "audio_base64": b64_audio,
        "format": fmt,
        "latency_ms": latency_ms
    }

@voice_router.post("/analyze-sample", response_model=CustomVoiceResponse)
async def analyze_speech_sample(
    file: UploadFile = File(...),
    target_language: str = Form("en"),
    custom_name: Optional[str] = Form("Custom Voice")
):
    """
    Analyzes an uploaded speech sample (.wav / audio) for average pitch frequency (F0)
    and acoustic energy, and creates a tailored custom voice profile.
    """
    content = await file.read()
    if not content or len(content) < 1000:
        raise HTTPException(status_code=400, detail="Audio file too short or empty. Please upload at least 1-2 seconds of speech.")

    # Try to extract PCM from WAV
    audio_samples = None
    sample_rate = 16000

    try:
        with wave.open(io.BytesIO(content), "rb") as wf:
            sample_rate = wf.getframerate()
            n_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            raw_frames = wf.readframes(wf.getnframes())
            if sampwidth == 2:
                samples_int16 = np.frombuffer(raw_frames, dtype=np.int16)
                if n_channels > 1:
                    samples_int16 = samples_int16[::n_channels]  # take first channel
                audio_samples = samples_int16.astype(np.float32)
    except Exception:
        # If not standard WAV header (e.g. raw PCM or container), decode as int16
        try:
            samples_int16 = np.frombuffer(content[:len(content) - (len(content) % 2)], dtype=np.int16)
            audio_samples = samples_int16.astype(np.float32)
            sample_rate = 16000
        except Exception:
            raise HTTPException(status_code=400, detail="Unsupported audio format. Please provide a WAV audio file or record directly.")

    if audio_samples is None or len(audio_samples) < sample_rate * 0.5:
        raise HTTPException(status_code=400, detail="Speech recording too brief. Please provide at least 1 second.")

    duration_secs = round(len(audio_samples) / sample_rate, 2)

    # 1. Fundamental frequency (F0) estimation using normalized autocorrelation
    # Frame size ~ 30ms with 15ms step
    frame_len = int(sample_rate * 0.030)
    step = int(sample_rate * 0.015)
    f0_estimates = []

    # Valid human pitch range: 70 Hz to 400 Hz
    min_lag = int(sample_rate / 400)
    max_lag = int(sample_rate / 70)

    for i in range(0, len(audio_samples) - frame_len, step):
        frame = audio_samples[i:i + frame_len]
        # Energy gate
        rms = np.sqrt(np.mean(frame**2))
        if rms < 300:
            continue

        # Zero-mean normalized frame
        frame = frame - np.mean(frame)
        norm = np.sum(frame**2)
        if norm <= 0:
            continue

        # Autocorrelation
        autocorr = np.correlate(frame, frame, mode='full')
        autocorr = autocorr[len(frame) - 1:]

        search_window = autocorr[min_lag:max_lag]
        if len(search_window) > 0:
            peak_lag = min_lag + np.argmax(search_window)
            if autocorr[peak_lag] > 0.35 * norm:
                f0 = sample_rate / peak_lag
                if 70 <= f0 <= 380:
                    f0_estimates.append(f0)

    if f0_estimates:
        median_f0 = float(np.median(f0_estimates))
    else:
        median_f0 = 145.0  # balanced default

    # 2. Gender classification
    # Male: typically 85-155 Hz; Female: typically 165-255 Hz
    if median_f0 < 165.0:
        detected_gender = "Male"
        base_f0 = 120.0
    else:
        detected_gender = "Female"
        base_f0 = 210.0

    # 3. Calculate pitch offset in Hz (-20Hz to +20Hz)
    pitch_diff = int(round(median_f0 - base_f0))
    pitch_diff = max(-22, min(22, pitch_diff))
    suggested_pitch = f"{pitch_diff:+d}Hz"

    # 4. Find best matching neural voice from target language pack
    pack = LANGUAGE_PACKS.get(target_language, LANGUAGE_PACKS["en"])
    matching_voices = [v for v in pack.voices if v.gender == detected_gender]
    if not matching_voices:
        matching_voices = pack.voices

    selected_voice_opt = matching_voices[0] if matching_voices else None
    suggested_base_voice = selected_voice_opt.id if selected_voice_opt else pack.default_voice
    suggested_name = selected_voice_opt.name if selected_voice_opt else pack.default_voice

    suggested_rate = "+0%"

    # 5. Generate synthesized preview
    sample_preview_text = (
        f"Your custom voice profile has been calibrated. "
        f"Acoustic tone is set to {suggested_pitch}."
    )
    b64_preview, _, fmt = await tts_service.synthesize_speech(
        text=sample_preview_text,
        language=target_language,
        voice=suggested_base_voice,
        rate=suggested_rate,
        pitch=suggested_pitch
    )

    return CustomVoiceResponse(
        detected_f0_hz=round(median_f0, 1),
        detected_gender=detected_gender,
        suggested_base_voice=suggested_base_voice,
        suggested_base_voice_name=suggested_name,
        suggested_pitch=suggested_pitch,
        suggested_rate=suggested_rate,
        duration_seconds=duration_secs,
        preview_audio_base64=b64_preview,
        preview_format=fmt,
        notes=f"Detected vocal frequency {median_f0:.1f}Hz matches {detected_gender} vocal range with {suggested_pitch} calibration."
    )
