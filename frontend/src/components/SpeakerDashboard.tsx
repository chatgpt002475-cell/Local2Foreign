import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Users,
  Copy,
  Check,
  Send,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Play,
  Volume2,
  VolumeX,
  AudioWaveform,
  QrCode,
} from 'lucide-react';
import { LanguageCapability, TranscriptItem, CustomVoiceProfile } from '../types';
import { LiveTranslationWS, RoomStats, ListenerReaction } from '../services/websocket';
import { AudioRecorder } from '../services/audioRecorder';
import { globalAudioPlayer } from '../services/audioPlayer';
import { AudioVisualizer } from './AudioVisualizer';
import { TranscriptCard } from './TranscriptCard';
import { VoiceSelectorModal } from './VoiceSelectorModal';
import { ShareRoomModal } from './ShareRoomModal';

interface SpeakerDashboardProps {
  languages: LanguageCapability[];
  initialRoomId?: string;
  provider: string;
}

const getWebSpeechLang = (code: string): string => {
  const map: Record<string, string> = {
    te: 'te-IN',
    hi: 'hi-IN',
    ta: 'ta-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    bn: 'bn-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    pa: 'pa-IN',
    ur: 'ur-IN',
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    pt: 'pt-BR',
    it: 'it-IT',
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
    ar: 'ar-SA',
  };
  return map[code] || 'en-US';
};

