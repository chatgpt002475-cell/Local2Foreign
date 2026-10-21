"""
LiveVoice AI - Audio Processing & Voice Activity Detection (VAD)
Handles 16kHz mono PCM frames, RMS energy calculation, and silence-boundary detection.
"""

import math
import struct
from typing import Optional, Tuple

class AudioVADProcessor:
    def __init__(
        self,
        sample_rate: int = 16000,
        silence_threshold_ms: int = 650,
        energy_threshold: int = 250,
        frame_duration_ms: int = 85
    ):
        self.sample_rate = sample_rate
        self.silence_threshold_ms = silence_threshold_ms
        self.energy_threshold = energy_threshold
        self.frame_duration_ms = frame_duration_ms
        
        self.bytes_per_sample = 2  # 16-bit PCM
        self.buffer = bytearray()
        self.is_speech_active = False
        self.silence_accumulated_ms = 0
        self.speech_frames = bytearray()
        self.total_speech_duration_ms = 0

    def compute_frame_rms(self, pcm_bytes: bytes) -> float:
        """Calculates Root Mean Square (RMS) energy of 16-bit PCM frame."""
        if not pcm_bytes or len(pcm_bytes) < 2:
            return 0.0
        
        count = len(pcm_bytes) // 2
        shorts = struct.unpack(f"<{count}h", pcm_bytes[:count * 2])
        sum_squares = sum(s * s for s in shorts)
        return math.sqrt(sum_squares / count)

    def process_chunk(self, raw_bytes: bytes) -> Tuple[bool, Optional[bytes], float]:
        """
        Processes an incoming PCM audio chunk.
        Returns:
            (is_final, finalized_speech_bytes, current_energy)
        """
        energy = self.compute_frame_rms(raw_bytes)
        frame_ms = (len(raw_bytes) / (self.sample_rate * self.bytes_per_sample)) * 1000
        
        # Check if current frame exceeds threshold
        is_current_speech = energy >= self.energy_threshold
        
        if is_current_speech:
            self.is_speech_active = True
            self.silence_accumulated_ms = 0
            self.speech_frames.extend(raw_bytes)
            self.total_speech_duration_ms += frame_ms
            return False, None, energy
        else:
            if self.is_speech_active:
                # In speech, now encountering silence
                self.speech_frames.extend(raw_bytes)
                self.silence_accumulated_ms += frame_ms
                
                # Check if silence exceeded pause threshold
                if self.silence_accumulated_ms >= self.silence_threshold_ms:
                    # Finalize utterance
                    finalized = bytes(self.speech_frames)
                    self.reset_state()
                    return True, finalized, energy
            return False, None, energy

    def force_finalize(self) -> Optional[bytes]:
        """Forces finalization of any pending buffered speech."""
        if len(self.speech_frames) > 0 and self.is_speech_active:
            finalized = bytes(self.speech_frames)
            self.reset_state()
            return finalized
        self.reset_state()
        return None

    def reset_state(self):
        self.is_speech_active = False
        self.silence_accumulated_ms = 0
        self.speech_frames.clear()
        self.total_speech_duration_ms = 0
