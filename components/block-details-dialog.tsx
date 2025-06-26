'use client';

import { useAtom } from 'jotai';
import { selectedBlockHashAtom, selectedBlockDetailsAtom, blockDetailsLoadingAtom } from '@/lib/atoms';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Copy, AlertTriangle, Clock } from 'lucide-react';

export default function BlockDetailsDialog() {
  const [selectedBlockHash, setSelectedBlockHash] = useAtom(selectedBlockHashAtom);
  const [blockDetails, setBlockDetails] = useAtom(selectedBlockDetailsAtom);
  const [loading, setLoading] = useAtom(blockDetailsLoadingAtom);
  const [pendingTime, setPendingTime] = useState(0);

  useEffect(() => {
    if (selectedBlockHash !== null) {
      setLoading(true);
      api.getBlock(selectedBlockHash)
        .then((details) => {
          setBlockDetails(details);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [selectedBlockHash, setBlockDetails, setLoading]);

  // Update pending time every second
  useEffect(() => {
    if (blockDetails && blockDetails.status !== 'finalized' && blockDetails.proposed_timestamp) {
      const updatePendingTime = () => {
        const now = Date.now();
        const proposedTime = blockDetails.proposed_timestamp!;
        setPendingTime(Math.floor((now - proposedTime) / 1000));
      };

      updatePendingTime();
      const interval = setInterval(updatePendingTime, 1000);

      return () => clearInterval(interval);
    }
  }, [blockDetails]);

  const handleClose = () => {
    setSelectedBlockHash(null);
    setBlockDetails(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const handleParentClick = () => {
    if (blockDetails?.parent_hash) {
      setSelectedBlockHash(blockDetails.parent_hash);
    }
  };

  return (
    <Dialog open={selectedBlockHash !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[560px] bg-card/95 backdrop-blur border border-card/40">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {blockDetails?.type === 'skip' ? (
              <>
                <AlertTriangle size={20} className="text-red-400" />
                Skipped Slot #{blockDetails?.slot || '...'}
              </>
            ) : (
              <>Block #{blockDetails?.slot || '...'}</>
            )}
          </DialogTitle>
          <DialogDescription>
            {blockDetails?.type === 'skip' 
              ? 'This slot was skipped during consensus'
              : 'Detailed information about this block'
            }
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : blockDetails ? (
          <div className="space-y-3 py-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="w-[110px] text-muted-foreground">Hash</span>
              <span className="font-mono break-all flex-1">{blockDetails.hash}</span>
              <button onClick={() => copyToClipboard(blockDetails.hash)} className="opacity-70 hover:opacity-100 transition">
                <Copy size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-[110px] text-muted-foreground">Type</span>
              <Badge variant={blockDetails.type === 'skip' ? 'destructive' : 'outline'} className="font-mono">
                {blockDetails.type}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-[110px] text-muted-foreground">Status</span>
              <Badge variant="outline" className="font-mono">
                {blockDetails.status}
              </Badge>
            </div>

            {blockDetails.type === 'block' && blockDetails.producer !== undefined && (
              <div className="flex items-center gap-2">
                <span className="w-[110px] text-muted-foreground">Producer</span>
                <Badge variant="outline" className="font-mono">Node {blockDetails.producer}</Badge>
              </div>
            )}

            {blockDetails.type === 'block' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-[110px] text-muted-foreground">Proposed at</span>
                  <span>
                    {blockDetails.proposed_timestamp
                      ? format(new Date(blockDetails.proposed_timestamp), 'PPpp')
                      : format(new Date(blockDetails.timestamp), 'PPpp')}
                  </span>
                </div>
                {blockDetails.finalized_timestamp ? (
                  <div className="flex items-center gap-2">
                    <span className="w-[110px] text-muted-foreground">Finalized at</span>
                    <span>{format(new Date(blockDetails.finalized_timestamp), 'PPpp')}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-[110px] text-muted-foreground">Pending for</span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="animate-pulse" />
                      <span className="font-mono">{pendingTime}s</span>
                    </span>
                  </div>
                )}
              </>
            )}

            {blockDetails.type === 'skip' && (
              <div className="flex items-center gap-2">
                <span className="w-[110px] text-muted-foreground">Timestamp</span>
                <span>{format(new Date(blockDetails.timestamp), 'PPpp')}</span>
              </div>
            )}

            {blockDetails.type === 'block' && blockDetails.parent_slot !== undefined && (
              <div className="flex items-center gap-2">
                <span className="w-[110px] text-muted-foreground">Parent Slot</span>
                <button
                  onClick={handleParentClick}
                  className="font-mono underline-offset-2 hover:underline text-primary"
                  disabled={!blockDetails.parent_hash}
                >
                  #{blockDetails.parent_slot}
                </button>
              </div>
            )}

            {blockDetails.type === 'block' && blockDetails.parent_hash && (
              <div className="flex items-start gap-2">
                <span className="w-[110px] text-muted-foreground">Parent Hash</span>
                <span className="font-mono break-all flex-1">{blockDetails.parent_hash}</span>
                <button onClick={() => copyToClipboard(blockDetails.parent_hash!)} className="opacity-70 hover:opacity-100 transition">
                  <Copy size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Block not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
} 