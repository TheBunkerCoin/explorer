'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { requestLabStatus, type LabStreamStatus } from '@/lib/explorer-api/lab-stream';
import StreamLikeButton from '@/components/stream-like-button';
import R2StreamPlayer from '@/components/r2-stream-player';

type StreamStatus = 'loading' | 'live' | 'waiting' | 'error';

// When set (e.g. https://stream.bunkercoin.com/live/live.m3u8) the panel plays
// R2-backed HLS directly instead of Cloudflare Stream.
const R2_HLS_URL = process.env.NEXT_PUBLIC_STREAM_HLS_URL;

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
  const lastManifest = useRef<{ body: string; at: number }>({ body: '', at: 0 });

  useEffect(() => {
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
  }, [src]);

  return (
    <PanelChrome status={status} message={message}>
      {status === 'live' && <R2StreamPlayer src={src} />}
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
