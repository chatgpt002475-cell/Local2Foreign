import React, { useState, useRef } from 'react';
import {
  X,
  Volume2,
  Mic,
  Square,
  Upload,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  User,
  Sliders,
  AudioWaveform,
} from 'lucide-react';
import { LanguageCapability, VoiceOption, CustomVoiceProfile } from '../types';
import { globalAudioPlayer } from '../services/audioPlayer';

interface VoiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLang: string;
  languages: LanguageCapability[];
  selectedVoice?: string;
  selectedPitch?: string;
  selectedRate?: string;
  onApplyVoice: (voice: string, pitch: string, rate: string, customProfile?: CustomVoiceProfile) => void;
}

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
  isOpen,
  onClose,
  targetLang,
  languages,
  selectedVoice,
  selectedPitch = '+0Hz',
  selectedRate = '+0%',
  onApplyVoice,
}) => {
  const currentLang = languages.find((l) => l.code === targetLang);
  const voiceOptions: VoiceOption[] = currentLang?.voices || [];

  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const [chosenVoice, setChosenVoice] = useState(selectedVoice || currentLang?.default_voice || '');
  const [pitchHz, setPitchHz] = useState<number>(parseInt(selectedPitch) || 0);
  const [speedRate, setSpeedRate] = useState<number>(parseInt(selectedRate) || 0);

  // Custom Voice Studio State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CustomVoiceProfile | null>(null);
  const customVoiceName = 'My Custom Voice';
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const filteredVoices = voiceOptions.filter((v) => {
    if (genderFilter === 'All') return true;
    return v.gender.toLowerCase() === genderFilter.toLowerCase();
  });

  const handleTestVoice = async (voiceId: string, pitchVal: number, rateVal: number) => {
    setIsPreviewPlaying(true);
    try {
      const pitchStr = `${pitchVal >= 0 ? '+' : ''}${pitchVal}Hz`;
      const rateStr = `${rateVal >= 0 ? '+' : ''}${rateVal}%`;
      const sampleText =
        currentLang?.sample_phrases[0]?.english ||
        `This is a live preview of the ${genderFilter !== 'All' ? genderFilter : ''} voice tone.`;

      const res = await fetch('/api/voice/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          language: targetLang,
          voice: voiceId,
          pitch: pitchStr,
          rate: rateStr,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio_base64) {
          globalAudioPlayer.playBase64(data.audio_base64, data.format || 'audio/mp3');
        }
      }
    } catch (e) {
      console.error('Preview error:', e);
    } finally {
      setTimeout(() => setIsPreviewPlaying(false), 1200);
    }
  };

  // Live 5s Recording for Custom Voice
  const startRecordingSample = async () => {
    setUploadError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await uploadAndAnalyzeAudio(blob, 'sample_recording.wav');
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 4) {
            stopRecordingSample();
            return 5;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      setUploadError('Microphone permission denied for voice sample.');
    }
  };

  const stopRecordingSample = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Upload sample file handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    await uploadAndAnalyzeAudio(file, file.name);
  };

  const uploadAndAnalyzeAudio = async (blob: Blob, fileName: string) => {
    setIsAnalyzing(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('target_language', targetLang);
      formData.append('custom_name', customVoiceName);

      const res = await fetch('/api/voice/analyze-sample', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to calibrate voice from sample');
      }

      const result: CustomVoiceProfile = await res.json();
      setAnalysisResult(result);
      setChosenVoice(result.suggested_base_voice);
      setPitchHz(parseInt(result.suggested_pitch) || 0);
      setSpeedRate(parseInt(result.suggested_rate) || 0);

      // Play the preview
      if (result.preview_audio_base64) {
        globalAudioPlayer.playBase64(result.preview_audio_base64, 'audio/mp3');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error analyzing voice sample');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    const pitchStr = `${pitchHz >= 0 ? '+' : ''}${pitchHz}Hz`;
    const rateStr = `${speedRate >= 0 ? '+' : ''}${speedRate}%`;
    onApplyVoice(chosenVoice, pitchStr, rateStr, analysisResult || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <AudioWaveform className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Voice & Tone Studio</h3>
              <p className="text-xs text-slate-400">
                Target Language: <span className="text-indigo-300 font-semibold">{currentLang?.name}</span> ({targetLang})
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

        {/* Studio Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('preset')}
            className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'preset'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            Men & Women Neural Voices
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-3.5 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'custom'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Clone / Customize Voice Sample
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {activeTab === 'preset' ? (
            <>
              {/* Gender Filter Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Select Speaker Gender
                </label>
                <div className="flex gap-2">
                  {(['All', 'Male', 'Female'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGenderFilter(g)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${
                        genderFilter === g
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {g === 'Male' && '👨'}
                      {g === 'Female' && '👩'}
                      {g === 'All' && '👥'}
                      {g === 'Male' ? 'Men (Male)' : g === 'Female' ? 'Women (Female)' : 'All Voices'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Card Grid */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Available Regional Neural Voices ({filteredVoices.length})
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {filteredVoices.map((v) => {
                    const isSelected = chosenVoice === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setChosenVoice(v.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/50 shadow-md'
                            : 'bg-slate-800/40 border-slate-700/70 hover:bg-slate-800/80 hover:border-slate-600'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-white truncate">{v.name}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                v.gender.toLowerCase() === 'female'
                                  ? 'bg-pink-950/70 text-pink-400 border border-pink-800/60'
                                  : 'bg-blue-950/70 text-blue-400 border border-blue-800/60'
                              }`}
                            >
                              {v.gender}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-indigo-300 font-medium">{v.accent_label}</span>
                            <span className="text-xs text-slate-500">• {v.region}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestVoice(v.id, pitchHz, speedRate);
                            }}
                            title="Preview Voice Audio"
                            className="p-1.5 rounded-lg bg-slate-700/60 text-slate-300 hover:bg-indigo-600 hover:text-white transition"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tone Pitch & Cadence Sliders */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    Tone & Pitch Modulation
                  </span>
                  <span className="text-xs font-mono text-indigo-400 font-bold">
                    {pitchHz >= 0 ? `+${pitchHz}Hz` : `${pitchHz}Hz`} ({pitchHz < 0 ? 'Deeper' : pitchHz > 0 ? 'Higher' : 'Natural'})
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="2"
                  value={pitchHz}
                  onChange={(e) => setPitchHz(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-20Hz (Deep Baritone)</span>
                  <span>0Hz (Neutral)</span>
                  <span>+20Hz (Bright High)</span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Speech Cadence / Speed</span>
                  <span className="text-xs font-mono text-indigo-400 font-bold">
                    {speedRate >= 0 ? `+${speedRate}%` : `${speedRate}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="5"
                  value={speedRate}
                  onChange={(e) => setSpeedRate(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>-30% (Deliberate)</span>
                  <span>0% (Standard)</span>
                  <span>+30% (Energetic)</span>
                </div>
              </div>
            </>
          ) : (
            /* Custom Voice Studio Tab */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 text-purple-200 text-xs leading-relaxed">
                <span className="font-bold text-white block mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Instant Voice Calibration
                </span>
                Upload a 2-10 second speech recording or record your voice live below. Our acoustic analyzer
                extracts your natural pitch frequency ($F_0$) and cadence to synthesize translated speech in your personal vocal tone.
              </div>

              {/* Live Record or Upload Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: Live Record */}
                <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-center space-y-3">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
                      isRecording
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Record 5s Sample</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isRecording ? `Recording: ${recordingSeconds}s / 5s` : 'Speak naturally into your microphone'}
                    </p>
                  </div>
                  {isRecording ? (
                    <button
                      onClick={stopRecordingSample}
                      className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      Stop & Analyze
                    </button>
                  ) : (
                    <button
                      onClick={startRecordingSample}
                      disabled={isAnalyzing}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      Start Recording
                    </button>
                  )}
                </div>

                {/* Option 2: Upload Audio */}
                <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Upload Speech Audio</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Supports .wav, .mp3, .m4a audio clips</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition border border-slate-700 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Select File
                  </button>
                </div>
              </div>

              {isAnalyzing && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800 text-center animate-pulse flex items-center justify-center gap-2 text-indigo-300 text-xs font-semibold">
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Analyzing acoustic harmonics and fundamental frequency (F0)...
                </div>
              )}

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                  {uploadError}
                </div>
              )}

              {/* Analysis Results Display */}
              {analysisResult && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/50 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Calibrated Vocal Profile
                    </span>
                    <span className="text-xs font-semibold text-purple-300">
                      {analysisResult.detected_gender} Voice Match
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Pitch F0</span>
                      <span className="font-mono font-bold text-white">{analysisResult.detected_f0_hz} Hz</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Pitch Offset</span>
                      <span className="font-mono font-bold text-indigo-400">{analysisResult.suggested_pitch}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase">Base Voice</span>
                      <span className="font-semibold text-white truncate block">
                        {analysisResult.suggested_base_voice_name.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 italic">{analysisResult.notes}</p>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleTestVoice(chosenVoice, pitchHz, speedRate)}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Replay Calibration Audio
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => handleTestVoice(chosenVoice, pitchHz, speedRate)}
            disabled={isPreviewPlaying}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
          >
            <Play className={`w-3.5 h-3.5 ${isPreviewPlaying ? 'animate-bounce' : ''}`} />
            Preview Tone
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Apply Voice & Tone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
