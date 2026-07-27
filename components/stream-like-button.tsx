'use client';

import { useCallback, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

type FloatingHeart = {
  id: number;
  drift: number;
  color: string;
  size: number;
  duration: number;
};

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
  const heartSeq = useRef(0);

  const onLike = useCallback(() => {
    const id = heartSeq.current++;
    const heart: FloatingHeart = {
      id,
      drift: Math.round((Math.random() - 0.5) * 72),
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      size: 20 + Math.round(Math.random() * 12),
      duration: 1.5 + Math.random() * 0.9,
    };
    // Bound the live DOM against tap-spam.
    setHearts((prev) => [...prev.slice(-30), heart]);
    window.setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, heart.duration * 1000 + 100);

    setPopping(true);
    window.setTimeout(() => setPopping(false), 350);
  }, []);

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