export const SpeakerDashboard: React.FC<SpeakerDashboardProps> = ({
  languages,
  initialRoomId = 'LIVE-8821',
  provider,
}) => {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [sourceLang, setSourceLang] = useState('te'); // Telugu default
  const [targetLang, setTargetLang] = useState('en'); // English default
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [partialTranscript, setPartialTranscript] = useState<TranscriptItem | null>(null);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // Voice Management State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('en-US-AriaNeural');
  const [selectedPitch, setSelectedPitch] = useState('+0Hz');
  const [selectedRate, setSelectedRate] = useState('+0%');
  const [customProfile, setCustomProfile] = useState<CustomVoiceProfile | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Room Stats & Reactions from audience
  const [roomStats, setRoomStats] = useState<RoomStats>({
    room_id: roomId,
    speaker_online: true,
    listener_count: 0,
    listener_languages: [],
  });
  const [recentReactions, setRecentReactions] = useState<ListenerReaction[]>([]);

  const wsRef = useRef<LiveTranslationWS | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const durationTimerRef = useRef<number | null>(null);
  const isBroadcastingRef = useRef(false);
  const speechRecognitionRef = useRef<any>(null);
  const lastDispatchedTextRef = useRef('');
  const interimDebounceTimerRef = useRef<number | null>(null);

  const sourceLangInfo = languages.find((l) => l.code === sourceLang);

  const handleTranscript = useCallback((item: TranscriptItem) => {
    if (item.is_final) {
      setPartialTranscript(null);
      setTranscripts((prev) => {
        const idx = prev.findIndex((p) => p.seq_id === item.seq_id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = item;
          return updated;
        }
        return [...prev, item];
      });
    } else {
      setPartialTranscript(item);
    }
  }, []);

  const handleListenerReaction = useCallback((reaction: ListenerReaction) => {
    setRecentReactions((prev) => [reaction, ...prev.slice(0, 9)]);
  }, []);

  const startSpeechRecognition = useCallback((langCode: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser. Fallback to acoustic VAD.');
      return null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getWebSpeechLang(langCode);

      recognition.onresult = (event: any) => {
        let interimText = '';
        let hasFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            hasFinal = true;
            const finalStr = transcriptSegment.trim();
            if (finalStr.length > 0 && finalStr !== lastDispatchedTextRef.current) {
              lastDispatchedTextRef.current = finalStr;
              if (interimDebounceTimerRef.current) {
                clearTimeout(interimDebounceTimerRef.current);
                interimDebounceTimerRef.current = null;
              }
              if (wsRef.current) {
                wsRef.current.sendSpeakerSpeech(finalStr, langCode, targetLang);
              }
            }
          } else {
            interimText += transcriptSegment;
          }
        }

        const cleanInterim = interimText.trim();
        if (cleanInterim) {
          setPartialTranscript({
            id: 'interim-live',
            seq_id: 999999,
            timestamp: new Date().toISOString(),
            source_lang: langCode,
            target_lang: targetLang,
            source_text: cleanInterim,
            translated_text: 'Listening...',
            is_final: false,
          });

          // Fast natural pause detector (650ms): Dispatches without waiting 3 seconds for browser isFinal!
          if (interimDebounceTimerRef.current) {
            clearTimeout(interimDebounceTimerRef.current);
          }
          interimDebounceTimerRef.current = window.setTimeout(() => {
            if (
              cleanInterim.length > 2 &&
              cleanInterim !== lastDispatchedTextRef.current &&
              !hasFinal &&
              wsRef.current
            ) {
              lastDispatchedTextRef.current = cleanInterim;
              wsRef.current.sendSpeakerSpeech(cleanInterim, langCode, targetLang);
            }
          }, 650);
        }
      };

      recognition.onerror = (e: any) => {
        // 'no-speech' is triggered during natural pauses. System holds silent!
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('Speech recognition status:', e.error);
        }
      };

      recognition.onend = () => {
        // Automatically resume recognition while broadcasting
        if (isBroadcastingRef.current) {
          try {
            recognition.start();
          } catch (_) {}
        }
      };

      recognition.start();
      return recognition;
    } catch (err) {
      console.warn('SpeechRecognition initialization notice:', err);
      return null;
    }
  }, []);

  const startBroadcast = useCallback(async () => {
    setErrorMessage(null);
    try {
      isBroadcastingRef.current = true;
      const recorder = new AudioRecorder();
      recorderRef.current = recorder;

      const ws = new LiveTranslationWS({
        onTranscript: handleTranscript,
        onRoomStats: setRoomStats,
        onListenerReaction: handleListenerReaction,
        onError: (err) => setErrorMessage(err),
      });
      wsRef.current = ws;

      ws.connect({
        sourceLang,
        targetLang,
        autoDetect: false,
        provider,
        voice: selectedVoice,
        pitch: selectedPitch,
        rate: selectedRate,
        role: 'speaker',
        roomId,
      });

      // Start continuous browser speech recognition for continuous Telugu/Hindi/English etc.
      speechRecognitionRef.current = startSpeechRecognition(sourceLang);

      // Start audio recording for live UI visualizer (no duplicate PCM network spam)
      await recorder.start((_pcm16, volume) => {
        setCurrentVolume(volume);
      });

      setIsBroadcasting(true);
      setSessionDuration(0);
      durationTimerRef.current = window.setInterval(() => {
        setSessionDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start broadcast:', err);
      const msg = err instanceof Error ? err.message : 'Microphone access denied or connection error';
      setErrorMessage(msg);
      stopBroadcast();
    }
  }, [
    sourceLang,
    targetLang,
    provider,
    roomId,
    selectedVoice,
    selectedPitch,
    selectedRate,
    handleTranscript,
    handleListenerReaction,
    startSpeechRecognition,
  ]);

  const stopBroadcast = useCallback(() => {
    isBroadcastingRef.current = false;
    if (interimDebounceTimerRef.current) {
      clearTimeout(interimDebounceTimerRef.current);
      interimDebounceTimerRef.current = null;
    }
    lastDispatchedTextRef.current = '';

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (_) {}
      speechRecognitionRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
    setIsBroadcasting(false);
    setCurrentVolume(0);
    setPartialTranscript(null);
  }, []);

  const copyListenerLink = () => {
    const origin = window.location.origin;
    const link = `${origin}/?mode=listener&room=${encodeURIComponent(roomId)}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !wsRef.current) return;
    wsRef.current.sendTextMessage(textInput, sourceLang, targetLang);
    setTextInput('');
  };

  const handleQuickPhrase = (phraseText: string) => {
    if (wsRef.current) {
      wsRef.current.sendTextMessage(phraseText, sourceLang, targetLang);
    }
  };

  const handleApplyVoice = (voice: string, pitch: string, rate: string, profile?: CustomVoiceProfile) => {
    setSelectedVoice(voice);
    setSelectedPitch(pitch);
    setSelectedRate(rate);
    if (profile) setCustomProfile(profile);

    if (wsRef.current) {
      wsRef.current.updateVoice(voice, pitch, rate);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    globalAudioPlayer.setMuted(next);
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      stopBroadcast();
    };
  }, [stopBroadcast]);

  return (
    <div className="space-y-6">
      {/* Studio Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">Speaker Broadcast Studio</h2>
                  {isBroadcasting ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 text-xs font-semibold uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      ON AIR ({formatDuration(sessionDuration)})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-medium">
                      STANDBY
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Speak continuously in your native language &mdash; listeners hear instant translated voice without pauses.
                </p>
              </div>
            </div>
          </div>

          {/* Room Code & Share Invite */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Room:</span>
              <input
                type="text"
                value={roomId}
                disabled={isBroadcasting}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="bg-transparent font-mono font-bold text-indigo-400 text-sm focus:outline-none w-28 uppercase"
              />
            </div>

            <button
              onClick={() => setIsShareModalOpen(true)}
              title="Open QR Code & Permanent Link Options"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              <QrCode className="w-4 h-4" />
              <span>Connect Any Device / QR</span>
            </button>

            <button
              onClick={copyListenerLink}
              title="Copy listener invitation link to clipboard"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            {/* Audience Counter */}
            <div className="flex items-center gap-2 bg-indigo-950/60 border border-indigo-800/80 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-300">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>{roomStats.listener_count} Listener{roomStats.listener_count === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>

        {/* Live Audience Breakdown Bar */}
        {roomStats.listener_count > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Active Audience Languages:</span>
            <div className="flex flex-wrap gap-1.5">
              {Array.from(new Set(roomStats.listener_languages)).map((code) => {
                const count = roomStats.listener_languages.filter((l) => l === code).length;
                const info = languages.find((l) => l.code === code);
                return (
                  <span
                    key={code}
                    className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-mono text-[11px] border border-slate-700"
                  >
                    {info?.name || code.toUpperCase()}: {count}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Broadcast Control Deck */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Source Language Picker & Voice Studio Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                My Speaking Language
              </label>
              <select
                disabled={isBroadcasting}
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Translate Into Target Language */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Translate Into
              </label>
              <select
                disabled={isBroadcasting}
                value={targetLang}
                onChange={(e) => {
                  const newT = e.target.value;
                  setTargetLang(newT);
                  const langObj = languages.find((l) => l.code === newT);
                  if (langObj) setSelectedVoice(langObj.default_voice);
                }}
                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Voice & Tone Customization Button */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Target Voice & Tone
              </label>
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold transition shadow-sm"
              >
                <AudioWaveform className="w-4 h-4 text-purple-400" />
                <span>
                  {customProfile
                    ? 'Custom Voice Profile'
                    : selectedVoice.includes('Guy') || selectedVoice.includes('Ryan') || selectedVoice.includes('Prabhat')
                    ? 'Men (Male Voice)'
                    : 'Women (Female Voice)'}
                </span>
                <span className="text-[11px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-indigo-400 border border-slate-800">
                  {selectedPitch}
                </span>
              </button>
            </div>

            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              className={`self-end p-2.5 rounded-xl border transition-all ${
                isMuted
                  ? 'bg-amber-950/40 border-amber-800/80 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Broadcast Trigger Button */}
          <div>
            {!isBroadcasting ? (
              <button
                onClick={startBroadcast}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-red-600/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Mic className="w-5 h-5" />
                <span>Start Live Broadcast</span>
              </button>
            ) : (
              <button
                onClick={stopBroadcast}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-sm shadow-xl shadow-red-600/40 transition-all pulsing-mic transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <MicOff className="w-5 h-5" />
                <span>End Broadcast</span>
              </button>
            )}
          </div>
        </div>

        {/* Audio Waveform Meter & Silence Guard Status */}
        {isBroadcasting && (
          <div className="pt-2 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Continuous Speech Active &bull; Silence detection holds audio when quiet
              </span>
              <span>Mic Level: {currentVolume}%</span>
            </div>
            <AudioVisualizer volume={currentVolume} isActive={isBroadcasting} />
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="flex items-center gap-3 p-4 bg-red-950/60 border border-red-800/60 rounded-xl text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Audience Reactions Toast Bar */}
      {recentReactions.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Audience Activity
          </span>
          <div className="flex flex-wrap gap-2">
            {recentReactions.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 animate-bounce"
              >
                <span className="text-base">{r.emoji}</span>
                <span className="font-medium">{r.sender_name}</span>
                <span className="text-[10px] text-slate-500">{r.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Test Phrases */}
      {sourceLangInfo && sourceLangInfo.sample_phrases.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Quick Test Phrases for {sourceLangInfo.name}
            </span>
            <span className="text-xs text-slate-400">Click to broadcast instantly without speaking</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sourceLangInfo.sample_phrases.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickPhrase(phrase.native)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-indigo-950/60 hover:border-indigo-700/60 border border-slate-700/60 rounded-xl text-xs text-slate-200 transition-all"
              >
                <Play className="w-3 h-3 text-indigo-400 shrink-0" />
                <span>{phrase.native}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Broadcast Transcripts Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <span>Broadcast Feed History</span>
          </h3>
          <button
            onClick={() => {
              setTranscripts([]);
              setPartialTranscript(null);
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Feed</span>
          </button>
        </div>

        {partialTranscript && <TranscriptCard item={partialTranscript} isPlaying={false} />}

        {transcripts.length === 0 && !partialTranscript ? (
          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
            <Mic className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-400">
              Start broadcasting or type below to begin speaking to your audience.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...transcripts].reverse().map((item) => (
              <TranscriptCard key={item.id} item={item} isPlaying={false} />
            ))}
          </div>
        )}
      </div>

      {/* Manual text input */}
      <form onSubmit={handleSendText} className="relative">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={`Type a sentence in ${sourceLangInfo?.name || 'source language'} to broadcast to audience...`}
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-4 pr-12 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!textInput.trim()}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Voice Customization & Tone Studio Modal */}
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

      {/* Connect Any Device & QR Modal */}
      <ShareRoomModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        roomId={roomId}
      />
    </div>
  );
};
