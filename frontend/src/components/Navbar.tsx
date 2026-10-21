import React from 'react';
import { Mic, Headphones, Globe, Settings, Radio } from 'lucide-react';
import { ConnectionStatus } from '../services/websocket';

export type TabType = 'speaker' | 'listener' | 'translator' | 'languages' | 'diagnostics' | 'settings';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  connectionStatus: ConnectionStatus;
  isRecording: boolean;
  sessionDuration: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  connectionStatus,
  isRecording,
  sessionDuration,
}) => {
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const statusColors = {
    connected: 'bg-emerald-500',
    connecting: 'bg-amber-500 animate-pulse',
    reconnecting: 'bg-amber-500 animate-pulse',
    error: 'bg-red-500',
    disconnected: 'bg-slate-600',
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">LiveVoice AI</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded border border-indigo-800/60">
                Local 2 Foreign
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Speaker &amp; Listener Voice Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          {/* Speaker Studio */}
          <button
            onClick={() => onTabChange('speaker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'speaker'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Speaker Studio</span>
          </button>

          {/* Listener Portal */}
          <button
            onClick={() => onTabChange('listener')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'listener'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Listener Portal</span>
          </button>

          {/* 1:1 Live Translator */}
          <button
            onClick={() => onTabChange('translator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentTab === 'translator'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>1:1 Translator</span>
          </button>

          {/* 20 Languages */}
          <button
            onClick={() => onTabChange('languages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              currentTab === 'languages'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Languages</span>
            <span className="text-[10px] bg-slate-800 px-1 py-0.2 rounded text-slate-300 font-mono">20</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => onTabChange('settings')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'settings'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </nav>

        {/* Live Status indicator */}
        <div className="flex items-center gap-3">
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-950/60 border border-red-800/60 rounded-lg text-xs font-mono text-red-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>LIVE {formatDuration(sessionDuration)}</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${statusColors[connectionStatus]}`} />
            <span className="text-slate-300 capitalize">{connectionStatus}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
