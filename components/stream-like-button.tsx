'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

type FloatingHeart = {
  id: number;
  drift: number;
  color: string;
  size: number;
  duration: number;
  rise: number;
};

// Shared like fan-out; unset = hearts stay local to this viewer.
const LIKE_WS_URL = process.env.NEXT_PUBLIC_LIKE_WS_URL;
const FLUSH_DEBOUNCE_MS = 400;
const MAX_LIKES_PER_MESSAGE = 25;
// Cap hearts per received broadcast so a burst stays a stream, not a wall.
const MAX_REMOTE_HEARTS = 12;

const HEART_COLORS = [
  'text-rose-500 fill-rose-500',
  'text-rose-400 fill-rose-400',
  'text-pink-400 fill-pink-400',
  'text-pink-500 fill-pink-500',
  'text-red-500 fill-red-500',
  'text-red-400 fill-red-400',
];

export default function StreamLikeButton() {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [popping, setPopping] = useState(false);
  const heartSeq = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTimersRef = useRef<number[]>([]);

  const spawnHeart = useCallback(() => {
    const id = heartSeq.current++;
    const heart: FloatingHeart = {
      id,
      drift: Math.round((Math.random() - 0.5) * 90),
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      size: 16 + Math.round(Math.random() * 20),
      duration: 2.2 + Math.random(),
      rise: -(260 + Math.round(Math.random() * 160)),
    };
    // Bound the live DOM against tap-spam plus remote bursts.
    setHearts((prev) => [...prev.slice(-30), heart]);
    window.setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, heart.duration * 1000 + 100);
  }, []);

  // Other viewers' likes rain down here too, live.
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
      ws.onmessage = (e) => {
        let likes: number;
        try {
          likes = Math.floor(Number((JSON.parse(String(e.data)) as { likes?: number }).likes));
        } catch {
          return;
        }
        if (!Number.isFinite(likes) || likes < 1) return;
        const burst = Math.min(likes, MAX_REMOTE_HEARTS);
        for (let i = 0; i < burst; i++) {
          remoteTimersRef.current.push(window.setTimeout(spawnHeart, i === 0 ? 0 : Math.random() * 800));
        }
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
    const timers = remoteTimersRef.current;
    return () => {
      cancelled = true;
      window.clearInterval(ka);
      wsRef.current?.close();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [spawnHeart]);

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
    spawnHeart();
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
  }, [flush, spawnHeart]);

  return (
    // bottom-16 clears the player's control bar so fullscreen stays reachable.
    <div className="pointer-events-none absolute bottom-16 right-3 z-10 flex flex-col items-center">
      {/* Floating hearts rise from just above the button. */}
      <div className="relative h-0 w-0">
        {hearts.map((h) => (
          <span
            key={h.id}
            className="float-heart absolute -bottom-8 left-1/2"
            style={{
              ['--drift' as string]: `${h.drift}px`,
              ['--rise' as string]: `${h.rise}px`,
              animationDuration: `${h.duration}s`,
            }}
            aria-hidden
          >
            <Heart style={{ width: h.size, height: h.size }} className={h.color} />
          </span>
        ))}
      </div>

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
