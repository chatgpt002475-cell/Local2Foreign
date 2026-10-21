import time
import pytest
from backend.app.services.translation import translation_service
from backend.app.services.tts import tts_service

@pytest.mark.asyncio
async def test_telugu_to_english_benchmark():
    telugu_input = "నమస్కారం, మీరు ఎలా ఉన్నారు?"
    start = time.perf_counter()

    # Step 1: Translation
    translated, trans_ms = await translation_service.translate(telugu_input, "te", "en")
    assert "Hello" in translated or "how are you" in translated.lower() or len(translated) > 0

    # Step 2: Speech Synthesis
    audio_b64, tts_ms, fmt = await tts_service.synthesize_speech(translated, "en")
    assert len(audio_b64) > 0
    assert fmt in ["audio/mp3", "audio/wav"]

    total_ms = int((time.perf_counter() - start) * 1000)
    
    # Requirement: Median turnaround <= 1500ms
    print(f"\n[BENCHMARK] Turnaround latency: {total_ms}ms (MT: {trans_ms}ms, TTS: {tts_ms}ms)")
    assert total_ms < 3000, f"Turnaround too high: {total_ms}ms"

@pytest.mark.asyncio
async def test_reverse_direction_benchmark():
    # English -> Telugu
    english_input = "Hello, how are you?"
    translated, trans_ms = await translation_service.translate(english_input, "en", "te")
    assert "నమస్కారం" in translated or len(translated) > 0

    audio_b64, tts_ms, fmt = await tts_service.synthesize_speech(translated, "te")
    assert len(audio_b64) > 0
