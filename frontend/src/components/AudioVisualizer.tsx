import React from 'react';

interface AudioVisualizerProps {
  volume: number; // 0 - 100
  isActive: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ volume, isActive }) => {
  // Generate 24 animated bars
  const bars = Array.from({ length: 24 });

  return (
    <div className="flex items-center justify-center gap-1.5 h-12 px-4 py-2 bg-slate-900/80 rounded-xl border border-slate-800">
      {bars.map((_, i) => {
        // Vary heights based on position and volume
        const factor = Math.sin((i / 24) * Math.PI);
        const dynamicHeight = isActive
          ? Math.max(15, Math.min(100, Math.round(volume * factor * (0.8 + Math.random() * 0.4))))
          : 8;

        return (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-75 ${
              isActive
                ? volume > 40
                  ? 'bg-gradient-to-t from-indigo-500 to-emerald-400'
                  : 'bg-indigo-500'
                : 'bg-slate-700'
            }`}
            style={{
              height: `${dynamicHeight}%`,
            }}
          />
        );
      })}
    </div>
  );
};
