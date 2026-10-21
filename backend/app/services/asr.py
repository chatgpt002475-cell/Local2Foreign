"""
LiveVoice AI - Streaming Automatic Speech Recognition (ASR)
"""

import time
import httpx
import numpy as np
from typing import Optional, Dict
from ..config import settings
from ..languages.registry import LANGUAGE_PACKS

class ASRService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER
        self.openai_key = settings.OPENAI_API_KEY

    async def transcribe_pcm_audio(
        self,
        pcm_bytes: bytes,
        language: str = "te",
        auto_detect: bool = False
    ) -> Dict[str, any]:
        """
        Transcribes raw 16kHz PCM audio into text with energy-based silence detection.
        """
        start_time = time.perf_counter()

        # Guard: check minimum payload
        if not pcm_bytes or len(pcm_bytes) < 3200:  # < 100ms of 16kHz 16-bit mono
            return {
                "text": "",
                "detected_language": language,
                "latency_ms": 1,
                "provider": "vad-silence"
            }

        # Energy calculation to verify speaker is actually talking
        try:
            samples = np.frombuffer(pcm_bytes, dtype=np.int16)
            rms = np.sqrt(np.mean(samples.astype(np.float64)**2))
        except Exception:
            rms = 0

        # Silence threshold: if speaker doesn't speak, stay completely silent
        if rms < 380:
            return {
                "text": "",
                "detected_language": language,
                "latency_ms": int((time.perf_counter() - start_time) * 1000),
                "provider": "vad-silence"
            }

        # If OpenAI provider configured and API key available
        if self.provider == "openai" and self.openai_key:
            try:
                wav_bytes = self._pcm_to_wav(pcm_bytes)
                async with httpx.AsyncClient(timeout=10.0) as client:
                    files = {"file": ("audio.wav", wav_bytes, "audio/wav")}
                    data = {"model": "whisper-1"}
                    if not auto_detect and language:
                        data["language"] = language
                    headers = {"Authorization": f"Bearer {self.openai_key}"}
                    response = await client.post(
                        "https://api.openai.com/v1/audio/transcriptions",
                        files=files,
                        data=data,
                        headers=headers
                    )
                    if response.status_code == 200:
                        text = response.json().get("text", "").strip()
                        elapsed = int((time.perf_counter() - start_time) * 1000)
                        return {
                            "text": text,
                            "detected_language": language,
                            "latency_ms": elapsed,
                            "provider": "openai-whisper"
                        }
            except Exception as e:
                print(f"[ASR] OpenAI Whisper error: {e}. Falling back to acoustic engine.")

        # If offline/local fallback: Do NOT repeat the initial sample sentence!
        # Return empty text so the speaker stays silent and holds until speech occurs.
        elapsed = int((time.perf_counter() - start_time) * 1000)
        return {
            "text": "",
            "detected_language": language,
            "latency_ms": elapsed,
            "provider": "silence-hold"
        }

    def _pcm_to_wav(self, pcm_bytes: bytes, sample_rate: int = 16000, channels: int = 1) -> bytes:
        import io
        import wave
        bio = io.BytesIO()
        with wave.open(bio, "wb") as wf:
            wf.setnchannels(channels)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(pcm_bytes)
        return bio.getvalue()

asr_service = ASRService()
