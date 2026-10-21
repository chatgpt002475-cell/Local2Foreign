"""
LiveVoice AI - Streaming Session & Broadcast Room Manager
Supports 1:1 translation as well as 1:Many Speaker-to-Listeners live broadcast rooms.
"""

import time
import asyncio
import uuid
from typing import Dict, List, Optional, Set
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
        role: str = "speaker",  # "speaker" or "listener"
        room_id: Optional[str] = None,
        source_lang: str = "te",
        target_lang: str = "en",
        auto_detect: bool = False,
        provider: str = "local_edge",
        voice: Optional[str] = None,
        pitch: str = "+0Hz",
        rate: str = "+0%"
    ):
        self.session_id = session_id
        self.websocket = websocket
        self.role = role
        self.room_id = room_id
        self.source_lang = source_lang
        self.target_lang = target_lang
        self.auto_detect = auto_detect
        self.provider = provider
        self.voice = voice
        self.pitch = pitch
        self.rate = rate
        self.last_speech_time = 0

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

    def update_config(
        self,
        source_lang: Optional[str] = None,
        target_lang: Optional[str] = None,
        auto_detect: Optional[bool] = None,
        voice: Optional[str] = None,
        pitch: Optional[str] = None,
        rate: Optional[str] = None
    ):
        if source_lang:
            self.source_lang = source_lang
        if target_lang:
            self.target_lang = target_lang
        if auto_detect is not None:
            self.auto_detect = auto_detect
        if voice:
            self.voice = voice
        if pitch:
            self.pitch = pitch
        if rate:
            self.rate = rate
        self.last_activity = time.time()

    async def handle_audio_frame(self, pcm_bytes: bytes):
        """Processes an incoming PCM audio frame through VAD and translation pipeline."""
        if not self.is_active or self.role != "speaker":
            return

        self.last_activity = time.time()

        # If speech recognition events are actively driving transcripts, ignore redundant PCM VAD
        if time.time() - getattr(self, "last_speech_time", 0) < 3.5:
            return

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
            source_text = asr_res.get("text", "").strip()
            # If silence / no speech detected: stay silent and hold!
            if not source_text:
                return

            asr_ms = asr_res.get("latency_ms", 0)

            # Send partial/in-progress event to speaker
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

            # 2. Translate for Speaker's own preview
            trans_text, trans_ms = await translation_service.translate(
                source_text,
                self.source_lang,
                self.target_lang
            )

            # 3. Text-to-Speech for Speaker (if 1:1 mode)
            b64_audio = None
            tts_ms = 0
            fmt = "audio/mp3"
            if not self.room_id:
                b64_audio, tts_ms, fmt = await tts_service.synthesize_speech(
                    trans_text,
                    language=self.target_lang,
                    voice=self.voice,
                    rate=self.rate,
                    pitch=self.pitch
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

            # 4. Deliver finalized transcript to Speaker
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

            # 5. If Speaker is in a broadcast room, broadcast to all listeners
            if self.room_id:
                await session_manager.broadcast_to_listeners(
                    room_id=self.room_id,
                    seq_id=current_seq,
                    source_text=source_text,
                    source_lang=self.source_lang,
                    speaker_id=self.session_id
                )

    async def process_direct_text(self, text: str, source_lang: Optional[str] = None, target_lang: Optional[str] = None):
        """Allows instant speech/text input processing of the MT & TTS pipeline without delay."""
        clean_text = text.strip() if text else ""
        if not clean_text:
            return

        self.last_speech_time = time.time()

        async with self.processing_lock:
            self.seq_id += 1
            current_seq = self.seq_id
            utterance_id = f"{self.session_id}-{current_seq}"
            start_total = time.perf_counter()

            s_lang = source_lang or self.source_lang
            t_lang = target_lang or self.target_lang

            # Fast neural translation for speaker preview
            trans_text, trans_ms = await translation_service.translate(clean_text, s_lang, t_lang)

            b64_audio = None
            tts_ms = 0
            fmt = "audio/mp3"

            # In a broadcast room, speaker is speaking into mic and does NOT need local TTS echo.
            # Only synthesize speaker audio in 1:1 personal mode.
            if not self.room_id:
                b64_audio, tts_ms, fmt = await tts_service.synthesize_speech(
                    trans_text,
                    language=t_lang,
                    voice=self.voice,
                    rate=self.rate,
                    pitch=self.pitch
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
                "source_text": clean_text,
                "translated_text": trans_text,
                "is_final": True,
                "audio_base64": b64_audio,
                "audio_format": fmt,
                "metrics": metrics,
            })

            # Broadcast concurrently to audience in parallel
            if self.room_id:
                asyncio.create_task(
                    session_manager.broadcast_to_listeners(
                        room_id=self.room_id,
                        seq_id=current_seq,
                        source_text=clean_text,
                        source_lang=s_lang,
                        speaker_id=self.session_id
                    )
                )

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


class Room:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.speakers: Set[TranslationSession] = set()
        self.listeners: Set[TranslationSession] = set()
        self.created_at = time.time()

    def add_speaker(self, session: TranslationSession):
        self.speakers.add(session)

    def remove_speaker(self, session: TranslationSession):
        self.speakers.discard(session)

    def add_listener(self, session: TranslationSession):
        self.listeners.add(session)

    def remove_listener(self, session: TranslationSession):
        self.listeners.discard(session)

    @property
    def is_empty(self) -> bool:
        return len(self.speakers) == 0 and len(self.listeners) == 0


