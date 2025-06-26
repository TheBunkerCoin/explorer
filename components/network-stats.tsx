'use client';

import { useAtom } from 'jotai';
import { radioStatsAtom } from '@/lib/atoms';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Wifi } from 'lucide-react';

const NETWORK_CONFIG = {
  bandwidth_bps: 4800,
  packet_loss_percent: 15,
  latency_ms: 250,
  jitter_ms: 50
};

function formatBps(bps: number): string {
  if (bps >= 1000000) {
    return `${(bps / 1000000).toFixed(2)} Mbps`;
  } else if (bps >= 1000) {
    return `${(bps / 1000).toFixed(2)} kbps`;
  }
  return `${bps.toFixed(0)} bps`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

export default function NetworkStats() {
  const [radioStats] = useAtom(radioStatsAtom);

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-1 tracking-tight">
        Radio Network Statistics
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Radio network constraints and real-time performance metrics
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg bg-card/50 backdrop-blur p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            <Wifi size={16} />
            Network Configuration
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Global Bandwidth</span>
              <span className="font-mono">{formatBps(NETWORK_CONFIG.bandwidth_bps)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Packet Loss</span>
              <span className="font-mono">{NETWORK_CONFIG.packet_loss_percent}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Latency</span>
              <span className="font-mono">{NETWORK_CONFIG.latency_ms} ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Jitter</span>
              <span className="font-mono">{NETWORK_CONFIG.jitter_ms} ms</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-card/50 backdrop-blur p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            <Activity size={16} className={radioStats ? 'text-emerald-400' : ''} />
            Live Radio Network Stats (Last 2 Seconds)
          </h3>
          {radioStats ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Packets</span>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">Queued:</span>
                    <span className="text-white">{radioStats.packets_queued}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">Sent:</span>
                    <span className="text-emerald-400">{radioStats.packets_transmitted_2s}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">Dropped:</span>
                    <span className="text-red-400">{radioStats.packets_dropped_2s}</span>
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Bytes Transmitted</span>
                <span className="font-mono">{formatBytes(radioStats.bytes_transmitted_2s)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Effective Throughput</span>
                <span className="font-mono text-emerald-400">{formatBps(radioStats.effective_throughput_bps_2s)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Packet Loss Rate</span>
                <span className={`font-mono ${radioStats.packet_loss_rate_2s > 10 ? 'text-red-400' : ''}`}>
                  {radioStats.packet_loss_rate_2s.toFixed(1)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
} 