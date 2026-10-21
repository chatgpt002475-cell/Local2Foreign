import React, { useState } from 'react';
import { LanguageCapability } from '../types';
import { testLanguage } from '../services/api';
import { globalAudioPlayer } from '../services/audioPlayer';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

interface LanguagePacksProps {
  languages: LanguageCapability[];
  onSelectForTranslation: (code: string) => void;
}

export const LanguagePacks: React.FC<LanguagePacksProps> = ({
  languages,
  onSelectForTranslation,
}) => {
  const [testingCode, setTestingCode] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<
      string,
      {
        success: boolean;
        source_text: string;
        translated_text: string;
        total_ms: number;
        audio_base64?: string;
        error?: string;
      }
    >
  >({});
  const [filterText, setFilterText] = useState('');

  const handleRunTest = async (lang: LanguageCapability) => {
    setTestingCode(lang.code);
    try {
      const phrase = lang.sample_phrases[0]?.native || 'Hello';
      const result = await testLanguage(lang.code, phrase);
      setTestResults((prev) => ({
        ...prev,
        [lang.code]: {
          success: result.success,
          source_text: result.source_text,
          translated_text: result.translated_text,
          total_ms: result.total_ms,
          audio_base64: result.audio_base64,
        },
      }));

      // Play audio if generated
      if (result.audio_base64) {
        globalAudioPlayer.playImmediately(result.audio_base64).catch(console.error);
      }
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [lang.code]: {
          success: false,
          source_text: '',
          translated_text: '',
          total_ms: 0,
          error: err instanceof Error ? err.message : 'Test failed',
        },
      }));
    } finally {
      setTestingCode(null);
    }
  };

  const filtered = languages.filter(
    (l) =>
      l.name.toLowerCase().includes(filterText.toLowerCase()) ||
      l.native_name.toLowerCase().includes(filterText.toLowerCase()) ||
      l.code.toLowerCase().includes(filterText.toLowerCase())
  );

  const totalStorageMB = languages.reduce((acc, l) => acc + (l.local_model_downloaded ? l.model_size_mb : 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Language Packs Registry</span>
              <span className="text-xs bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-800 font-mono">
                {languages.length} Languages
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Independent capability verification across Speech Recognition (ASR), Machine Translation (MT), and Neural TTS.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-slate-400 block text-[10px]">VERIFIED STORAGE</span>
                <span className="font-mono text-slate-200 font-semibold">{totalStorageMB} MB</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-slate-400 block text-[10px]">ACTIVE ENGINES</span>
                <span className="font-mono text-slate-200 font-semibold">Edge Neural + Whisper</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter input */}
        <div className="mt-4">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search language by English name, native script, or ISO code..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Language Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((lang) => {
          const result = testTestResult(testResults[lang.code]);
          const isTesting = testingCode === lang.code;

          return (
            <div
              key={lang.code}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">{lang.name}</h3>
                      <span className="font-mono text-xs text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-900/60 uppercase">
                        {lang.code}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{lang.native_name}</span>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      lang.status === 'ready'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : lang.status === 'degraded'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        : 'bg-red-950 text-red-400 border border-red-800/60'
                    }`}
                  >
                    {lang.status}
                  </span>
                </div>

                {/* Capabilities matrix */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-center mb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">ASR</span>
                    {lang.asr_supported ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Translation</span>
                    {lang.translation_supported ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">TTS Voice</span>
                    {lang.tts_supported ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                    )}
                  </div>
                </div>

                {/* Model Details */}
                <div className="text-xs text-slate-400 space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span>Default Voice:</span>
                    <span className="text-slate-200 font-mono text-[11px] truncate max-w-[170px]" title={lang.default_voice}>
                      {lang.default_voice}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Local Model Size:</span>
                    <span className="text-slate-300 font-mono">{lang.model_size_mb} MB (v{lang.model_version})</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 italic line-clamp-2 mb-3">{lang.notes}</p>
              </div>

              {/* Test Result box if tested */}
              {result && (
                <div
                  className={`p-3 rounded-xl border text-xs mb-3 ${
                    result.success
                      ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                      : 'bg-red-950/30 border-red-800/40 text-red-200'
                  }`}
                >
                  {result.success ? (
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-emerald-400 mb-1">
                        <span className="font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                        <span>{result.total_ms}ms</span>
                      </div>
                      <p className="text-slate-300 truncate">"{result.source_text}"</p>
                      <p className="text-white font-medium truncate mt-0.5">&rarr; "{result.translated_text}"</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-400">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{result.error}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  disabled={isTesting}
                  onClick={() => handleRunTest(lang)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-all"
                >
                  {isTesting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Verify Pipeline</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onSelectForTranslation(lang.code)}
                  title="Select for Live Translation"
                  className="py-2 px-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-xs font-medium text-white transition-all flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  <span>Translate</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function testTestResult(item: unknown) {
  if (!item) return null;
  return item as {
    success: boolean;
    source_text: string;
    translated_text: string;
    total_ms: number;
    audio_base64?: string;
    error?: string;
  };
}
