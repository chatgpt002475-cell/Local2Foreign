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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:5173';
    this.url = `${protocol}//${host}/ws/translate`;
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
    role?: 'speaker' | 'listener';
    roomId?: string;
  }) {
    this.isExplicitlyClosed = false;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();

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
        console.error('WebSocket error:', e);
        if (this.handlers.onError) {
          this.handlers.onError('WebSocket connection error.');
        }
        this.setStatus('error');
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
            id: (msg.id as string) || `seq-${msg.seq_id}`,
            seq_id: (msg.seq_id as number) || 0,
            timestamp: (msg.timestamp as string) || new Date().toISOString(),
            source_lang: (msg.source_lang as string) || '',
            target_lang: (msg.target_lang as string) || '',
            source_text: (msg.source_text as string) || '',
            translated_text: (msg.translated_text as string) || '',
            is_final: Boolean(msg.is_final),
            audio_base64: msg.audio_base64 as string | undefined,
            metrics: msg.metrics as AudioLatencyMetrics | undefined,
            error: msg.error as string | undefined,
          });
        }
        break;

      case 'audio_chunk':
        if (this.handlers.onAudioChunk) {
          this.handlers.onAudioChunk({
            seq_id: (msg.seq_id as number) || 0,
            audio_base64: msg.audio_base64 as string,
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
          this.handlers.onError((msg.message as string) || 'Server error');
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

  public updateLanguages(sourceLang: string, targetLang: string, autoDetect: boolean, voice?: string) {
    this.sendJSON({
      type: 'update_config',
      source_lang: sourceLang,
      target_lang: targetLang,
      auto_detect: autoDetect,
      voice: voice,
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
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private sendJSON(data: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
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
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    this.reconnectTimer = window.setTimeout(() => {
      console.log(`Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect(config);
    }, delay);
  }
}

function jsonParse(str: string): Record<string, unknown> {
  return JSON.parse(str);
}
