import React, { useState } from 'react';
import { AppSettings, LanguageCapability } from '../types';
import { saveSettings } from '../services/api';
import {
  Settings,
  Shield,
  Sliders,
  Server,
  Save,
  CheckCircle2,
  Lock,
  Cpu,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  languages: LanguageCapability[];
  onSettingsUpdated: (newSettings: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings: initialSettings,
  languages,
  onSettingsUpdated,
}) => {
  const [formState, setFormState] = useState<AppSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const updated = await saveSettings(formState);
      onSettingsUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>Application Settings</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure local AI engines, voice synthesis speed, audio buffer thresholds, and privacy policies.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
        >
          {savedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </>
          )}
        </button>
      </div>

      {/* Group 1: AI Provider & Mode */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>AI Inference Engine & Mode</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Engine Provider</label>
            <select
              value={formState.ai_provider}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  ai_provider: e.target.value as AppSettings['ai_provider'],
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="local_edge">Microsoft Edge Neural TTS + Local ASR (Recommended)</option>
              <option value="openai">OpenAI Whisper + GPT-4o-mini (Cloud API)</option>
              <option value="mock_test">Mock AI Adapter (Offline testing)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Local-Only Mode</label>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="local_only_mode"
                checked={formState.local_only_mode}
                onChange={(e) =>
                  setFormState({ ...formState, local_only_mode: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 rounded"
              />
              <label htmlFor="local_only_mode" className="text-xs text-slate-300">
                Disallow external outbound API requests (Strict Offline)
              </label>
            </div>
          </div>
        </div>

        {formState.ai_provider === 'openai' && (
          <div className="space-y-1.5 pt-2">
            <label className="text-xs text-slate-400 font-medium">OpenAI API Key</label>
            <input
              type="password"
              value={formState.openai_api_key || ''}
              onChange={(e) =>
                setFormState({ ...formState, openai_api_key: e.target.value })
              }
              placeholder="sk-..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
            />
          </div>
        )}
      </div>

      {/* Group 2: Audio & VAD Settings */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Audio Pipeline & Voice Activity Detection (VAD)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">
              VAD Silence Threshold ({formState.vad_silence_threshold_ms}ms)
            </label>
            <input
              type="range"
              min="300"
              max="1500"
              step="50"
              value={formState.vad_silence_threshold_ms}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  vad_silence_threshold_ms: Number(e.target.value),
                })
              }
              className="w-full accent-indigo-500"
            />
            <span className="text-[11px] text-slate-500 block">
              Pause duration before finalizing phrase
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">
              Speech Speed ({formState.voice_speed}x)
            </label>
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.05"
              value={formState.voice_speed}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  voice_speed: Number(e.target.value),
                })
              }
              className="w-full accent-indigo-500"
            />
            <span className="text-[11px] text-slate-500 block">TTS speech rate multiplier</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">
              Session Timeout ({formState.session_timeout_minutes} min)
            </label>
            <input
              type="number"
              min="5"
              max="240"
              value={formState.session_timeout_minutes}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  session_timeout_minutes: Number(e.target.value),
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Group 3: Default Language Pairs */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
          <Settings className="w-4 h-4 text-indigo-400" />
          <span>Default Language Pairs</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Default Source</label>
            <select
              value={formState.default_source_lang}
              onChange={(e) =>
                setFormState({ ...formState, default_source_lang: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.native_name})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Default Target</label>
            <select
              value={formState.default_target_lang}
              onChange={(e) =>
                setFormState({ ...formState, default_target_lang: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.native_name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Group 4: Privacy & Retention */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Privacy & Data Protection Policy</span>
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="save_transcripts"
              checked={formState.save_transcripts_locally}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  save_transcripts_locally: e.target.checked,
                })
              }
              className="w-4 h-4 mt-0.5 accent-indigo-600 rounded"
            />
            <div>
              <label htmlFor="save_transcripts" className="text-xs font-medium text-slate-200">
                Save session transcripts locally in memory
              </label>
              <p className="text-[11px] text-slate-400">
                When unchecked, transcripts are cleared as soon as you finish your session.
              </p>
            </div>
          </div>

          <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              <strong>Zero-storage guarantee:</strong> Raw microphone audio is never written to disk. Audio frames are processed strictly in RAM and immediately discarded.
            </span>
          </div>
        </div>
      </div>

      {/* Production Deployment Architecture Info */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
          <Server className="w-4 h-4 text-indigo-400" />
          <span>Production Hosting & Reverse Proxy</span>
        </h3>

        <p className="text-xs text-slate-400 leading-relaxed">
          In production, LiveVoice AI is served behind an NGINX reverse proxy with automatic TLS termination:
        </p>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
          <div>Frontend: https://your-domain.com (Port 443)</div>
          <div>Backend API: https://your-domain.com/api</div>
          <div>Streaming WebSocket: wss://your-domain.com/ws/translate</div>
        </div>
      </div>
    </form>
  );
};
