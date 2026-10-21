import { LanguageCapability, AppSettings, DiagnosticsHealth } from '../types';

const API_BASE = '/api';

export async function fetchLanguages(): Promise<LanguageCapability[]> {
  const res = await fetch(`${API_BASE}/languages`);
  if (!res.ok) throw new Error(`Failed to fetch languages: ${res.statusText}`);
  return res.json();
}

export async function testLanguage(code: string, phrase?: string): Promise<{
  success: boolean;
  source_text: string;
  translated_text: string;
  target_lang: string;
  audio_url?: string;
  audio_base64?: string;
  asr_ms: number;
  translation_ms: number;
  tts_ms: number;
  total_ms: number;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/languages/${code}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phrase }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Test failed');
  }
  return res.json();
}

export async function fetchDiagnostics(): Promise<DiagnosticsHealth> {
  const res = await fetch(`${API_BASE}/diagnostics/health`);
  if (!res.ok) throw new Error(`Diagnostics failed: ${res.statusText}`);
  return res.json();
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error(`Failed to load settings: ${res.statusText}`);
  return res.json();
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`Failed to save settings: ${res.statusText}`);
  return res.json();
}

export async function translateTextDirect(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{
  source_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  audio_base64?: string;
  latency_ms: number;
}> {
  const res = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      source_lang: sourceLang,
      target_lang: targetLang,
      synthesize_audio: true,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Translation failed');
  }
  return res.json();
}
