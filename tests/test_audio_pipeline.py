import math
import struct
import pytest
from backend.app.services.audio import AudioVADProcessor

def generate_pcm_sine(frequency: float = 440.0, duration_sec: float = 0.1, sample_rate: int = 16000, amplitude: float = 10000.0) -> bytes:
    total_samples = int(sample_rate * duration_sec)
    raw = bytearray()
    for i in range(total_samples):
        val = int(amplitude * math.sin(2 * math.pi * frequency * (i / sample_rate)))
        raw.extend(struct.pack("<h", val))
    return bytes(raw)

def test_vad_silence_detection():
    vad = AudioVADProcessor(sample_rate=16000, silence_threshold_ms=500, energy_threshold=300)
    
    # 1. Provide silence
    silence = b"\x00\x00" * 1600  # 100ms silence
    is_final, speech, energy = vad.process_chunk(silence)
    assert is_final is False
    assert speech is None
    assert energy == 0.0

def test_vad_speech_onset_and_finalization():
    vad = AudioVADProcessor(sample_rate=16000, silence_threshold_ms=300, energy_threshold=300)
    
    # 2. Provide speech tone (100ms with high energy)
    tone = generate_pcm_sine(duration_sec=0.1, amplitude=5000.0)
    is_final, speech, energy = vad.process_chunk(tone)
    assert is_final is False
    assert energy > 300
    assert vad.is_speech_active is True

    # 3. Provide 400ms silence (exceeds 300ms threshold)
    silence_400ms = b"\x00\x00" * int(16000 * 0.4)
    is_final, speech, energy = vad.process_chunk(silence_400ms)
    assert is_final is True
    assert speech is not None
    assert len(speech) > 0
    assert vad.is_speech_active is False
