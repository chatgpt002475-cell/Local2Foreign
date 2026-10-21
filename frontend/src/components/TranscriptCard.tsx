import React from 'react';
import { TranscriptItem } from '../types';
import { Volume2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface TranscriptCardProps {
  item: TranscriptItem;
  isPlaying?: boolean;
  onReplay?: (item: TranscriptItem) => void;
}

export const TranscriptCard: React.FC<TranscriptCardProps> = ({
  item,
  isPlaying = false,
  onReplay,
}) => {
  const timeFormatted = new Date(item.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      className={`relative p-5 rounded-2xl border transition-all duration-200 ${
        isPlaying
          ? 'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
          : 'bg-slate-900/90 border-slate-800/80 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-mono bg-slate-800 text-indigo-400 px-2 py-0.5 rounded-md font-semibold">
            #{item.seq_id}
          </span>
          <span className="uppercase tracking-wider font-semibold text-slate-300">
            {item.source_lang} &rarr; {item.target_lang}
          </span>
          {item.is_final ? (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Final
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-medium animate-pulse">
              <Clock className="w-3.5 h-3.5" /> Processing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {item.metrics && (
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Turnaround: {item.metrics.total_turnaround_ms}ms
            </span>
          )}
          <span>{timeFormatted}</span>
        </div>
      </div>

      {item.error ? (
        <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{item.error}</span>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Source Text */}
          <div className="text-slate-300 text-base leading-relaxed font-normal">
            <span className="text-xs text-slate-400 block mb-0.5 font-medium">Original</span>
            <p className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 select-text">
              {item.source_text || <span className="italic text-slate-600">Listening...</span>}
            </p>
          </div>

          {/* Translated Text */}
          <div className="text-white text-lg font-medium leading-relaxed">
            <span className="text-xs text-indigo-400 block mb-0.5 font-medium">Translated</span>
            <div className="p-3.5 bg-gradient-to-br from-indigo-950/30 to-purple-950/20 border border-indigo-900/40 rounded-xl flex items-start justify-between gap-3">
              <p className="text-slate-100 font-medium select-text">
                {item.translated_text || <span className="italic text-slate-600">Translating...</span>}
              </p>
              {item.audio_base64 && onReplay && (
                <button
                  onClick={() => onReplay(item)}
                  title="Replay translated audio"
                  className={`p-2 rounded-lg transition-all ${
                    isPlaying
                      ? 'bg-indigo-600 text-white animate-bounce'
                      : 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
