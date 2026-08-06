'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requestLabStatus, type LabStreamStatus } from '@/lib/explorer-api/lab-stream';
import StreamLikeButton from '@/components/stream-like-button';
import R2StreamPlayer from '@/components/r2-stream-player';
import WhepPlayer from '@/components/whep-player';

type StreamStatus = 'loading' | 'live' | 'waiting' | 'error';

// When set (e.g. https://stream.bunkercoin.com/live/live.m3u8) the panel plays
// R2-backed HLS directly instead of Cloudflare Stream.
const R2_HLS_URL = process.env.NEXT_PUBLIC_STREAM_HLS_URL;
// Sub-second WebRTC live view; unset or unreachable falls back to HLS.
const WHEP_URL = process.env.NEXT_PUBLIC_WHEP_URL;

const MANIFEST_POLL_MS = 5000;
// Manifest unchanged for this long means the encoder stopped pushing.
const STALE_AFTER_MS = 20_000;

export default function LivestreamPanel() {
  if (R2_HLS_URL) return <R2Panel src={R2_HLS_URL} />;
  return <CloudflarePanel />;
}

function R2Panel({ src }: { src: string }) {
  const [status, setStatus] = useState<StreamStatus>('loading');
  const [message, setMessage] = useState('Loading live view');
  // WebRTC first for sub-second latency, HLS as a temporary stand-in: a blip
  // (or the ingest's own restart) must not strand a long-lived tab on HLS.
  const [mode, setMode] = useState<'webrtc' | 'hls'>(WHEP_URL ? 'webrtc' : 'hls');
  const [attempt, setAttempt] = useState(0);
  const lastManifest = useRef<{ body: string; at: number }>({ body: '', at: 0 });
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const whepLive = useCallback(() => {
    setStatus('live');
    setMessage('Live from the radio lab');
    setAttempt(0); // a good connection earns a fast retry next time
  }, []);

  const whepDown = useCallback(() => {
    setMode('hls');
    setAttempt((n) => n + 1);
  }, []);

  // Retry WebRTC on a backoff (10s → 2min) while HLS keeps the picture up.
  useEffect(() => {
    if (mode !== 'hls' || !WHEP_URL || attempt === 0) return;
    const delay = Math.min(10_000 * 2 ** (attempt - 1), 120_000);
    retryRef.current = setTimeout(() => setMode('webrtc'), delay);
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [mode, attempt]);

  useEffect(() => {
    if (mode !== 'hls') return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(src, { cache: 'no-store' });
        if (!res.ok) throw new Error(`manifest ${res.status}`);
        const body = await res.text();
        if (cancelled) return;
        const now = Date.now();
        if (body !== lastManifest.current.body) {
          lastManifest.current = { body, at: now };
        }
        if (now - lastManifest.current.at < STALE_AFTER_MS) {
          setStatus('live');
          setMessage('Live from the radio lab');
        } else {
          setStatus('waiting');
          setMessage('Waiting for live video');
        }
      } catch {
        if (!cancelled) {
          setStatus('waiting');
          setMessage('Live view is not available yet');
        }
      }
    }

    void poll();
    const interval = window.setInterval(poll, MANIFEST_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [src, mode]);

  return (
    <PanelChrome status={status} message={message}>
      {mode === 'webrtc' && WHEP_URL && (
        // key forces a fresh peer connection on every retry.
        <WhepPlayer key={attempt} src={WHEP_URL} onLive={whepLive} onDown={whepDown} />
      )}
      {mode === 'hls' && status === 'live' && <R2StreamPlayer src={src} />}
    </PanelChrome>
  );
}

function CloudflarePanel() {
  const [status, setStatus] = useState<StreamStatus>('loading');
  const [message, setMessage] = useState('Loading live view');
  const [labStatus, setLabStatus] = useState<LabStreamStatus | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const nextStatus = await requestLabStatus();
        if (cancelled) return;

        setLabStatus(nextStatus);
        if (nextStatus.playback?.iframeUrl && shouldUseNextPlayerUrl(playerUrl, nextStatus)) {
          setPlayerUrl(nextStatus.playback.iframeUrl);
        }

        if (!nextStatus.inputId || !nextStatus.playback) {
          setStatus('waiting');
          setMessage('Live view is not available yet');
          return;
        }

        if (nextStatus.live === false) {
          setStatus('waiting');
          setMessage('Waiting for live video');
          return;
        }

        setStatus('live');
        setMessage('Live from the radio lab');
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage(error instanceof Error ? error.message : 'Unable to load live view');
        }
      }
    }

    void loadStatus();
    const interval = window.setInterval(loadStatus, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [playerUrl]);

  const iframeUrl = playerUrl || labStatus?.playback?.iframeUrl;
  const iframeSrc = useMemo(() => {
    if (!iframeUrl) return null;
    const separator = iframeUrl.includes('?') ? '&' : '?';
    return `${iframeUrl}${separator}autoplay=true&muted=true&controls=true`;
  }, [iframeUrl]);
  const shouldRenderPlayer = status === 'live' && Boolean(iframeSrc);

  return (
    <PanelChrome status={status} message={message}>
      {shouldRenderPlayer && (
        <iframe
          src={iframeSrc ?? undefined}
          title="Live View"
          className="absolute left-0 top-0 h-full w-full border-0"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      )}
    </PanelChrome>
  );
}

function PanelChrome({
  status,
  message,
  children,
}: {
  status: StreamStatus;
  message: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-border bg-card/50">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">BunkerCoin Lab</h2>
          <p className="text-xs text-muted-foreground">Live session broadcast</p>
        </div>
        <span className={statusBadgeClassName(status)}>
          {status === 'live' ? 'Live' : status === 'error' ? 'Offline' : 'Idle'}
        </span>
      </div>
      <div className="relative bg-black">
        <div className="relative pt-[56.25%]">{children}</div>
        {status === 'live' && <StreamLikeButton />}
        {status !== 'live' && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 px-6 text-center">
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function statusBadgeClassName(status: StreamStatus) {
  const base = 'rounded-md px-2 py-1 text-xs font-medium';
  if (status === 'live') return `${base} bg-emerald-500/20 text-emerald-400`;
  if (status === 'error') return `${base} bg-red-500/20 text-red-400`;
  return `${base} bg-muted text-muted-foreground`;
}

function shouldUseNextPlayerUrl(currentUrl: string | null, nextStatus: LabStreamStatus) {
  const nextUrl = nextStatus.playback?.iframeUrl;
  if (!nextUrl) return false;
  if (!currentUrl) return true;
  if (!nextStatus.activeVideoUid) return false;

  return !currentUrl.includes(nextStatus.activeVideoUid);
}
