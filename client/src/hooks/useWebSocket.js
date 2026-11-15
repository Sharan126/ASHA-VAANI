import { useEffect, useRef, useCallback, useState } from 'react';

// Determine default WebSocket URL
const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (typeof window === 'undefined') return 'ws://localhost:3001';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) return 'ws://localhost:3001';
  // On cloud hosting (Vercel), only attempt WS if an explicit protocol or secure path is supported
  return null;
};

export function useWebSocket(onMessage, currentRecord = null) {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(1000);
  const [connected, setConnected] = useState(false);
  const [connectionMode, setConnectionMode] = useState('connecting'); // 'websocket' | 'edge' | 'offline'

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const currentRecordRef = useRef(currentRecord);
  currentRecordRef.current = currentRecord;

  // ── Edge Fallback Health Check ──────────────────────────────────────────
  const verifyEdgeHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setConnected(true);
        setConnectionMode('edge');
        // Simulate session start on edge if not already initialized
        onMessageRef.current({
          type: 'SESSION_START',
          sessionId: 'edge-' + Math.random().toString(36).substring(2, 9),
          mode: 'edge'
        });
        return true;
      }
    } catch (_) {}
    return false;
  }, []);

  // ── Connect WebSocket or fallback to Cloud Edge ────────────────────────
  const connect = useCallback(() => {
    const wsUrl = getWsUrl();

    // If on a static cloud host like Vercel with no custom WS proxy, use Edge API
    if (!wsUrl) {
      verifyEdgeHealth().then(ok => {
        if (!ok) {
          setConnected(false);
          setConnectionMode('offline');
        }
      });
      return;
    }

    if (wsRef.current && wsRef.current.readyState < 2) return;

    try {
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setConnected(true);
        setConnectionMode('websocket');
        reconnectDelay.current = 1000;
      };

      ws.onmessage = (e) => {
        try {
          const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          onMessageRef.current(msg);
        } catch (_) {}
      };

      ws.onclose = () => {
        // If WebSocket fails on localhost, check if Edge API responds
        verifyEdgeHealth().then(edgeOk => {
          if (!edgeOk) {
            setConnected(false);
            setConnectionMode('offline');
          }
        });

        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
          connect();
        }, reconnectDelay.current);
      };

      ws.onerror = () => {
        try { ws.close(); } catch (_) {}
      };

      wsRef.current = ws;
    } catch (_) {
      verifyEdgeHealth();
    }
  }, [verifyEdgeHealth]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // ── Send Message (Hybrid: WS if open, else Edge API) ───────────────────
  const send = useCallback(async (msg) => {
    // 1. If WebSocket is OPEN, pipe directly
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
      return;
    }

    // 2. Otherwise route to Cloud Edge API (/api/process-transcript)
    if (msg?.type === 'SIMULATE_TRANSCRIPT' || msg?.type === 'MANUAL_TRANSCRIPT') {
      try {
        const response = await fetch('/api/process-transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: msg.text,
            language: msg.language || 'hi',
            currentRecord: currentRecordRef.current || {}
          })
        });

        if (!response.ok) throw new Error('Edge processing error');
        const data = await response.json();

        // Feed extraction result into app
        onMessageRef.current(data);

        // Native Browser TTS Read-Back fallback if Web Audio stream is unavailable
        if (data.confirmText && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            onMessageRef.current({ type: 'TTS_CHUNK', audio: '' });
            const utterance = new SpeechSynthesisUtterance(data.confirmText);
            const langCodeMap = { hi: 'hi-IN', kn: 'kn-IN', ta: 'ta-IN', te: 'te-IN', en: 'en-IN' };
            utterance.lang = langCodeMap[data.language] || 'en-IN';
            utterance.rate = 0.95;
            utterance.onend = () => {
              onMessageRef.current({ type: 'TTS_COMPLETE' });
            };
            utterance.onerror = () => {
              onMessageRef.current({ type: 'TTS_COMPLETE' });
            };
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          } catch (_) {
            onMessageRef.current({ type: 'TTS_COMPLETE' });
          }
        }
      } catch (err) {
        console.error('[Edge Fallback] Error processing transcript:', err);
        onMessageRef.current({
          type: 'ERROR',
          message: 'Cloud Edge extraction encountered an error. Please try again.'
        });
      }
    } else if (msg?.type === 'BARGE_IN_INTERRUPT') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      onMessageRef.current({ type: 'TTS_ABORTED' });
    }
  }, []);

  const sendBinary = useCallback((buffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(buffer);
    }
  }, []);

  return { connected, connectionMode, send, sendBinary };
}
