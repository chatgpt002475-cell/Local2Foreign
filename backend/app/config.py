import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "LiveVoice AI"
    APP_VERSION: str = "1.0.0"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # AI Engine & Provider configuration
    # Options: 'local_edge' (Edge Neural TTS + Fast Offline ASR/Translators), 'openai', 'mock_test'
    AI_PROVIDER: str = "local_edge"
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    LOCAL_ONLY_MODE: bool = False
    
    # Audio Pipeline defaults
    AUDIO_SAMPLE_RATE: int = 16000
    AUDIO_CHANNELS: int = 1
    VAD_SILENCE_THRESHOLD_MS: int = 650
    VAD_ENERGY_THRESHOLD: int = 250
    AUDIO_FRAME_MS: int = 85
    MAX_PHRASE_DURATION_SEC: int = 15
    
    # Languages default
    DEFAULT_SOURCE_LANG: str = "te"
    DEFAULT_TARGET_LANG: str = "en"
    
    # Session & Security
    SESSION_TIMEOUT_MINUTES: int = 60
    MAX_CONCURRENT_SESSIONS: int = 30
    PERSIST_AUDIO_BY_DEFAULT: bool = False
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]

settings = Settings()
