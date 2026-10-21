import React, { useState, useEffect } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { LiveTranslator } from './components/LiveTranslator';
import { LanguagePacks } from './components/LanguagePacks';
import { TestingDiagnostics } from './components/TestingDiagnostics';
import { SettingsView } from './components/SettingsView';
import { LanguageCapability, AppSettings } from './types';
import { fetchLanguages, fetchSettings } from './services/api';
import { AlertTriangle, RotateCw } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('translator');
  const [languages, setLanguages] = useState<LanguageCapability[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    local_only_mode: false,
    ai_provider: 'local_edge',
    default_source_lang: 'te',
    default_target_lang: 'en',
    voice_speed: 1.0,
    voice_pitch: 1.0,
    audio_chunk_ms: 85,
    vad_silence_threshold_ms: 650,
    vad_energy_threshold: 250,
    session_timeout_minutes: 60,
    allow_telemetry: false,
    save_transcripts_locally: false,
  });

  const [sourceLang, setSourceLang] = useState('te'); // Telugu default
  const [targetLang, setTargetLang] = useState('en'); // English default
  const [autoDetect, setAutoDetect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadInitialData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [langs, cfg] = await Promise.all([
        fetchLanguages(),
        fetchSettings().catch(() => null),
      ]);
      setLanguages(langs);
      if (cfg) {
        setSettings(cfg);
        if (cfg.default_source_lang) setSourceLang(cfg.default_source_lang);
        if (cfg.default_target_lang) setTargetLang(cfg.default_target_lang);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setLoadError(
        'Backend server connection pending. Please ensure the backend server is running on http://localhost:8000.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectLanguageForTranslation = (code: string) => {
    setSourceLang(code);
    setCurrentTab('translator');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white">
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        connectionStatus={loadError ? 'error' : 'connected'}
        isRecording={false}
        sessionDuration={0}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <RotateCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">
              Initializing LiveVoice AI language engines...
            </p>
          </div>
        ) : loadError ? (
          <div className="max-w-xl mx-auto p-6 bg-red-950/40 border border-red-800/60 rounded-2xl text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
            <div>
              <h3 className="text-base font-semibold text-white">Connection Error</h3>
              <p className="text-xs text-red-300 mt-1">{loadError}</p>
            </div>
            <button
              onClick={loadInitialData}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {currentTab === 'translator' && (
              <LiveTranslator
                languages={languages}
                sourceLang={sourceLang}
                targetLang={targetLang}
                onSourceLangChange={setSourceLang}
                onTargetLangChange={setTargetLang}
                autoDetect={autoDetect}
                onAutoDetectToggle={() => setAutoDetect(!autoDetect)}
                provider={settings.ai_provider}
              />
            )}

            {currentTab === 'languages' && (
              <LanguagePacks
                languages={languages}
                onSelectForTranslation={handleSelectLanguageForTranslation}
              />
            )}

            {currentTab === 'diagnostics' && (
              <TestingDiagnostics
                languages={languages}
                connectionStatus={loadError ? 'disconnected' : 'connected'}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                settings={settings}
                languages={languages}
                onSettingsUpdated={setSettings}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        <p>
          LiveVoice AI &bull; Real-Time Voice Translation Platform &bull; Supporting 20 Languages &bull; Zero Audio Storage Policy
        </p>
      </footer>
    </div>
  );
};
