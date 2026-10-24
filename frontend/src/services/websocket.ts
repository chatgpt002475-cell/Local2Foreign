import { AudioLatencyMetrics, TranscriptItem } from '../types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface RoomStats {
  room_id: string;
  speaker_online: boolean;
  listener_count: number;
  listener_languages: string[];
}

export interface ListenerReaction {
  emoji: string;
  sender_name: string;
  timestamp: string;
}

export interface WSMessageHandlers {
  onStatusChange?: (status: ConnectionStatus) => void;
  onTranscript?: (item: TranscriptItem) => void;
  onAudioChunk?: (data: { seq_id: number; audio_base64: string; format: string; is_final: boolean }) => void;
  onMetrics?: (metrics: AudioLatencyMetrics) => void;
  onError?: (error: string) => void;
  onSessionStarted?: (sessionId: string) => void;
  onRoomStats?: (stats: RoomStats) => void;
  onListenerReaction?: (reaction: ListenerReaction) => void;
}

export class LiveTranslationWS {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: WSMessageHandlers;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private isExplicitlyClosed = false;
  private sessionId: string | null = null;
  private currentStatus: ConnectionStatus = 'disconnected';

  constructor(handlers: WSMessageHandlers = {}) {
    this.handlers = handlers;
    this.url = LiveTranslationWS.resolveWsUrl();
  }

  public static resolveWsUrl(): string {
    if (typeof window === 'undefined') {
      return 'ws://localhost:8000/ws/translate';
    }

    const isHttps = window.location.protocol === 'https:';
    const protocol = isHttps ? 'wss:' : 'ws:';
    const hostname = window.location.hostname || 'localhost';
    const port = window.location.port;

    // If accessing via Vite dev port 5173 or other dev server, connect directly to FastAPI port 8000
    if (port === '5173' || port === '3000') {
      return `${protocol}//${hostname}:8000/ws/translate`;
    }

    // Default to current host or fallback to port 8000
    const host = window.location.host || 'localhost:8000';
    return `${protocol}//${host}/ws/translate`;
  }

  public setHandlers(handlers: WSMessageHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  public getStatus(): ConnectionStatus {
    return this.currentStatus;
  }

  private setStatus(status: ConnectionStatus) {
    this.currentStatus = status;
    if (this.handlers.onStatusChange) {
      this.handlers.onStatusChange(status);
    }
  }

  public connect(config: {
    sourceLang: string;
    targetLang: string;
    autoDetect: boolean;
    provider?: string;
    voice?: string;
    pitch?: string;
    rate?: string;
    role?: 'speaker' | 'listener';
    roomId?: string;
  }) {
    this.isExplicitlyClosed = false;
    this.setStatus('connecting');

    try {
      if (this.ws) {
        try {
          this.ws.close();
        } catch {
          // ignore
        }
        this.ws = null;
      }

      console.log(`[WebSocket] Connecting to ${this.url} (Role: ${config.role || 'speaker'}, Room: ${config.roomId || 'none'})...`);
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('[WebSocket] Connection established successfully.');
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // Clear any previous error on successful connection
        if (this.handlers.onError) {
          this.handlers.onError('');
        }

        // Send start session configuration
        this.sendJSON({
          type: 'start_session',
          role: config.role || 'speaker',
          room_id: config.roomId,
          source_lang: config.sourceLang,
          target_lang: config.targetLang,
          auto_detect: config.autoDetect,
          provider: config.provider || 'local_edge',
          voice: config.voice,
          pitch: config.pitch || '+0Hz',
          rate: config.rate || '+0%',
        });
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const data = jsonParse(event.data);
            this.handleJSONMessage(data);
          } catch (e) {
            console.error('Failed to parse WS text message:', e);
          }
        }
      };

