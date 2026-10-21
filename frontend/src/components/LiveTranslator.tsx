import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  ArrowRightLeft,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { LanguageCapability } from '../types';
import { useLiveTranslator } from '../hooks/useLiveTranslator';
import { AudioVisualizer } from './AudioVisualizer';
import { TranscriptCard } from './TranscriptCard';

interface LiveTranslatorProps {
  languages: LanguageCapability[];
  sourceLang: string;
  targetLang: string;
  onSourceLangChange: (lang: string) => void;
  onTargetLangChange: (lang: string) => void;
  autoDetect: boolean;
  onAutoDetectToggle: () => void;
  provider: string;
}

export const LiveTranslator: React.FC<LiveTranslatorProps> = ({
  languages,
  sourceLang,
  targetLang,
  onSourceLangChange,
  onTargetLangChange,
  autoDetect,
  onAutoDetectToggle,
  provider,
}) => {
  const [textInput, setTextInput] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  const {
    isRecording,
    transcripts,
    partialTranscript,
    currentVolume,
    isPlayingAudio,
    isMuted,
    activeAudioId,
    errorMessage,
    startSession,
    stopSession,
    swapLanguages,
    replayUtterance,
    sendTextMessage,
    clearTranscripts,
    toggleMute,
  } = useLiveTranslator({
    sourceLang,
    targetLang,
    autoDetect,
    provider,
    voice: selectedVoice,
    onLanguagesSwapped: (s, t) => {
      onSourceLangChange(s);
      onTargetLangChange(t);
    },
  });

  const sourceLangInfo = languages.find((l) => l.code === sourceLang);
  const targetLangInfo = languages.find((l) => l.code === targetLang);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendTextMessage(textInput);
    setTextInput('');
  };

  const handleQuickTestPhrase = (nativeText: string) => {
    sendTextMessage(nativeText);
  };

  return (
    <div className="space-y-6">
      {/* Language Selection & Session Bar */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Language Pair Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Source Language */}
            <div className="flex flex-col gap-1 min-w-[200px]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Source Language
                </label>
                <button
                  onClick={onAutoDetectToggle}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded transition-all ${
                    autoDetect
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Auto-Detect: {autoDetect ? 'ON' : 'OFF'}
                </button>
              </div>

              <select
                disabled={autoDetect || isRecording}
                value={sourceLang}
                onChange={(e) => onSourceLangChange(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 font-medium focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="self-end pb-1">
              <button
                disabled={autoDetect || isRecording}
                onClick={swapLanguages}
                title="Swap source and target languages"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-40"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Target Language */}
            <div className="flex flex-col gap-1 min-w-[200px]">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Target Language
              </label>
              <select
                disabled={isRecording}
                value={targetLang}
                onChange={(e) => {
                  onTargetLangChange(e.target.value);
                  const info = languages.find((l) => l.code === e.target.value);
                  if (info?.default_voice) setSelectedVoice(info.default_voice);
                }}
                className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 font-medium focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Voice Selection */}
            {targetLangInfo && targetLangInfo.available_voices.length > 0 && (
              <div className="flex flex-col gap-1 min-w-[170px]">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target Voice
                </label>
                <select
                  value={selectedVoice || targetLangInfo.default_voice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                >
                  {targetLangInfo.available_voices.map((v) => (
                    <option key={v} value={v}>
                      {v.replace(/Neural$/, '')}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Main Controls: Start/Stop Mic, Mute, Clear */}
          <div className="flex items-center gap-3 self-end lg:self-center">
            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute speech output' : 'Mute speech output'}
              className={`p-3 rounded-xl border transition-all ${
                isMuted
                  ? 'bg-amber-950/40 border-amber-800/80 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <button
              onClick={clearTranscripts}
              title="Clear transcript history"
              className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Big Mic Button */}
            {!isRecording ? (
              <button
                onClick={startSession}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Mic className="w-5 h-5" />
                <span>Start Live Translation</span>
              </button>
            ) : (
              <button
                onClick={stopSession}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold shadow-lg shadow-red-600/30 transition-all pulsing-mic transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <MicOff className="w-5 h-5" />
                <span>Stop Live Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Audio Visualizer & Waveform when active */}
        {isRecording && (
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                Microphone Streaming (16kHz PCM mono)
              </span>
              <span>Audio Level: {currentVolume}%</span>
            </div>
            <AudioVisualizer volume={currentVolume} isActive={isRecording} />
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 bg-red-950/60 border border-red-800/60 rounded-2xl text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Quick Testing Phrases Bar */}
      {sourceLangInfo && sourceLangInfo.sample_phrases.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Quick Test Phrases for {sourceLangInfo.name} ({sourceLangInfo.native_name})
            </span>
            <span className="text-xs text-slate-400">Click to test without mic</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {sourceLangInfo.sample_phrases.map((phrase, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickTestPhrase(phrase.native)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-indigo-950/60 hover:border-indigo-700/60 border border-slate-700/60 rounded-xl text-xs text-slate-200 transition-all text-left"
              >
                <Play className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="font-medium">{phrase.native}</span>
                <span className="text-slate-400 text-[11px]">&rarr; "{phrase.english}"</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Live Stream Transcript Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <span>Live Conversation Stream</span>
            {isPlayingAudio && (
              <span className="text-xs font-normal text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" /> Playing translated voice...
              </span>
            )}
          </h2>
          <span className="text-xs text-slate-400">
            {transcripts.length} utterance{transcripts.length === 1 ? '' : 's'} recorded
          </span>
        </div>

        {/* In-progress partial transcript */}
        {partialTranscript && (
          <TranscriptCard
            item={partialTranscript}
            isPlaying={false}
          />
        )}

        {/* Completed utterances */}
        {transcripts.length === 0 && !partialTranscript ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
            <Mic className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300 mb-1">
              No live speech captured yet
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
              Click <strong>Start Live Translation</strong> to begin continuous speech-to-speech translation,
              or use the text input below to test immediately.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...transcripts].reverse().map((item) => (
              <TranscriptCard
                key={item.id}
                item={item}
                isPlaying={activeAudioId === item.id}
                onReplay={replayUtterance}
              />
            ))}
          </div>
        )}
      </div>

      {/* Manual Text Fallback Input */}
      <form onSubmit={handleSendText} className="relative mt-4">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={`Type a sentence in ${sourceLangInfo?.name || 'source language'} to test without microphone...`}
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-4 pr-12 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
        />
        <button
          type="submit"
          disabled={!textInput.trim()}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
