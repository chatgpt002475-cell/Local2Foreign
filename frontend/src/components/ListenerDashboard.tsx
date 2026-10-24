import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Headphones,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  AlertCircle,
  AudioWaveform,
  QrCode,
} from 'lucide-react';
import { LanguageCapability, TranscriptItem } from '../types';
import { LiveTranslationWS, RoomStats } from '../services/websocket';
import { globalAudioPlayer } from '../services/audioPlayer';
import { VoiceSelectorModal } from './VoiceSelectorModal';
import { ShareRoomModal } from './ShareRoomModal';

interface ListenerDashboardProps {
  languages: LanguageCapability[];
  initialRoomId?: string;
  provider: string;
}

export const ListenerDashboard: React.FC<ListenerDashboardProps> = ({
  languages,
  initialRoomId = 'LIVE-8821',
  provider,
}) => {
  const [roomId] = useState(initialRoomId);
  const [isConnected, setIsConnected] = useState(false);
  const [targetLang, setTargetLang] = useState('en'); // Default to English for listener
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [showOriginal, setShowOriginal] = useState(true);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [reactionSent, setReactionSent] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Voice Selection State
  const [selectedVoice, setSelectedVoice] = useState('en-US-AriaNeural');
  const [selectedPitch, setSelectedPitch] = useState('+0Hz');
  const [selectedRate, setSelectedRate] = useState('+0%');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const [roomStats, setRoomStats] = useState<RoomStats>({
    room_id: roomId,
    speaker_online: false,
    listener_count: 0,
    listener_languages: [],
  });

  const wsRef = useRef<LiveTranslationWS | null>(null);

  const targetLangInfo = languages.find((l) => l.code === targetLang);

  const handleTranscript = useCallback((item: TranscriptItem) => {
    setTranscripts((prev) => {
      const idx = prev.findIndex((p) => p.seq_id === item.seq_id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = item;
        return updated;
      }
      return [...prev, item];
    });

    // Automatically enqueue audio for listener
    if (item.audio_base64) {
      globalAudioPlayer.enqueue(item.id, item.audio_base64);
    }
  }, []);

  const connectToRoom = useCallback(() => {
    setErrorMessage(null);
    try {
      const ws = new LiveTranslationWS({
        onStatusChange: (status) => {
          setIsConnected(status === 'connected');
          if (status === 'connected') {
            setErrorMessage(null);
          }
        },
        onTranscript: handleTranscript,
        onRoomStats: setRoomStats,
        onError: (err) => {
          if (err) setErrorMessage(err);
          else setErrorMessage(null);
        },
      });
      wsRef.current = ws;

      ws.connect({
        sourceLang: 'te',
        targetLang,
        autoDetect: false,
        provider,
        voice: selectedVoice,
        pitch: selectedPitch,
        rate: selectedRate,
        role: 'listener',
        roomId,
      });
    } catch (err) {
      console.error('Failed to connect to room:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [roomId, targetLang, provider, selectedVoice, selectedPitch, selectedRate, handleTranscript]);

  const disconnectFromRoom = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Update target language dynamically on the fly
  const handleLanguageChange = (newLang: string) => {
    setTargetLang(newLang);
    const langObj = languages.find((l) => l.code === newLang);
    const defVoice = langObj?.default_voice || 'en-US-AriaNeural';
    setSelectedVoice(defVoice);
    if (wsRef.current && isConnected) {
      wsRef.current.updateLanguages('te', newLang, false, defVoice, selectedPitch, selectedRate);
    }
  };

  const handleApplyVoice = (voice: string, pitch: string, rate: string) => {
    setSelectedVoice(voice);
    setSelectedPitch(pitch);
    setSelectedRate(rate);
    if (wsRef.current && isConnected) {
      wsRef.current.updateVoice(voice, pitch, rate);
    }
  };

  // Listen to audio player state
  useEffect(() => {
    const unsub = globalAudioPlayer.subscribe((playing, currentId) => {
      setActiveAudioId(playing ? currentId || null : null);
    });
    return unsub;
  }, []);

  // Unlock audio for mobile browsers that require user gesture
  const unlockAudioContext = () => {
    setAudioUnlocked(true);
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    audio.play().catch(() => {});
  };

  const handleSendReaction = (emoji: string) => {
    if (wsRef.current && isConnected) {
      wsRef.current.sendReaction(emoji, 'Audience');
      setReactionSent(emoji);
      setTimeout(() => setReactionSent(null), 2000);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    globalAudioPlayer.setMuted(next);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    globalAudioPlayer.setVolume(v);
  };

  const replayUtterance = (item: TranscriptItem) => {
    if (item.audio_base64) {
      globalAudioPlayer.playImmediately(item.audio_base64).catch(console.error);
    }
  };

  useEffect(() => {
    connectToRoom();
    return () => {
      disconnectFromRoom();
      globalAudioPlayer.stopAll();
    };
  }, [connectToRoom, disconnectFromRoom]);

  const latestTranscript = transcripts[transcripts.length - 1];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mobile Audio Activation Banner */}
      {!audioUnlocked && (
        <div className="bg-gradient-to-r from-indigo-900/90 to-purple-900/90 border border-indigo-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-indigo-400 shrink-0 animate-bounce" />
            <div>
              <h4 className="text-sm font-bold text-white">Enable Live Spoken Voice</h4>
              <p className="text-xs text-indigo-200">
                Tap here to activate real-time translated voice playback.
              </p>
            </div>
          </div>
          <button
            onClick={unlockAudioContext}
            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs shadow-md"
          >
            Enable Audio
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Listener Portal</h2>
                {roomStats.speaker_online ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Speaker Online
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-medium">
                    Waiting for Speaker...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Listening in Room: <span className="font-mono text-indigo-400 font-bold">{roomId}</span>
                {targetLangInfo && <span className="ml-2 text-indigo-300">&bull; {targetLangInfo.name} ({targetLangInfo.native_name})</span>}
              </p>
            </div>
          </div>

          {/* Quick Audience Reactions */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">React:</span>
            {['👏', '❤️', '💡', '🔥'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-base hover:scale-110 active:scale-95 transition-all shadow-sm"
              >
                {emoji}
              </button>
            ))}
            {reactionSent && (
              <span className="text-xs text-emerald-400 font-semibold animate-pulse ml-1">
                Sent {reactionSent}!
              </span>
            )}

            <button
              onClick={() => setIsShareModalOpen(true)}
              title="Share Room / Connect Device"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition ml-2"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Language Selection, Voice & Audio Controls Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Target Language Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
              I Want to Hear in:
            </label>
            <select
              value={targetLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-indigo-500 shadow-inner"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.native_name})
                </option>
              ))}
            </select>
          </div>

          {/* Voice & Tone Button */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
              Voice & Regional Tone
            </label>
            <button
              type="button"
              onClick={() => setIsVoiceModalOpen(true)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm font-semibold hover:border-indigo-500 transition"
            >
              <div className="flex items-center gap-2 truncate">
                <AudioWaveform className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="truncate">
                  {selectedVoice.includes('Guy') || selectedVoice.includes('Ryan') || selectedVoice.includes('Prabhat')
                    ? 'Men (Male Voice)'
                    : 'Women (Female Voice)'}
                </span>
              </div>
              <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">
                {selectedPitch}
              </span>
            </button>
          </div>

          {/* Audio Volume Controls */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Volume
              </span>
              <span>{Math.round(volume * 100)}%</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className={`p-1.5 rounded-lg border transition-all ${
                  isMuted
                    ? 'bg-amber-950/40 border-amber-800/80 text-amber-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Audio state badge */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                activeAudioId ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'
              }`}
            />
            <span>
              {activeAudioId ? 'Playing live translation voice...' : 'Holding silence (waiting for speaker)'}
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOriginal}
              onChange={(e) => setShowOriginal(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
            />
            <span>Show Original Language Transcript</span>
          </label>
        </div>
      </div>

      {/* Main Focus: Live Prominent Translated Speech Stage */}
      {latestTranscript ? (
        <div
          className={`p-6 sm:p-8 rounded-2xl border transition-all shadow-2xl relative overflow-hidden ${
            activeAudioId === latestTranscript.id
              ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          {activeAudioId === latestTranscript.id && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse" />
          )}

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              Live Translation
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {new Date(latestTranscript.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                {latestTranscript.translated_text}
              </p>
            </div>

            {showOriginal && (
              <div className="pt-4 border-t border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Original Speech ({latestTranscript.source_lang.toUpperCase()}):
                </span>
                <p className="text-base text-slate-300 font-medium">
                  {latestTranscript.source_text}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
          <Radio className="w-12 h-12 text-slate-700 mx-auto mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-white mb-1">Waiting for Speaker</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            The broadcast room is open. As soon as the speaker speaks, live translated voice will play automatically.
          </p>
        </div>
      )}

      {/* Transcript History */}
      {transcripts.length > 1 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Previous Utterances
          </h3>
          <div className="space-y-2.5">
            {[...transcripts]
              .slice(0, -1)
              .reverse()
              .map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{item.translated_text}</p>
                    {showOriginal && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{item.source_text}</p>
                    )}
                  </div>
                  <button
                    onClick={() => replayUtterance(item)}
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition shrink-0"
                    title="Replay Voice"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Voice Customization Modal */}
      <VoiceSelectorModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        targetLang={targetLang}
        languages={languages}
        selectedVoice={selectedVoice}
        selectedPitch={selectedPitch}
        selectedRate={selectedRate}
        onApplyVoice={handleApplyVoice}
      />

      {/* Connect Any Device / QR Modal */}
      <ShareRoomModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        roomId={roomId}
      />
    </div>
  );
};
