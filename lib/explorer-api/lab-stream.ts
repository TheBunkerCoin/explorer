const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export type LabStreamStatus = {
  labStreamSlug: string;
  title: string;
  inputId: string | null;
  createdAt: string | null;
  live: boolean | null;
  activeVideoUid: string | null;
  playback: {
    iframeUrl: string;
    hlsUrl: string | null;
  } | null;
};

type LabStatusResponse = {
  data: LabStreamStatus;
};

export async function requestLabStatus(): Promise<LabStreamStatus> {
  const response = await fetch(`${API_URL.replace(/\/$/, '')}/api/lab/status`, {
    cache: 'no-store',
  });

  const payload = (await response.json()) as LabStatusResponse | { error?: string };
  if (!response.ok) {
    throw new Error('error' in payload && payload.error ? payload.error : `Explorer API failed with ${response.status}`);
  }

  return (payload as LabStatusResponse).data;
}

type LikesResponse = { data: { likes: number } };

export async function requestLabLikes(): Promise<number> {
  const response = await fetch(`${API_URL.replace(/\/$/, '')}/api/lab/likes`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`likes fetch failed with ${response.status}`);
  return ((await response.json()) as LikesResponse).data.likes;
}

// Register `count` likes (rapid taps are batched client-side). Returns the new
// global total from the server.
export async function sendLabLikes(count: number): Promise<number> {
  const response = await fetch(`${API_URL.replace(/\/$/, '')}/api/lab/likes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  });
  if (!response.ok) throw new Error(`like failed with ${response.status}`);
  return ((await response.json()) as LikesResponse).data.likes;
}
