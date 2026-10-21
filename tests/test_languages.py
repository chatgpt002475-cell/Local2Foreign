import pytest
from backend.app.languages.registry import (
    LANGUAGE_PACKS,
    get_all_languages,
    get_language,
    validate_language_pair,
)

EXPECTED_LANGUAGES = [
    "en", "te", "hi", "ta", "kn", "ml", "bn", "mr", "gu", "pa",
    "ur", "es", "fr", "de", "pt", "it", "ja", "ko", "zh", "ar"
]

def test_registry_contains_all_20_languages():
    langs = get_all_languages()
    assert len(langs) == 20, f"Expected 20 languages, found {len(langs)}"
    codes = [l.code for l in langs]
    for code in EXPECTED_LANGUAGES:
        assert code in codes, f"Language {code} missing from registry"

def test_language_details_and_voices():
    # Test Telugu specifically
    te = get_language("te")
    assert te is not None
    assert te.name == "Telugu"
    assert te.native_name == "తెలుగు"
    assert te.asr_supported is True
    assert te.translation_supported is True
    assert te.tts_supported is True
    assert "te-IN-MohanNeural" in te.available_voices
    assert len(te.sample_phrases) > 0

    # Test English specifically
    en = get_language("en")
    assert en is not None
    assert en.name == "English"
    assert en.default_voice == "en-US-AriaNeural"

def test_validate_language_pairs():
    # Valid pair
    valid, msg = validate_language_pair("te", "en")
    assert valid is True

    # Same language pair
    valid, msg = validate_language_pair("te", "te")
    assert valid is True

    # Invalid source
    valid, msg = validate_language_pair("invalid_lang", "en")
    assert valid is False
    assert "invalid_lang" in msg

    # Invalid target
    valid, msg = validate_language_pair("te", "nonexistent")
    assert valid is False
    assert "nonexistent" in msg
