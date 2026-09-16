import { useCallback, useEffect, useRef, useState } from 'react';
import type { Command, EngineState } from '@cueclock/shared';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

interface IncomingMessage
  extends Partial<{ type: 'state' | 'error'; state: EngineState; message: string }> {}

export function useEngineSocket() {
  const [state, setState] = useState<EngineState | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryDelay = 1000;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (cancelled) return;
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
      socketRef.current = socket;
      setStatus('connecting');

      socket.onopen = () => {
        retryDelay = 1000;
        setStatus('open');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as IncomingMessage;
          if (data.type === 'state' && data.state) {
            setState(data.state);
          } else if (data.type === 'error' && data.message) {
            setLastError(data.message);
          }
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        setStatus('closed');
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 1.5, 10_000);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      socketRef.current?.close();
    };
  }, []);

  const sendCommand = useCallback((command: Command) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setLastError('Not connected to CueClock server yet - try again in a moment.');
      return;
    }
    setLastError(null);
    socket.send(JSON.stringify(command));
  }, []);

  const clearError = useCallback(() => setLastError(null), []);

  return { state, status, lastError, sendCommand, clearError };
}
