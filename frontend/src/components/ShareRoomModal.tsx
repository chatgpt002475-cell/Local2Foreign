import React, { useState, useEffect } from 'react';
import { X, Copy, Check, QrCode, Wifi, Globe, Smartphone } from 'lucide-react';

interface ShareRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const ShareRoomModal: React.FC<ShareRoomModalProps> = ({ isOpen, onClose, roomId }) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string>('http://192.168.1.4:8000');
  const [publicUrl, setPublicUrl] = useState<string>('https://giant-exam-veterinary-barbie.trycloudflare.com');
  const [activeTab, setActiveTab] = useState<'wifi' | 'public'>('wifi');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/tunnel/status')
        .then((res) => res.json())
        .then((data) => {
          if (data.local_ip_url) setLocalUrl(data.local_ip_url);
          if (data.public_url) setPublicUrl(data.public_url);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const wifiListenerLink = `${localUrl}/?mode=listener&room=${encodeURIComponent(roomId)}`;
  const publicListenerLink = `${publicUrl}/?mode=listener&room=${encodeURIComponent(roomId)}`;

  const activeLink = activeTab === 'wifi' ? wifiListenerLink : publicListenerLink;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeLink)}`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
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
                Room: <span className="text-indigo-400 font-mono font-bold">{roomId}</span>
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
            Public Remote (Mobile Data)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {activeTab === 'wifi' ? (
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-emerald-300 text-xs leading-relaxed">
              <span className="font-bold text-white block mb-0.5">Recommended: Permanent Wi-Fi Link</span>
              This link uses your local network IP and <strong>NEVER expires or changes</strong>. As long as your phone, tablet, or laptop is on the same Wi-Fi, it works 24/7 without breaking.
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-indigo-300 text-xs leading-relaxed">
              <span className="font-bold text-white block mb-0.5">Public Remote Tunnel Link</span>
              Use this link if the listener is outside your Wi-Fi (e.g. on mobile 4G/5G data). Our background watchdog monitors and auto-heals this link.
            </div>
          )}

          {/* QR Code Center */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div className="p-2.5 bg-white rounded-xl shadow-lg">
              <img src={qrUrl} alt="Room QR Code" className="w-44 h-44 object-contain" />
            </div>
            <span className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 font-medium">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              Scan with any phone camera to open instantly
            </span>
          </div>

          {/* Link URL with Copy */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Listener Link
            </label>
            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <input
                type="text"
                readOnly
                value={activeLink}
                className="bg-transparent text-xs text-white font-mono flex-1 focus:outline-none truncate"
              />
              <button
                onClick={() => copyToClipboard(activeLink, activeTab)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0"
              >
                {copiedType === activeTab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === activeTab ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">Direct host: <code className="text-slate-300">{localUrl}</code></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
