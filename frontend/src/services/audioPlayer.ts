/**
 * LiveVoice Audio Player
 * Queues and plays translated speech in strict sequence without overlapping.
 */
export class AudioQueuePlayer {
  private queue: { id: string; audioBase64: string; onStart?: () => void; onEnd?: () => void }[] = [];
  private isPlaying = false;
  private isMuted = false;
  private currentAudio: HTMLAudioElement | null = null;
  private volume = 1.0;
  private listeners: ((playing: boolean, currentId?: string) => void)[] = [];

  constructor() {}

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.currentAudio) {
      this.currentAudio.muted = muted;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }

  public enqueue(
    id: string,
    audioBase64: string,
    onStart?: () => void,
    onEnd?: () => void
  ) {
    this.queue.push({ id, audioBase64, onStart, onEnd });
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  public playImmediately(audioBase64: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio();
        audio.src = audioBase64.startsWith('data:')
          ? audioBase64
          : `data:audio/mp3;base64,${audioBase64}`;
        audio.volume = this.volume;
        audio.muted = this.isMuted;
        audio.onended = () => resolve();
        audio.onerror = (e) => reject(e);
        audio.play().catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  public playBase64(audioBase64: string, format = 'audio/mp3'): Promise<void> {
    const src = audioBase64.startsWith('data:')
      ? audioBase64
      : `data:${format};base64,${audioBase64}`;
    return this.playImmediately(src);
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.notifyListeners(false);
      return;
    }

    this.isPlaying = true;
    const item = this.queue.shift()!;
    this.notifyListeners(true, item.id);

    if (item.onStart) item.onStart();

    try {
      await new Promise<void>((resolve) => {
        const audio = new Audio();
        this.currentAudio = audio;
        audio.src = item.audioBase64.startsWith('data:')
          ? item.audioBase64
          : `data:audio/mp3;base64,${item.audioBase64}`;
        audio.volume = this.volume;
        audio.muted = this.isMuted;

        audio.onended = () => {
          this.currentAudio = null;
          resolve();
        };

        audio.onerror = (e) => {
          console.warn('Audio playback error on item:', item.id, e);
          this.currentAudio = null;
          resolve();
        };

        audio.play().catch((err) => {
          console.warn('Audio autoplay prevented or error:', err);
          this.currentAudio = null;
          resolve();
        });
      });
    } finally {
      if (item.onEnd) item.onEnd();
      this.playNext();
    }
  }

  public stopAll() {
    this.queue = [];
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.isPlaying = false;
    this.notifyListeners(false);
  }

  public subscribe(cb: (playing: boolean, currentId?: string) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners(playing: boolean, currentId?: string) {
    this.listeners.forEach((l) => l(playing, currentId));
  }
}

export const globalAudioPlayer = new AudioQueuePlayer();