      this.ws.onerror = (e) => {
        console.warn('[WebSocket] Connection event error:', e);
        // Do not immediately trigger permanent failure if reconnect attempts remain
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.setStatus('error');
          if (this.handlers.onError) {
            this.handlers.onError('Unable to connect to live voice server. Please check connection.');
          }
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (!this.isExplicitlyClosed) {
          this.attemptReconnect(config);
        } else {
          this.setStatus('disconnected');
        }
      };
    } catch (err) {
      this.setStatus('error');
      if (this.handlers.onError) {
        this.handlers.onError(err instanceof Error ? err.message : 'Connection failed');
      }
    }
  }

  private handleJSONMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case 'session_started':
        this.sessionId = msg.session_id as string;
        if (this.handlers.onSessionStarted) {
          this.handlers.onSessionStarted(this.sessionId);
        }
        break;

      case 'pong':
        break;

      case 'room_stats':
        if (this.handlers.onRoomStats) {
          this.handlers.onRoomStats({
            room_id: (msg.room_id as string) || '',
            speaker_online: Boolean(msg.speaker_online),
            listener_count: (msg.listener_count as number) || 0,
            listener_languages: (msg.listener_languages as string[]) || [],
          });
        }
        break;

      case 'listener_reaction':
        if (this.handlers.onListenerReaction) {
          this.handlers.onListenerReaction({
            emoji: (msg.emoji as string) || '👏',
            sender_name: (msg.sender_name as string) || 'Listener',
            timestamp: (msg.timestamp as string) || '',
          });
        }
        break;

      case 'transcript':
        if (this.handlers.onTranscript) {
          this.handlers.onTranscript({
            id: (msg.id as string) || `item-${Date.now()}`,
            seq_id: (msg.seq_id as number) || 0,
            timestamp: (msg.timestamp as string) || new Date().toISOString(),
            source_lang: (msg.source_lang as string) || 'te',
            target_lang: (msg.target_lang as string) || 'en',
            source_text: (msg.source_text as string) || '',
            translated_text: (msg.translated_text as string) || '',
            is_final: Boolean(msg.is_final),
            audio_base64: (msg.audio_base64 as string) || undefined,
            metrics: msg.metrics as AudioLatencyMetrics | undefined,
          });
        }
        break;

      case 'audio_chunk':
        if (this.handlers.onAudioChunk) {
          this.handlers.onAudioChunk({
            seq_id: (msg.seq_id as number) || 0,
            audio_base64: (msg.audio_base64 as string) || '',
            format: (msg.format as string) || 'audio/mp3',
            is_final: Boolean(msg.is_final),
          });
        }
        break;

      case 'metrics':
        if (this.handlers.onMetrics) {
          this.handlers.onMetrics(msg.metrics as AudioLatencyMetrics);
        }
        break;

      case 'error':
        if (this.handlers.onError) {
          this.handlers.onError((msg.message as string) || 'Server processing error');
        }
        break;

      default:
        console.debug('Unknown WS message type:', msg);
    }
  }

  public sendAudioFrame(pcm16: Int16Array) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(pcm16.buffer);
    }
  }

  public sendTextMessage(text: string, sourceLang?: string, targetLang?: string) {
    this.sendJSON({
      type: 'text_input',
      text,
      source_lang: sourceLang,
      target_lang: targetLang,
    });
  }

  public sendReaction(emoji: string, senderName: string = 'Listener') {
    this.sendJSON({
      type: 'reaction',
      emoji,
      sender_name: senderName,
    });
  }

  public updateLanguages(sourceLang: string, targetLang: string, autoDetect: boolean, voice?: string, pitch?: string, rate?: string) {
    this.sendJSON({
      type: 'update_config',
      source_lang: sourceLang,
      target_lang: targetLang,
      auto_detect: autoDetect,
      voice: voice,
      pitch: pitch,
      rate: rate,
    });
  }

  public updateVoice(voice: string, pitch?: string, rate?: string) {
    this.sendJSON({
      type: 'update_config',
      voice,
      pitch,
      rate,
    });
  }

  public sendSpeakerSpeech(text: string, sourceLang?: string, targetLang?: string) {
    const clean = text.trim();
    if (!clean) return;
    this.sendJSON({
      type: 'speaker_speech',
      text: clean,
      source_lang: sourceLang,
      target_lang: targetLang,
    });
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.sendJSON({ type: 'stop_session' });
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private sendJSON(data: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (err) {
        console.error('Failed to send WS message:', err);
      }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.sendJSON({ type: 'ping' });
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnect(config: {
    sourceLang: string;
    targetLang: string;
    autoDetect: boolean;
    provider?: string;
    voice?: string;
    pitch?: string;
    rate?: string;
    role?: 'speaker' | 'listener';
    roomId?: string;
  }) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('error');
      if (this.handlers.onError) {
        this.handlers.onError('Unable to reconnect to server after multiple attempts.');
      }
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 5000);

    // If second attempt fails and we are on a non-standard port or IP, fail over to direct backend port 8000
    if (this.reconnectAttempts >= 2 && typeof window !== 'undefined' && !this.url.includes(':8000') && window.location.protocol !== 'https:') {
      const hostname = window.location.hostname || 'localhost';
      this.url = `ws://${hostname}:8000/ws/translate`;
      console.log(`[WebSocket] Failover attempt to standard backend port 8000: ${this.url}`);
    }

    this.reconnectTimer = window.setTimeout(() => {
      console.log(`[WebSocket] Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect(config);
    }, delay);
  }
}

function jsonParse(str: string): Record<string, unknown> {
  return JSON.parse(str);
}
