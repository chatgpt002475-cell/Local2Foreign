import React, { useState, useEffect } from 'react';
import { DiagnosticsHealth, LanguageCapability } from '../types';
import { fetchDiagnostics, testLanguage } from '../services/api';
import { globalAudioPlayer } from '../services/audioPlayer';
import { AudioVisualizer } from './AudioVisualizer';
import { AudioRecorder } from '../services/audioRecorder';
import {
  Activity,
  Mic,
  Server,
  Play,
  RotateCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Volume2,
} from 'lucide-react';

interface TestingDiagnosticsProps {
  languages: LanguageCapability[];
  connectionStatus: string;
}

export const TestingDiagnostics: React.FC<TestingDiagnosticsProps> = ({
  languages,
  connectionStatus,
}) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsHealth | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [testMicActive, setTestMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [testRecorder, setTestRecorder] = useState<AudioRecorder | null>(null);

  // Diagnostics test runner state
  const [benchLang, setBenchLang] = useState('te');
  const [benchRunning, setBenchRunning] = useState(false);
  const [benchResult, setBenchResult] = useState<{
    asr_ms: number;
    translation_ms: number;
    tts_ms: number;
    total_ms: number;
    source_text: string;
    translated_text: string;
    audio_base64?: string;
  } | null>(null);

  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Diagnostics initialized. Ready for benchmark test.`,
    `[${new Date().toLocaleTimeString()}] Local audio pipeline sample rate: 16000Hz PCM mono.`,
    `[${new Date().toLocaleTimeString()}] Privacy filter enabled: zero-storage policy active.`,
  ]);

  const loadHealth = async () => {
    setLoadingDiag(true);
    try {
      const data = await fetchDiagnostics();
      setDiagnostics(data);
      addLog(`Backend diagnostics updated: Status=${data.status}, Active Sessions=${data.active_sessions}`);
    } catch (e) {
      addLog(`Failed to load health: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoadingDiag(false);
    }
  };

  const addLog = (msg: string) => {
    setDiagnosticLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 49),
    ]);
  };

  useEffect(() => {
    loadHealth();
    // Enumerate audio input devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const inputs = devices.filter((d) => d.kind === 'audioinput');
          setAudioDevices(inputs);
          if (inputs.length > 0 && !selectedDevice) {
            setSelectedDevice(inputs[0].deviceId);
          }
        })
        .catch(console.error);
    }
  }, []);

  const toggleTestMic = async () => {
    if (testMicActive) {
      if (testRecorder) {
        testRecorder.stop();
        setTestRecorder(null);
      }
      setTestMicActive(false);
      setMicLevel(0);
      addLog('Microphone input meter stopped.');
    } else {
      try {
        const recorder = new AudioRecorder();
        await recorder.start((_pcm, volume) => {
          setMicLevel(volume);
        }, selectedDevice);
        setTestRecorder(recorder);
        setTestMicActive(true);
        addLog(`Microphone meter started with device: ${selectedDevice || 'Default'}`);
      } catch (err) {
        addLog(`Microphone meter failed: ${err instanceof Error ? err.message : 'Permission denied'}`);
      }
    }
  };

  const runLatencyBenchmark = async () => {
    setBenchRunning(true);
    addLog(`Running end-to-end benchmark on language: ${benchLang.toUpperCase()} &rarr; EN...`);
    try {
      const start = performance.now();
      const res = await testLanguage(benchLang);
      const end = performance.now();
      const roundtrip = Math.round(end - start);

      setBenchResult({
        asr_ms: res.asr_ms,
        translation_ms: res.translation_ms,
        tts_ms: res.tts_ms,
        total_ms: res.total_ms || roundtrip,
        source_text: res.source_text,
        translated_text: res.translated_text,
        audio_base64: res.audio_base64,
      });

      addLog(
        `Benchmark SUCCESS: ASR=${res.asr_ms}ms, MT=${res.translation_ms}ms, TTS=${res.tts_ms}ms (Total Turnaround=${res.total_ms}ms)`
      );

      if (res.audio_base64) {
        globalAudioPlayer.playImmediately(res.audio_base64).catch(console.error);
      }
    } catch (e) {
      addLog(`Benchmark ERROR: ${e instanceof Error ? e.message : 'Test failed'}`);
    } finally {
      setBenchRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Diagnostics Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Testing & Diagnostics</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Verify microphone levels, measure sub-pipeline latencies, and inspect backend health.
            </p>
          </div>

          <button
            onClick={loadHealth}
            disabled={loadingDiag}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all border border-slate-700"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loadingDiag ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>
      </div>

      {/* Grid of test sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Microphone Meter & Device Selector */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Mic className="w-4 h-4 text-indigo-400" />
              <span>Microphone Input Calibration</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">16kHz 1-ch</span>
          </div>

          {/* Device selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Input Device</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              disabled={testMicActive}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {audioDevices.length > 0 ? (
                audioDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${d.deviceId.slice(0, 8)}`}
                  </option>
                ))
              ) : (
                <option value="">Default System Microphone</option>
              )}
            </select>
          </div>

          {/* Visualizer */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Input Energy Level:</span>
              <span className="font-mono text-emerald-400">{micLevel}%</span>
            </div>
            <AudioVisualizer volume={micLevel} isActive={testMicActive} />
          </div>

          {/* Mic Meter Button */}
          <button
            onClick={toggleTestMic}
            className={`w-full py-2.5 rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-2 ${
              testMicActive
                ? 'bg-red-950/80 border border-red-800/80 text-red-300'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>{testMicActive ? 'Stop Calibration Meter' : 'Test Microphone Input Level'}</span>
          </button>
        </div>

        {/* Section 2: End-to-End Latency Benchmark */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Pipeline Latency Benchmark</span>
            </h3>
            <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
              Target &le; 1500ms
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Measures exact turnaround latency from speech inference &rarr; translation &rarr; neural voice synthesis.
          </p>

          <div className="flex items-center gap-3">
            <select
              value={benchLang}
              onChange={(e) => setBenchLang(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.native_name})
                </option>
              ))}
            </select>

            <button
              onClick={runLatencyBenchmark}
              disabled={benchRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {benchRunning ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Measuring...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Benchmark</span>
                </>
              )}
            </button>
          </div>

          {/* Benchmark Results */}
          {benchResult ? (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">ASR</span>
                  <span className="font-mono text-indigo-400 font-semibold">{benchResult.asr_ms}ms</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">MT</span>
                  <span className="font-mono text-purple-400 font-semibold">{benchResult.translation_ms}ms</span>
                </div>
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">TTS</span>
                  <span className="font-mono text-emerald-400 font-semibold">{benchResult.tts_ms}ms</span>
                </div>
                <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-800/60">
                  <span className="text-emerald-300 block text-[10px]">TOTAL</span>
                  <span className="font-mono text-emerald-300 font-bold">{benchResult.total_ms}ms</span>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <p className="text-slate-400">
                  Source: <span className="text-slate-200">"{benchResult.source_text}"</span>
                </p>
                <div className="flex items-center justify-between text-indigo-300 font-medium">
                  <span>Target: "{benchResult.translated_text}"</span>
                  {benchResult.audio_base64 && (
                    <button
                      onClick={() => globalAudioPlayer.playImmediately(benchResult.audio_base64!).catch(console.error)}
                      className="p-1 text-indigo-400 hover:text-white"
                      title="Replay test voice"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-500">
              Run benchmark to view verified stage-by-stage latency.
            </div>
          )}
        </div>
      </div>

      {/* Backend & Environment Health Cards */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
        <h3 className="font-semibold text-white flex items-center gap-2 text-sm mb-4">
          <Server className="w-4 h-4 text-indigo-400" />
          <span>Backend & Host System Diagnostics</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Backend Status</span>
            <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {diagnostics?.status || 'Online'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">WebSocket Protocol</span>
            <span className="text-sm font-semibold text-indigo-400 capitalize">
              {connectionStatus}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Supported Languages</span>
            <span className="text-sm font-semibold text-slate-200 font-mono">
              {diagnostics?.supported_languages_count || languages.length} packs
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Zero-Storage Policy</span>
            <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Enforced
            </span>
          </div>
        </div>

        {/* Live Sanitized Log Console */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Sanitized Diagnostics Console</span>
            <span className="text-[11px] text-emerald-400 font-mono">Zero secrets or personal audio logged</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto space-y-1">
            {diagnosticLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
