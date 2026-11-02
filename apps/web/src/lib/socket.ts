import { serverMessageSchema, type ServerMessage } from '@mycraft/core';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  close(): void;
}

export interface ConnectOptions {
  url: string;
  onMessage(message: ServerMessage): void;
  onStatus(status: ConnectionStatus): void;
  createSocket?: (url: string) => SocketLike;
  schedule?: (fn: () => void, ms: number) => void;
}

const MAX_DELAY_MS = 15_000;

export function reconnectDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, MAX_DELAY_MS);
}

export function parseMessage(data: unknown): ServerMessage | null {
  if (typeof data !== 'string') return null;
  try {
    const result = serverMessageSchema.safeParse(JSON.parse(data));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function connectSessions(options: ConnectOptions): () => void {
  const createSocket = options.createSocket ?? ((url) => new WebSocket(url) as unknown as SocketLike);
  const schedule = options.schedule ?? ((fn, ms) => void setTimeout(fn, ms));
  let attempt = 0;
  let stopped = false;
  let socket: SocketLike | null = null;

  const open = () => {
    options.onStatus('connecting');
    socket = createSocket(options.url);
    socket.onopen = () => {
      attempt = 0;
      options.onStatus('open');
    };
    socket.onmessage = (event) => {
      const message = parseMessage(event.data);
      if (message) options.onMessage(message);
    };
    socket.onclose = () => {
      if (stopped) return;
      options.onStatus('closed');
      schedule(open, reconnectDelay(attempt));
      attempt += 1;
    };
  };

  open();
  return () => {
    stopped = true;
    socket?.close();
  };
}
