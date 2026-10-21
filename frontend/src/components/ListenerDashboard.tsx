import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Headphones,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  Hand,
  AlertCircle,
} from 'lucide-react';
import { LanguageCapability, TranscriptItem } from '../types';
import { LiveTranslationWS, RoomStats } from '../services/websocket';
import { globalAudioPlayer } from '../services/audioPlayer';

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
  const [roomId, setRoomId] = useState(initialRoomId);
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
        },
        onTranscript: handleTranscript,
        onRoomStats: setRoomStats,
        onError: (err) => setErrorMessage(err),
      });
      wsRef.current = ws;

      ws.connect({
        sourceLang: 'te',
        targetLang,
        autoDetect: false,
        provider,
        role: 'listener',
        roomId,
      });
    } catch (err) {
      console.error('Failed to connect to room:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [roomId, targetLang, provider, handleTranscript]);

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
    if (wsRef.current && isConnected) {
      wsRef.current.updateLanguages('te', newLang, false);
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
    // Play tiny silent chime to unlock iOS / Android audio pipeline
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
      {/* Mobile Audio Activation Banner if needed */}
      {!audioUnlocked && (
        <div className="bg-gradient-to-r from-indigo-900/90 to-purple-900/90 border border-indigo-700/80 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-indigo-400 shrink-0 animate-bounce" />
            <div>
              <h4 className="text-sm font-bold text-white">Enable Live Spoken Voice</h4>
              <p className="text-xs text-indigo-200">
                Mobile browsers require a single tap to enable automatic audio playback.
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
                Room: <span className="font-mono text-indigo-400 font-bold">{roomId}</span> &bull; {roomStats.listener_count} Listener{roomStats.listener_count === 1 ? '' : 's'} in Room
              </p>
            </div>
          </div>

          {/* Change Room button */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="Room ID"
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-indigo-400 font-mono w-28 uppercase"
            />
            <button
              onClick={() => {
                disconnectFromRoom();
                connectToRoom();
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
            >
              Switch Room
            </button>
          </div>
        </div>
      </div>

      {/* Language Selection & Audio Controls Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Target Language Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
              I Want to Hear in:
            </label>
            <select
              value={targetLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base text-white font-semibold focus:outline-none focus:border-indigo-500 shadow-inner"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} ({l.native_name})
                </option>
              ))}
            </select>
          </div>

          {/* Audio Controls */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Output Volume
              </span>
              <span>{Math.round(volume * 100)}%</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleMute}
                className={`p-2 rounded-lg border transition-all ${
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
            <span className={`w-2 h-2 rounded-full ${activeAudioId ? 'bg-indigo-500 animate-ping' : 'bg-emerald-500'}`} />
            <span>
              {activeAudioId ? 'Playing translated speech...' : 'Audio output stream ready'}
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOriginal}
              onChange={(e) => setShowOriginal(e.target.checked)}
              className="accent-indigo-600 rounded"
            />
            <span>Show Original Speaker Text</span>
          </label>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-3 p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Primary Live Subtitle Focus Card */}
      <div className="bg-gradient-to-br from-indigo-950/50 via-slate-900 to-purple-950/40 border border-indigo-900/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
            Live Spoken Subtitles &bull; {targetLangInfo?.name}
          </span>
          {latestTranscript?.metrics && (
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Delay: {latestTranscript.metrics.total_turnaround_ms}ms
            </span>
          )}
        </div>

        {latestTranscript ? (
          <div className="space-y-4">
            {/* Big Translated Text */}
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
              {latestTranscript.translated_text || 'Listening...'}
            </div>

            {/* Optional Original Text */}
            {showOriginal && latestTranscript.source_text && (
              <div className="pt-3 border-t border-indigo-900/40 text-sm text-slate-300">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-0.5 font-semibold">
                  Original ({latestTranscript.source_lang.toUpperCase()}):
                </span>
                <p className="italic font-normal">{latestTranscript.source_text}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            <Headphones className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Waiting for speaker to begin talking...</p>
          </div>
        )}
      </div>

      {/* Audience Interaction & Raise Hand Deck */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            React to Speaker
          </span>
          <p className="text-xs text-slate-500">Send instant feedback to the presenter</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Reaction emojis */}
          {['👏', '👍', '❤️', '🔥', '💡'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSendReaction(emoji)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-lg transition-transform transform active:scale-125"
            >
              {emoji}
            </button>
          ))}

          {/* Raise Hand Button */}
          <button
            onClick={() => handleSendReaction('🙋‍♂️')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 active:scale-95"
          >
            <Hand className="w-4 h-4" />
            <span>Raise Hand</span>
          </button>
        </div>

        {reactionSent && (
          <div className="w-full text-right text-xs text-emerald-400 font-semibold animate-pulse">
            Sent {reactionSent} to presenter!
          </div>
        )}
      </div>

      {/* Complete Utterance History Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white tracking-tight">Full Session History</h3>
          <span className="text-xs text-slate-400">{transcripts.length} sentences</span>
        </div>

        <div className="space-y-3">
          {[...transcripts].reverse().map((item) => (
            <div
              key={item.id}
              className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  #{item.seq_id} &bull; {new Date(item.timestamp).toLocaleTimeString()}
                </span>
                <p className="text-base text-white font-semibold leading-relaxed">
                  {item.translated_text}
                </p>
                {showOriginal && (
                  <p className="text-xs text-slate-400 italic">{item.source_text}</p>
                )}
              </div>

              {item.audio_base64 && (
                <button
                  onClick={() => replayUtterance(item)}
                  title="Replay translated audio"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all shrink-0 mt-1"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
