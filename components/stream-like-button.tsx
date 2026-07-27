'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { requestLabLikes, sendLabLikes } from '@/lib/explorer-api/lab-stream';
import { cn } from '@/lib/utils';

type FloatingHeart = {
  id: number;
  drift: number;
  color: string;
  size: number;
  duration: number;
};

const LIKES_POLL_MS = 5_000;
// Rapid taps are batched into one POST after this quiet period.
const FLUSH_DEBOUNCE_MS = 600;
// Server clamps a single POST to this many likes; flush eagerly at the cap.
const MAX_LIKES_PER_REQUEST = 25;
// Cap hearts animated per remote sync so a big burst stays a stream, not a wall.
const MAX_REMOTE_HEARTS = 12;

const HEART_COLORS = [
  'text-rose-500 fill-rose-500',
  'text-pink-400 fill-pink-400',
  'text-red-500 fill-red-500',
  'text-orange-400 fill-orange-400',
  'text-purple-400 fill-purple-400',
  'text-fuchsia-500 fill-fuchsia-500',
];

export default function StreamLikeButton() {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [popping, setPopping] = useState(false);

  // Last known shared total; tracked only to float other viewers' likes.
  const totalRef = useRef<number | null>(null);
  // Taps accrued locally but not yet sent to the server.
  const pendingRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartSeq = useRef(0);
  const mountedRef = useRef(true);
  const remoteTimersRef = useRef<number[]>([]);

  const spawnHeart = useCallback(() => {
    const id = heartSeq.current++;
    const heart: FloatingHeart = {
      id,
      drift: Math.round((Math.random() - 0.5) * 72),
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      size: 20 + Math.round(Math.random() * 12),
      duration: 1.5 + Math.random() * 0.9,
    };
    // Bound the live DOM against tap-spam plus remote bursts.
    setHearts((prev) => [...prev.slice(-30), heart]);
    window.setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, heart.duration * 1000 + 100);
  }, []);

  // Other viewers' likes rain down as hearts too.
  const reconcile = useCallback(
    (serverValue: number) => {
      if (!mountedRef.current) return;
      const current = totalRef.current;
      if (current !== null && serverValue > current) {
        const burst = Math.min(serverValue - current, MAX_REMOTE_HEARTS);
        for (let i = 0; i < burst; i++) {
          const timer = window.setTimeout(spawnHeart, Math.random() * 2_500);
          remoteTimersRef.current.push(timer);
        }
      }
      // Unflushed optimistic taps aren't in the server value yet; only climb.
      totalRef.current = current === null ? serverValue : Math.max(current, serverValue);
    },
    [spawnHeart],
  );

  useEffect(() => {
    mountedRef.current = true;

    async function sync() {
      try {
        reconcile(await requestLabLikes());
      } catch {
        // best-effort
      }
    }

    void sync();
    const interval = window.setInterval(sync, LIKES_POLL_MS);
    const timers = remoteTimersRef.current;
    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [reconcile]);

  const flush = useCallback(async () => {
    const count = Math.min(pendingRef.current, MAX_LIKES_PER_REQUEST);
    if (count <= 0) return;
    pendingRef.current -= count;
    try {
      const serverTotal = await sendLabLikes(count);
      reconcile(serverTotal);
    } catch {
      // Roll the failed taps back into pending so a later flush retries them.
      pendingRef.current += count;
    }
    // Sustained tapping can accrue beyond one request's clamp; drain the rest.
    if (pendingRef.current > 0 && mountedRef.current) {
      flushTimerRef.current = setTimeout(() => void flush(), FLUSH_DEBOUNCE_MS);
    }
  }, [reconcile]);

  const onLike = useCallback(() => {
    totalRef.current = (totalRef.current ?? 0) + 1;
    pendingRef.current += 1;
    spawnHeart();

    setPopping(true);
    window.setTimeout(() => setPopping(false), 350);

    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    if (pendingRef.current >= MAX_LIKES_PER_REQUEST) {
      void flush();
    } else {
      flushTimerRef.current = setTimeout(() => void flush(), FLUSH_DEBOUNCE_MS);
    }
  }, [flush, spawnHeart]);

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col items-center">
      {/* Floating hearts rise from just above the button. */}
      <div className="relative h-0 w-0">
        {hearts.map((h) => (
          <span
            key={h.id}
            className="float-heart absolute bottom-10 left-1/2"
            style={{
              ['--drift' as string]: `${h.drift}px`,
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
          'pointer-events-auto rounded-full border border-white/20 bg-black/50 p-2.5 text-white backdrop-blur transition-colors hover:bg-black/70',
          popping && 'like-pop',
        )}
      >
        <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
      </button>
    </div>
  );
}
