"""
LiveVoice AI - Streaming Session Manager
Handles concurrent WebSocket translation sessions, sequence ID ordering, and backpressure.
"""

import time
import asyncio
import uuid
from typing import Dict, Optional
from fastapi import WebSocket
from .audio import AudioVADProcessor
from .asr import asr_service
from .translation import translation_service
from .tts import tts_service
from ..config import settings

class TranslationSession:
    def __init__(
        self,
        session_id: str,
        websocket: WebSocket,
        source_lang: str = "te",
        target_lang: str = "en",
        auto_detect: bool = False,
        provider: str = "local_edge",
        voice: Optional[str] = None
    ):
        self.session_id = session_id
        self.websocket = websocket
        self.source_lang = source_lang
        self.target_lang = target_lang
        self.auto_detect = auto_detect
        self.provider = provider
        self.voice = voice

        self.seq_id = 0
        self.created_at = time.time()
        self.last_activity = time.time()
        self.vad_processor = AudioVADProcessor(
            sample_rate=settings.AUDIO_SAMPLE_RATE,
            silence_threshold_ms=settings.VAD_SILENCE_THRESHOLD_MS,
            energy_threshold=settings.VAD_ENERGY_THRESHOLD
        )
        self.processing_lock = asyncio.Lock()
        self.is_active = True
        self.active_tasks = set()

    def update_config(self, source_lang: Optional[str] = None, target_lang: Optional[str] = None, auto_detect: Optional[bool] = None):
        if source_lang:
            self.source_lang = source_lang
        if target_lang:
            self.target_lang = target_lang
        if auto_detect is not None:
            self.auto_detect = auto_detect
        self.last_activity = time.time()

    async def handle_audio_frame(self, pcm_bytes: bytes):
        """Processes an incoming PCM audio frame through VAD and translation pipeline."""
        if not self.is_active:
            return

        self.last_activity = time.time()
        is_final, speech_bytes, _energy = self.vad_processor.process_chunk(pcm_bytes)

        if is_final and speech_bytes:
            task = asyncio.create_task(self.process_final_utterance(speech_bytes))
            self.active_tasks.add(task)
            task.add_done_callback(self.active_tasks.discard)

    async def process_final_utterance(self, pcm_speech: bytes):
        """Executes full ASR -> Translation -> TTS pipeline on speech utterance."""
        async with self.processing_lock:
            self.seq_id += 1
            current_seq = self.seq_id
            utterance_id = f"{self.session_id}-{current_seq}"
            start_total = time.perf_counter()

            # 1. ASR
            asr_res = await asr_service.transcribe_pcm_audio(
                pcm_speech,
                language=self.source_lang,
                auto_detect=self.auto_detect
            )
            source_text = asr_res.get("text", "")
            asr_ms = asr_res.get("latency_ms", 0)

            # Send partial/in-progress event
            await self.send_json({
                "type": "transcript",
                "id": utterance_id,
                "seq_id": current_seq,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "source_lang": self.source_lang,
                "target_lang": self.target_lang,
                "source_text": source_text,
                "translated_text": "Translating...",
                "is_final": False,
            })

            # 2. Translation
            trans_text, trans_ms = await translation_service.translate(
                source_text,
                self.source_lang,
                self.target_lang
            )

            # 3. Text-to-Speech
            b64_audio, tts_ms, fmt = await tts_service.synthesize_speech(
                trans_text,
                language=self.target_lang,
                voice=self.voice
            )

            total_ms = int((time.perf_counter() - start_total) * 1000)

            metrics = {
                "vad_ms": settings.AUDIO_FRAME_MS,
                "asr_ms": asr_ms,
                "translation_ms": trans_ms,
                "tts_ms": tts_ms,
                "total_turnaround_ms": total_ms,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }

            # 4. Deliver finalized transcript with synchronized audio payload
            await self.send_json({
                "type": "transcript",
                "id": utterance_id,
                "seq_id": current_seq,
                "timestamp": metrics["timestamp"],
                "source_lang": self.source_lang,
                "target_lang": self.target_lang,
                "source_text": source_text,
                "translated_text": trans_text,
                "is_final": True,
                "audio_base64": b64_audio,
                "audio_format": fmt,
                "metrics": metrics,
            })

    async def process_direct_text(self, text: str, source_lang: Optional[str] = None, target_lang: Optional[str] = None):
        """Allows instant text-input testing of the MT & TTS pipeline without microphone."""
        async with self.processing_lock:
            self.seq_id += 1
            current_seq = self.seq_id
            utterance_id = f"{self.session_id}-{current_seq}"
            start_total = time.perf_counter()

            s_lang = source_lang or self.source_lang
            t_lang = target_lang or self.target_lang

            # Translate
            trans_text, trans_ms = await translation_service.translate(text, s_lang, t_lang)

            # Synthesize
            b64_audio, tts_ms, fmt = await tts_service.synthesize_speech(
                trans_text,
                language=t_lang,
                voice=self.voice
            )

            total_ms = int((time.perf_counter() - start_total) * 1000)
            metrics = {
                "vad_ms": 0,
                "asr_ms": 0,
                "translation_ms": trans_ms,
                "tts_ms": tts_ms,
                "total_turnaround_ms": total_ms,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }

            await self.send_json({
                "type": "transcript",
                "id": utterance_id,
                "seq_id": current_seq,
                "timestamp": metrics["timestamp"],
                "source_lang": s_lang,
                "target_lang": t_lang,
                "source_text": text,
                "translated_text": trans_text,
                "is_final": True,
                "audio_base64": b64_audio,
                "audio_format": fmt,
                "metrics": metrics,
            })

    async def send_json(self, data: dict):
        if self.is_active:
            try:
                await self.websocket.send_json(data)
            except Exception as e:
                print(f"[Session {self.session_id}] WebSocket send failed: {e}")
                self.is_active = False

    def close(self):
        self.is_active = False
        for task in self.active_tasks:
            task.cancel()
        self.active_tasks.clear()


class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, TranslationSession] = {}
        self.lock = asyncio.Lock()

    async def create_session(
        self,
        websocket: WebSocket,
        source_lang: str = "te",
        target_lang: str = "en",
        auto_detect: bool = False,
        provider: str = "local_edge",
        voice: Optional[str] = None
    ) -> TranslationSession:
        async with self.lock:
            # Enforce max concurrent sessions limit
            if len(self.sessions) >= settings.MAX_CONCURRENT_SESSIONS:
                # Remove oldest inactive session
                oldest_id = min(self.sessions, key=lambda k: self.sessions[k].last_activity)
                self.remove_session(oldest_id)

            session_id = str(uuid.uuid4())
            session = TranslationSession(
                session_id=session_id,
                websocket=websocket,
                source_lang=source_lang,
                target_lang=target_lang,
                auto_detect=auto_detect,
                provider=provider,
                voice=voice
            )
            self.sessions[session_id] = session
            return session

    def get_session(self, session_id: str) -> Optional[TranslationSession]:
        return self.sessions.get(session_id)

    def remove_session(self, session_id: str):
        if session_id in self.sessions:
            session = self.sessions.pop(session_id)
            session.close()

    def get_active_count(self) -> int:
        return len(self.sessions)

session_manager = SessionManager()
