'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { requestLabLikes, sendLabLikes } from '@/lib/explorer-api/lab-stream';
import { cn } from '@/lib/utils';

type FloatingHeart = { id: number; drift: number };

// Poll the shared total on this cadence so all viewers converge on the real
// count. Kept in step with the panel's own 15s status poll.
const LIKES_POLL_MS = 15_000;
// Rapid taps are batched into one POST after this quiet period, so a viewer
// spamming the heart produces a single request carrying the tap count.
const FLUSH_DEBOUNCE_MS = 600;

export default function StreamLikeButton() {
  const [total, setTotal] = useState<number | null>(null);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [popping, setPopping] = useState(false);

  // Taps accrued locally but not yet sent to the server.
  const pendingRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartSeq = useRef(0);
  const mountedRef = useRef(true);

  // Initial load + periodic sync of the authoritative total.
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function sync() {
      try {
        const value = await requestLabLikes();
        // Never let a poll show fewer than we're already displaying: unflushed
        // optimistic taps aren't in the server value yet, and the count should
        // only ever climb. It reconciles upward once the pending flush lands.
        if (!cancelled) setTotal((prev) => (prev === null ? value : Math.max(prev, value)));
      } catch {
        // best-effort; leave the current number in place
      }
    }

    void sync();
    const interval = window.setInterval(sync, LIKES_POLL_MS);
    return () => {
      cancelled = true;
      mountedRef.current = false;
      window.clearInterval(interval);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, []);

  const flush = useCallback(async () => {
    const count = pendingRef.current;
    if (count <= 0) return;
    pendingRef.current = 0;
    try {
      const serverTotal = await sendLabLikes(count);
      if (mountedRef.current) setTotal(serverTotal);
    } catch {
      // Roll the failed taps back into pending so a later flush retries them.
      pendingRef.current += count;
    }
  }, []);

  const onLike = useCallback(() => {
    // Optimistic: bump the count and spawn a heart immediately.
    setTotal((prev) => (prev ?? 0) + 1);
    pendingRef.current += 1;

    const id = heartSeq.current++;
    const drift = Math.round((Math.random() - 0.5) * 60); // -30..30px
    setHearts((prev) => [...prev, { id, drift }]);
    window.setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1600);

    setPopping(true);
    window.setTimeout(() => setPopping(false), 350);

    // Debounce the network write so a burst of taps is one request.
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => void flush(), FLUSH_DEBOUNCE_MS);
  }, [flush]);

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col items-center">
      {/* Floating hearts rise from just above the button. */}
      <div className="relative h-0 w-0">
        {hearts.map((h) => (
          <span
            key={h.id}
            className="float-heart absolute bottom-10 left-1/2 text-rose-500"
            style={{ ['--drift' as string]: `${h.drift}px` }}
            aria-hidden
          >
            <Heart className="h-6 w-6 fill-rose-500" />
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onLike}
        aria-label="Like the stream"
        className={cn(
          'pointer-events-auto flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-black/70',
          popping && 'like-pop',
        )}
      >
        <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
        <span className="tabular-nums">{formatLikes(total)}</span>
      </button>
    </div>
  );
}

function formatLikes(n: number | null): string {
  if (n === null) return '…';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
