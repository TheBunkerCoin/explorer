'use client';

import { useEffect, useRef } from 'react';

interface WhepPlayerProps {
  src: string;
  onLive: () => void;
  onDown: () => void;
}

// Sub-second live view over WebRTC (WHEP). On any failure the panel falls
// back to the HLS player, so this component only ever reports up or down.
export default function WhepPlayer({ src, onLive, onDown }: WhepPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let closed = false;
    const pc = new RTCPeerConnection();
    const stream = new MediaStream();

    const fail = () => {
      if (closed) return;
      closed = true;
      pc.close();
      onDown();
    };

    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.ontrack = (e) => {
      stream.addTrack(e.track);
      if (video.srcObject !== stream) video.srcObject = stream;
      void video.play().catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') onLive();
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) fail();
    };

    void (async () => {
      try {
        await pc.setLocalDescription(await pc.createOffer());
        // WHEP is trickle-less here: wait briefly for ICE gathering to finish.
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === 'complete') return resolve();
          const timer = setTimeout(resolve, 1000);
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
              clearTimeout(timer);
              resolve();
            }
          };
        });
        const res = await fetch(src, {
          method: 'POST',
          headers: { 'content-type': 'application/sdp' },
          body: pc.localDescription?.sdp,
        });
        if (!res.ok) throw new Error(`whep ${res.status}`);
        const answer = await res.text();
        if (closed) return;
        await pc.setRemoteDescription({ type: 'answer', sdp: answer });
      } catch {
        fail();
      }
    })();

    return () => {
      closed = true;
      pc.close();
    };
  }, [src, onLive, onDown]);

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
