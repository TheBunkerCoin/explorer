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