class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, TranslationSession] = {}
        self.rooms: Dict[str, Room] = {}
        self.lock = asyncio.Lock()

    async def create_session(
        self,
        websocket: WebSocket,
        role: str = "speaker",
        room_id: Optional[str] = None,
        source_lang: str = "te",
        target_lang: str = "en",
        auto_detect: bool = False,
        provider: str = "local_edge",
        voice: Optional[str] = None,
        pitch: str = "+0Hz",
        rate: str = "+0%"
    ) -> TranslationSession:
        async with self.lock:
            # Enforce max concurrent sessions limit
            if len(self.sessions) >= settings.MAX_CONCURRENT_SESSIONS:
                oldest_id = min(self.sessions, key=lambda k: self.sessions[k].last_activity)
                self.remove_session(oldest_id)

            session_id = str(uuid.uuid4())
            session = TranslationSession(
                session_id=session_id,
                websocket=websocket,
                role=role,
                room_id=room_id,
                source_lang=source_lang,
                target_lang=target_lang,
                auto_detect=auto_detect,
                provider=provider,
                voice=voice,
                pitch=pitch,
                rate=rate
            )
            self.sessions[session_id] = session

            # Join room if specified
            if room_id:
                if room_id not in self.rooms:
                    self.rooms[room_id] = Room(room_id)
                room = self.rooms[room_id]
                if role == "speaker":
                    room.add_speaker(session)
                else:
                    room.add_listener(session)

                # Notify room participants of new count
                asyncio.create_task(self.notify_room_stats(room_id))

            return session

    def get_session(self, session_id: str) -> Optional[TranslationSession]:
        return self.sessions.get(session_id)

    def remove_session(self, session_id: str):
        if session_id in self.sessions:
            session = self.sessions.pop(session_id)
            room_id = session.room_id
            if room_id and room_id in self.rooms:
                room = self.rooms[room_id]
                if session.role == "speaker":
                    room.remove_speaker(session)
                else:
                    room.remove_listener(session)
                if room.is_empty:
                    self.rooms.pop(room_id, None)
                else:
                    asyncio.create_task(self.notify_room_stats(room_id))
            session.close()

    async def notify_room_stats(self, room_id: str):
        """Sends real-time listener count and language breakdown to room speakers and listeners."""
        room = self.rooms.get(room_id)
        if not room:
            return

        listener_langs = [l.target_lang for l in room.listeners if l.is_active]
        stats = {
            "type": "room_stats",
            "room_id": room_id,
            "speaker_online": len(room.speakers) > 0,
            "listener_count": len(room.listeners),
            "listener_languages": listener_langs,
        }

        # Send to all participants in this room
        for s in list(room.speakers):
            if s.is_active:
                await s.send_json(stats)
        for l in list(room.listeners):
            if l.is_active:
                await l.send_json(stats)

    async def broadcast_to_listeners(
        self,
        room_id: str,
        seq_id: int,
        source_text: str,
        source_lang: str,
        speaker_id: str
    ):
        """
        Translates and synthesizes speaker's speech for all connected listeners
        according to each listener's individual chosen target language!
        Caches translation & TTS per target language to minimize redundant computation.
        """
        room = self.rooms.get(room_id)
        if not room or len(room.listeners) == 0:
            return

        # Group active listeners by their target language
        listeners_by_lang: Dict[str, List[TranslationSession]] = {}
        for listener in list(room.listeners):
            if listener.is_active:
                t_lang = listener.target_lang or "en"
                listeners_by_lang.setdefault(t_lang, []).append(listener)

        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # Concurrently generate translation & neural speech for all listener target languages in parallel
        async def _deliver_language(t_lang: str, listeners_group: List[TranslationSession]):
            start_t = time.perf_counter()
            t_text, t_ms = await translation_service.translate(
                source_text,
                source_lang,
                t_lang
            )

            b64, t_tts_ms, f_fmt = await tts_service.synthesize_speech(
                t_text,
                language=t_lang,
                voice=listeners_group[0].voice if listeners_group else None,
                rate=listeners_group[0].rate if listeners_group else "+0%",
                pitch=listeners_group[0].pitch if listeners_group else "+0Hz"
            )

            total_ms = int((time.perf_counter() - start_t) * 1000)

            payload = {
                "type": "transcript",
                "id": f"room-{room_id}-{seq_id}-{t_lang}",
                "seq_id": seq_id,
                "timestamp": timestamp,
                "source_lang": source_lang,
                "target_lang": t_lang,
                "source_text": source_text,
                "translated_text": t_text,
                "is_final": True,
                "audio_base64": b64,
                "audio_format": f_fmt,
                "metrics": {
                    "translation_ms": t_ms,
                    "tts_ms": t_tts_ms,
                    "total_turnaround_ms": total_ms,
                }
            }

            for listener in listeners_group:
                await listener.send_json(payload)

        await asyncio.gather(*[_deliver_language(tl, lg) for tl, lg in listeners_by_lang.items()])

    async def broadcast_reaction(self, room_id: str, emoji: str, sender_name: str = "Listener"):
        """Broadcasts audience reaction/hand-raise to speakers in the room."""
        room = self.rooms.get(room_id)
        if not room:
            return

        reaction_msg = {
            "type": "listener_reaction",
            "emoji": emoji,
            "sender_name": sender_name,
            "timestamp": time.strftime("%H:%M:%S", time.localtime()),
        }

        for speaker in list(room.speakers):
            if speaker.is_active:
                await speaker.send_json(reaction_msg)

    def get_active_count(self) -> int:
        return len(self.sessions)

session_manager = SessionManager()
