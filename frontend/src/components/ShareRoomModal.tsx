import React, { useState, useEffect } from 'react';
import { X, Copy, Check, QrCode, Wifi, Globe, Smartphone, Laptop, Radio } from 'lucide-react';

interface ShareRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

interface TunnelData {
  local_ip: string;
  local_ip_url: string;
  local_hostname_url: string;
  local_mdns_url: string;
  public_url: string | null;
  active_url: string;
  is_tunnel_active: boolean;
}

export const ShareRoomModal: React.FC<ShareRoomModalProps> = ({ isOpen, onClose, roomId }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [tunnelData, setTunnelData] = useState<TunnelData | null>(null);
  const [activeTab, setActiveTab] = useState<'wifi' | 'public'>('wifi');
  const [selectedLocalMode, setSelectedLocalMode] = useState<'ip' | 'mdns'>('ip');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/tunnel/status')
        .then((res) => res.json())
        .then((data: TunnelData) => {
          setTunnelData(data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Resolve base URLs
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
  const effectiveIpUrl = tunnelData?.local_ip_url || currentOrigin;
  const effectiveMdnsUrl = tunnelData?.local_mdns_url || `${currentOrigin.replace(/:\d+$/, '')}.local:8000`;
  const effectivePublicUrl = tunnelData?.public_url || '';

  const activeBaseUrl =
    activeTab === 'wifi'
      ? selectedLocalMode === 'ip'
        ? effectiveIpUrl
        : effectiveMdnsUrl
      : effectivePublicUrl || effectiveIpUrl;

  const listenerLink = `${activeBaseUrl}/?mode=listener&room=${encodeURIComponent(roomId)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(listenerLink)}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Connect Any Device</h3>
              <p className="text-xs text-slate-400">
                Broadcasting Room: <span className="text-indigo-400 font-mono font-bold">{roomId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('wifi')}
            className={`flex-1 py-3.5 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition ${
              activeTab === 'wifi'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-4 h-4" />
            Permanent Wi-Fi (Never Breaks)
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`flex-1 py-3.5 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition ${
              activeTab === 'public'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            Public Remote (Mobile 4G/5G)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {activeTab === 'wifi' ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 text-xs leading-relaxed">
                <span className="font-bold text-white block mb-0.5 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  Local Network Access (Zero Cloud Lag)
                </span>
                Any phone, tablet, or laptop on the same Wi-Fi can listen instantly with ultra-low latency.
              </div>

              {/* Sub-selector: IP vs mDNS Hostname */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedLocalMode('ip')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                    selectedLocalMode === 'ip'
                      ? 'bg-emerald-500/10 border-emerald-500/60 text-white'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Current Wi-Fi IP</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{effectiveIpUrl}</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedLocalMode('mdns')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                    selectedLocalMode === 'mdns'
                      ? 'bg-emerald-500/10 border-emerald-500/60 text-white'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Laptop className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Permanent Hostname</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{effectiveMdnsUrl}</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 text-xs leading-relaxed">
              <span className="font-bold text-white block mb-0.5">Remote Cellular Link</span>
              Use this HTTPS link if listeners are on mobile 4G/5G data outside the local Wi-Fi. The background daemon auto-refreshes this connection.
            </div>
          )}

          {/* QR Code Center */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="p-2.5 bg-white rounded-xl shadow-lg">
              <img src={qrUrl} alt="Room QR Code" className="w-44 h-44 object-contain" />
            </div>
            <span className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 font-medium">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              Scan with phone camera to listen in real time
            </span>
          </div>

          {/* Link URL with Copy */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Listener Link</span>
              <span className="text-[11px] text-emerald-400 font-mono">{activeBaseUrl}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <input
                type="text"
                readOnly
                value={listenerLink}
                className="bg-transparent text-xs text-white font-mono flex-1 focus:outline-none truncate"
              />
              <button
                onClick={() => copyToClipboard(listenerLink, 'main')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0"
              >
                {copiedKey === 'main' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'main' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Host: <code className="text-emerald-400 font-mono">{effectiveIpUrl}</code></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
