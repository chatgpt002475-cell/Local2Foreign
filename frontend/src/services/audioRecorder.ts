/**
 * LiveVoice Audio Recorder
 * Captures microphone audio, resamples to 16kHz mono PCM, calculates RMS/energy for VAD,
 * and passes framed audio chunks to the WebSocket streaming pipeline.
 */

export interface AudioFrameCallback {
  (pcmData: Int16Array, volumeLevel: number): void;
}

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRecording = false;
  private onFrameCallback: AudioFrameCallback | null = null;
  private targetSampleRate = 16000;

  constructor() {}

  public async start(onFrame: AudioFrameCallback, deviceId?: string): Promise<void> {
    if (this.isRecording) return;
    this.onFrameCallback = onFrame;

    const constraints: MediaStreamConstraints = {
      audio: {
        channelCount: 1,
        sampleRate: { ideal: this.targetSampleRate },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
      video: false,
    };

    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const sourceSampleRate = this.audioContext.sampleRate;
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Buffer size 4096 gives ~85ms latency at 48kHz
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording || !this.onFrameCallback) return;

      const inputBuffer = e.inputBuffer.getChannelData(0);

      // Compute RMS volume (0 - 100 scale)
      let sum = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        sum += inputBuffer[i] * inputBuffer[i];
      }
      const rms = Math.sqrt(sum / inputBuffer.length);
      const volumeLevel = Math.min(100, Math.round(rms * 400));

      // Resample to 16kHz
      const resampled = this.resampleAudio(inputBuffer, sourceSampleRate, this.targetSampleRate);

      // Convert Float32 to 16-bit signed PCM
      const pcm16 = new Int16Array(resampled.length);
      for (let i = 0; i < resampled.length; i++) {
        const s = Math.max(-1, Math.min(1, resampled[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      this.onFrameCallback(pcm16, volumeLevel);
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
    this.isRecording = true;
  }

  public stop(): void {
    this.isRecording = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.onFrameCallback = null;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  private resampleAudio(
    inputData: Float32Array,
    fromSampleRate: number,
    toSampleRate: number
  ): Float32Array {
    if (fromSampleRate === toSampleRate) {
      return inputData;
    }
    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(inputData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const originalIndex = i * ratio;
      const indexFloor = Math.floor(originalIndex);
      const indexCeil = Math.min(inputData.length - 1, Math.ceil(originalIndex));
      const fraction = originalIndex - indexFloor;
      result[i] = (1 - fraction) * inputData[indexFloor] + fraction * inputData[indexCeil];
    }
    return result;
  }
}
