'use client';

import { useEffect, useMemo, useState } from 'react';

const EXPLORER_API_URL = process.env.NEXT_PUBLIC_EXPLORER_API_URL || 'http://localhost:8787';

type StreamStatus = 'loading' | 'live' | 'waiting' | 'error';

type LabStatusResponse = {
  data: {
    streamKey: string;
    title: string;
    inputId: string | null;
    live: boolean | null;
    activeVideoUid: string | null;
    playback: {
      iframeUrl: string;
      hlsUrl: string | null;
    } | null;
  };
};

export default function LivestreamPanel() {
  const [status, setStatus] = useState<StreamStatus>('loading');
  const [message, setMessage] = useState('Loading live view');
  const [labStatus, setLabStatus] = useState<LabStatusResponse['data'] | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const nextStatus = await requestLabStatus();
        if (cancelled) return;

        setLabStatus(nextStatus.data);
        if (nextStatus.data.playback?.iframeUrl && shouldUseNextPlayerUrl(playerUrl, nextStatus.data)) {
          setPlayerUrl(nextStatus.data.playback.iframeUrl);
        }

        if (!nextStatus.data.inputId || !nextStatus.data.playback) {
          setStatus('waiting');
          setMessage('Live view is not available yet');
          return;
        }

        if (nextStatus.data.live === false) {
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
        <div className="relative pt-[56.25%]">
          {iframeSrc && (
            <iframe
              src={iframeSrc}
              title="Live View"
              className="absolute left-0 top-0 h-full w-full border-0"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
            />
          )}
        </div>
        {iframeUrl && (
          <span className="sr-only">Live player loaded</span>
        )}
        {status !== 'live' && (
          <div className="absolute inset-0 grid place-items-center bg-black/70 px-6 text-center">
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        )}
      </div>
    </section>
  );
}

async function requestLabStatus(): Promise<LabStatusResponse> {
  const response = await fetch(`${EXPLORER_API_URL.replace(/\/$/, '')}/api/lab/status`, {
    cache: 'no-store',
  });

  const payload = await response.json() as LabStatusResponse | { error?: string };
  if (!response.ok) {
    throw new Error('error' in payload && payload.error ? payload.error : `Explorer API failed with ${response.status}`);
  }

  return payload as LabStatusResponse;
}

function statusBadgeClassName(status: StreamStatus) {
  const base = 'rounded-md px-2 py-1 text-xs font-medium';
  if (status === 'live') return `${base} bg-emerald-500/20 text-emerald-400`;
  if (status === 'error') return `${base} bg-red-500/20 text-red-400`;
  return `${base} bg-muted text-muted-foreground`;
}

function shouldUseNextPlayerUrl(currentUrl: string | null, nextStatus: LabStatusResponse['data']) {
  const nextUrl = nextStatus.playback?.iframeUrl;
  if (!nextUrl) return false;
  if (!currentUrl) return true;
  if (!nextStatus.activeVideoUid) return false;

  return !currentUrl.includes(nextStatus.activeVideoUid);
}
