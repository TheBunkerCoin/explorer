'use client';

import { useAtom, useSetAtom } from 'jotai';
import { blocksAtom, blocksLoadingAtom, selectedBlockHashAtom, hasMoreBlocksAtom, isLoadingMoreAtom, initialLoadCompleteAtom, showSkippedSlotsAtom, displayCountAtom, highestFinalizedSlotAtom } from '@/lib/atoms';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useRef, useCallback } from 'react';
import { Check, Loader2, AlertTriangle } from 'lucide-react';
import { Block } from '@/lib/types';

function truncateHash(hash: string) {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function StatusIndicator({ status, type }: { status: string; type: 'block' | 'skip' }) {
  if (type === 'skip') {
    return (
      <div className="flex flex-row sm:flex-row items-center gap-1.5">
        <AlertTriangle size={14} className="text-red-400" />
        <span className="text-xs px-1.5 py-0.5 rounded bg-red-400/20 text-red-400 font-medium w-[70px] text-center">
          skipped
        </span>
      </div>
    );
  }

  if (status === 'finalized') {
    return (
      <div className="flex flex-row sm:flex-row items-center gap-1.5">
        <Check size={14} className="text-white" />
        <span className="text-xs px-1.5 py-0.5 rounded bg-white/20 text-white font-medium w-[70px] text-center">
          {status}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-row sm:flex-row items-center gap-1.5">
      <Loader2 size={14} className="text-white animate-spin" />
      <span className="text-xs px-1.5 py-0.5 rounded bg-white/20 text-white font-medium w-[70px] text-center">
        {status}
      </span>
    </div>
  );
}

export default function BlockList() {
  const [blocks] = useAtom(blocksAtom);
  const [loading] = useAtom(blocksLoadingAtom);
  const [hasMore] = useAtom(hasMoreBlocksAtom);
  const [isLoadingMore] = useAtom(isLoadingMoreAtom);
  const [initialLoadComplete] = useAtom(initialLoadCompleteAtom);
  const [showSkippedSlots, setShowSkippedSlots] = useAtom(showSkippedSlotsAtom);
  const [displayCount, setDisplayCount] = useAtom(displayCountAtom);
  const [highestFinalizedSlot] = useAtom(highestFinalizedSlotAtom);
  const setSelectedBlockHash = useSetAtom(selectedBlockHashAtom);
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadMoreTriggered = useRef(false);

  const handleBlockClick = (block: Block) => {
    setSelectedBlockHash(block.hash);
  };

  const filteredBlocks = showSkippedSlots 
    ? blocks 
    : blocks.filter(block => block.type !== 'skip');
    
  const displayBlocks = filteredBlocks.slice(0, displayCount);
  
  const needsMoreFromAPI = displayCount >= filteredBlocks.length && hasMore;
  
  const canShowMore = displayCount < filteredBlocks.length;

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && !isLoadingMore && !loading) {
      if (canShowMore) {
        setDisplayCount(prev => Math.min(prev + 20, filteredBlocks.length));
      } else if (needsMoreFromAPI && !loadMoreTriggered.current) {
        loadMoreTriggered.current = true;
        window.dispatchEvent(new CustomEvent('loadMoreBlocks'));
        
        setTimeout(() => {
          loadMoreTriggered.current = false;
          setDisplayCount(prev => prev + 20);
        }, 500);
      }
    }
  }, [canShowMore, needsMoreFromAPI, isLoadingMore, loading, filteredBlocks.length, setDisplayCount]);

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '100px',
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold mb-1 tracking-tight">Recent Blocks</h2>
          <p className="text-sm text-muted-foreground">Latest blocks produced by the network. Click them to view details.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="show-skipped" className={`text-sm text-muted-foreground cursor-pointer transition-opacity ${!showSkippedSlots ? 'opacity-60' : 'opacity-100'}`}>
            Show skipped slots
          </label>
          <Switch
            id="show-skipped"
            checked={showSkippedSlots}
            onCheckedChange={setShowSkippedSlots}
          />
        </div>
      </div>
      
      <div className="flex flex-col">
        {loading && !initialLoadComplete ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="rounded-lg bg-card/50 backdrop-blur px-4 py-3 flex flex-col gap-1 mb-2">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))
        ) : (
          <>
            {displayBlocks.map((block) => (
              <div
                key={block.hash}
                onClick={() => handleBlockClick(block)}
                className={`group rounded-lg backdrop-blur px-4 py-3 flex items-center justify-between gap-4 hover:bg-card/70 transition-all duration-200 cursor-pointer mb-2 ${
                  block.type === 'skip' 
                    ? 'bg-red-900/10 border border-red-900/20' 
                    : 'bg-card/50'
                }`}
                style={{
                  animation: block.slot === highestFinalizedSlot && displayBlocks.length > 1 && block.type !== 'skip' ? 'slideDown 0.3s ease-out' : undefined
                }}
              >
                <div className="flex flex-col gap-0.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-base">#{block.slot}</span>
                    {block.slot === highestFinalizedSlot && block.type !== 'skip' && (
                      <Badge variant="emerald" className="px-2 py-0 text-[11px] font-semibold">
                        LATEST
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{truncateHash(block.hash)}</span>
                    <div className="flex items-center gap-2">
                      {block.producer !== undefined && (
                        <>
                          <span className="hidden sm:inline opacity-60">•</span>
                          <span>Node {block.producer}</span>
                          <span className="opacity-60">•</span>
                        </>
                      )}
                      <span>
                        {block.status === 'finalized' && block.finalized_timestamp
                          ? formatDistanceToNow(block.finalized_timestamp, { addSuffix: true })
                          : block.proposed_timestamp
                            ? `Pending since ${formatDistanceToNow(block.proposed_timestamp, { addSuffix: true })}`
                            : formatDistanceToNow(block.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusIndicator status={block.status} type={block.type} />
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-muted-foreground text-xs">→</span>
                  </div>
                </div>
              </div>
            ))}
            
            {(canShowMore || (needsMoreFromAPI && hasMore)) && (
              <div ref={observerTarget} className="h-20" />
            )}
            
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="flex gap-2 items-center text-sm text-muted-foreground">
                  <div className="animate-spin h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full" />
                  Loading more blocks...
                </div>
              </div>
            )}
            
            {!hasMore && !canShowMore && displayBlocks.length > 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No more blocks to load
              </div>
            )}
          </>
        )}
      </div>
      
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
} 