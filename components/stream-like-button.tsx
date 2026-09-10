'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

// Likes fan out to the lab overlay only; the explorer never renders hearts.
const LIKE_WS_URL = process.env.NEXT_PUBLIC_LIKE_WS_URL;
const FLUSH_DEBOUNCE_MS = 400;
const MAX_LIKES_PER_MESSAGE = 25;

export default function StreamLikeButton() {
  const [popping, setPopping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Send-only socket: taps reach the lab overlay; nothing renders here.
  useEffect(() => {
    if (!LIKE_WS_URL) return;
    let cancelled = false;
    let retryMs = 1000;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(LIKE_WS_URL as string);
      wsRef.current = ws;
      ws.onopen = () => {
        retryMs = 1000;
      };
      ws.onclose = () => {
        // A stale close (strict-mode remount) must not clobber the live socket.
        if (wsRef.current === ws) wsRef.current = null;
        if (!cancelled) {
          window.setTimeout(connect, retryMs);
          retryMs = Math.min(retryMs * 2, 10_000);
        }
      };
    }

    connect();
    // Keepalive: defeats NAT/idle timeouts so taps are never dropped on a zombie socket.
    const ka = window.setInterval(() => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) ws.send('{"ping":1}');
    }, 25_000);
    return () => {
      cancelled = true;
      window.clearInterval(ka);
      wsRef.current?.close();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  const flush = useCallback(() => {
    const ws = wsRef.current;
    const count = Math.min(pendingRef.current, MAX_LIKES_PER_MESSAGE);
    if (count <= 0) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pendingRef.current = 0;
      return;
    }
    pendingRef.current -= count;
    ws.send(JSON.stringify({ likes: count }));
    if (pendingRef.current > 0) {
      flushTimerRef.current = setTimeout(flush, FLUSH_DEBOUNCE_MS);
    }
  }, []);

  const onLike = useCallback(() => {
    // Button pops locally; the heart itself only appears on the lab overlay.
    setPopping(true);
    window.setTimeout(() => setPopping(false), 350);

    if (LIKE_WS_URL) {
      pendingRef.current += 1;
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (pendingRef.current >= MAX_LIKES_PER_MESSAGE) {
        flush();
      } else {
        flushTimerRef.current = setTimeout(flush, FLUSH_DEBOUNCE_MS);
      }
    }
  }, [flush]);

  return (
    // bottom-16 clears the player's control bar so fullscreen stays reachable.
    <div className="pointer-events-none absolute bottom-16 right-3 z-10 flex flex-col items-center">
      <button
        type="button"
        onClick={onLike}
        aria-label="Like the stream"
        className={cn(
          'pointer-events-auto rounded-full bg-black/50 p-2.5 text-white backdrop-blur transition-colors hover:bg-black/70',
          popping && 'like-pop',
        )}
      >
        <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
      </button>
    </div>
  );
}
