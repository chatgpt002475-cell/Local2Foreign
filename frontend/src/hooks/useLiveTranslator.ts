import { useState, useEffect, useRef, useCallback } from 'react';
import { TranscriptItem, AudioLatencyMetrics } from '../types';
import { LiveTranslationWS, ConnectionStatus } from '../services/websocket';
import { AudioRecorder } from '../services/audioRecorder';
import { globalAudioPlayer } from '../services/audioPlayer';

interface UseLiveTranslatorProps {
  sourceLang: string;
  targetLang: string;
  autoDetect: boolean;
  provider: string;
  voice?: string;
  onLanguagesSwapped?: (newSource: string, newTarget: string) => void;
}

export function useLiveTranslator({
  sourceLang,
  targetLang,
  autoDetect,
  provider,
  voice,
  onLanguagesSwapped,
}: UseLiveTranslatorProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [partialTranscript, setPartialTranscript] = useState<TranscriptItem | null>(null);
  const [currentVolume, setCurrentVolume] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [latestMetrics, setLatestMetrics] = useState<AudioLatencyMetrics | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wsRef = useRef<LiveTranslationWS | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const durationTimerRef = useRef<number | null>(null);

  // Sync mute state with player
  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    globalAudioPlayer.setMuted(next);
  }, [isMuted]);

  // Audio queue listener
  useEffect(() => {
    const unsub = globalAudioPlayer.subscribe((playing, currentId) => {
      setIsPlayingAudio(playing);
      setActiveAudioId(currentId || null);
    });
    return unsub;
  }, []);

  // Update WS config when languages change dynamically
  useEffect(() => {
    if (wsRef.current && connectionStatus === 'connected') {
      wsRef.current.updateLanguages(sourceLang, targetLang, autoDetect);
    }
  }, [sourceLang, targetLang, autoDetect, connectionStatus]);

  const handleTranscript = useCallback((item: TranscriptItem) => {
    if (item.is_final) {
      setPartialTranscript(null);
      setTranscripts((prev) => {
        // Avoid duplicate seq_ids
        const existingIndex = prev.findIndex((p) => p.seq_id === item.seq_id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = item;
          return updated;
        }
        return [...prev, item];
      });

      // Automatically enqueue audio if available
      if (item.audio_base64) {
        globalAudioPlayer.enqueue(item.id, item.audio_base64);
      }
    } else {
      setPartialTranscript(item);
    }

    if (item.metrics) {
      setLatestMetrics(item.metrics);
    }
  }, []);

  const handleAudioChunk = useCallback((chunk: { seq_id: number; audio_base64: string }) => {
    if (chunk.audio_base64) {
      globalAudioPlayer.enqueue(`chunk-${chunk.seq_id}`, chunk.audio_base64);
    }
  }, []);

  const startSession = useCallback(async () => {
    setErrorMessage(null);
    try {
      const recorder = new AudioRecorder();
      recorderRef.current = recorder;

      const ws = new LiveTranslationWS({
        onStatusChange: setConnectionStatus,
        onTranscript: handleTranscript,
        onAudioChunk: handleAudioChunk,
        onMetrics: setLatestMetrics,
        onError: (err) => setErrorMessage(err),
      });
      wsRef.current = ws;

      ws.connect({
        sourceLang,
        targetLang,
        autoDetect,
        provider,
        voice,
      });

      await recorder.start((pcm16, volume) => {
        setCurrentVolume(volume);
        if (wsRef.current) {
          wsRef.current.sendAudioFrame(pcm16);
        }
      });

      setIsRecording(true);

      // Start duration counter
      setSessionDuration(0);
      durationTimerRef.current = window.setInterval(() => {
        setSessionDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start session:', err);
      const msg = err instanceof Error ? err.message : 'Microphone access denied or error starting session';
      setErrorMessage(msg);
      stopSession();
    }
  }, [sourceLang, targetLang, autoDetect, provider, voice, handleTranscript, handleAudioChunk]);

  const stopSession = useCallback(() => {
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

    setIsRecording(false);
    setCurrentVolume(0);
    setPartialTranscript(null);
    setConnectionStatus('disconnected');
  }, []);

  const swapLanguages = useCallback(() => {
    if (autoDetect) return; // Cannot swap when auto detecting
    if (onLanguagesSwapped) {
      onLanguagesSwapped(targetLang, sourceLang);
    }
  }, [autoDetect, targetLang, sourceLang, onLanguagesSwapped]);

  const replayUtterance = useCallback((item: TranscriptItem) => {
    if (item.audio_base64) {
      globalAudioPlayer.playImmediately(item.audio_base64).catch(console.error);
    }
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current) {
      wsRef.current.sendTextMessage(text, sourceLang, targetLang);
    }
  }, [sourceLang, targetLang]);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    setPartialTranscript(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
      globalAudioPlayer.stopAll();
    };
  }, [stopSession]);

  return {
    isRecording,
    connectionStatus,
    transcripts,
    partialTranscript,
    currentVolume,
    isPlayingAudio,
    isMuted,
    activeAudioId,
    latestMetrics,
    sessionDuration,
    errorMessage,
    startSession,
    stopSession,
    swapLanguages,
    replayUtterance,
    sendTextMessage,
    clearTranscripts,
    toggleMute,
  };
}
