'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

// Plays the R2-backed live HLS stream; Safari uses its native HLS support.
export default function R2StreamPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // React can drop the muted attribute; Safari only autoplays muted video.
    video.defaultMuted = true;
    video.muted = true;
    const play = () => void video.play().catch(() => {});

    // Prefer hls.js everywhere it runs (incl. desktop Safari); native HLS is
    // the fallback for older iOS and autoplays less reliably.
    if (!Hls.isSupported()) {
      video.src = src;
      video.addEventListener('loadedmetadata', play, { once: true });
      video.addEventListener('canplay', play, { once: true });
      return;
    }

    const hls = new Hls({
      // Ride ~2 segments behind the live edge; drift back gets replayed at 1.1x.
      liveSyncDurationCount: 2,
      liveMaxLatencyDurationCount: 6,
      maxLiveSyncPlaybackRate: 1.1,
      backBufferLength: 30,
    });
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, play);
    hls.on(Hls.Events.ERROR, (_event, data) => {
      // Recover from transient manifest/network gaps instead of freezing.
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      }
    });
    return () => hls.destroy();
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="absolute left-0 top-0 h-full w-full bg-black"
      autoPlay
      muted
      playsInline
      controls
    />
  );
}
