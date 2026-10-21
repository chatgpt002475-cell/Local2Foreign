export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | string;
  region: string;
  accent_label: string;
}

export interface CustomVoiceProfile {
  detected_f0_hz: number;
  detected_gender: 'Male' | 'Female' | string;
  suggested_base_voice: string;
  suggested_base_voice_name: string;
  suggested_pitch: string;
  suggested_rate: string;
  duration_seconds: number;
  preview_audio_base64?: string;
  notes: string;
}

export interface LanguageCapability {
  code: string;
  name: string;
  native_name: string;
  asr_supported: boolean;
  translation_supported: boolean;
  tts_supported: boolean;
  default_voice: string;
  available_voices: string[];
  voices?: VoiceOption[];
  local_model_downloaded: boolean;
  model_size_mb: number;
  model_version: string;
  status: 'ready' | 'downloading' | 'needs_download' | 'degraded' | 'unsupported';
  notes: string;
  sample_phrases: {
    native: string;
    english: string;
    phonetic?: string;
  }[];
}

export interface AudioLatencyMetrics {
  vad_ms: number;
  asr_ms: number;
  translation_ms: number;
  tts_ms: number;
  total_turnaround_ms: number;
  timestamp: string;
}

export interface TranscriptItem {
  id: string;
  seq_id: number;
  timestamp: string;
  source_lang: string;
  target_lang: string;
  source_text: string;
  translated_text: string;
  is_final: boolean;
  audio_url?: string;
  audio_base64?: string;
  metrics?: AudioLatencyMetrics;
  error?: string;
}

export interface AppSettings {
  local_only_mode: boolean;
  ai_provider: 'local_edge' | 'openai' | 'mock_test';
  openai_api_key?: string;
  default_source_lang: string;
  default_target_lang: string;
  voice_speed: number;
  voice_pitch: number;
  audio_chunk_ms: number;
  vad_silence_threshold_ms: number;
  vad_energy_threshold: number;
  session_timeout_minutes: number;
  allow_telemetry: boolean;
  save_transcripts_locally: boolean;
}

export interface DiagnosticsHealth {
  status: string;
  uptime_seconds: number;
  backend_version: string;
  active_sessions: number;
  cpu_percent: number;
  memory_percent: number;
  models_loaded: string[];
  supported_languages_count: number;
}
