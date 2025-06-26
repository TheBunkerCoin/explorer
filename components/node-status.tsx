'use client';

import { useAtom } from 'jotai';
import { nodesAtom, nodesLoadingAtom, initialLoadCompleteAtom, recentlyFinalizedBlocksAtom } from '@/lib/atoms';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';

export default function NodeStatus() {
  const [nodes] = useAtom(nodesAtom);
  const [loading] = useAtom(nodesLoadingAtom);
  const [initialLoadComplete] = useAtom(initialLoadCompleteAtom);
  const [recentlyFinalizedBlocks] = useAtom(recentlyFinalizedBlocksAtom);
  const [flashingNodes, setFlashingNodes] = useState<Set<number>>(new Set());

  useEffect(() => {
    const newFlashingNodes = new Set<number>();
    recentlyFinalizedBlocks.forEach(block => {
      newFlashingNodes.add(block.producer);
    });
    
    if (newFlashingNodes.size > 0) {
      setFlashingNodes(newFlashingNodes);
      
      const timeout = setTimeout(() => {
        setFlashingNodes(new Set());
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [recentlyFinalizedBlocks]);

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-1 tracking-tight">Network Validators</h2>
      <p className="text-sm text-muted-foreground mb-4">Currently online validators, determining the next block(s) - including the latest blockchain slot they&apos;re synced to.</p>
      <div className="flex gap-3">
        {loading && !initialLoadComplete
          ? [...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg bg-card/50 backdrop-blur px-4 py-3 flex-1 flex flex-col items-center">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-5 w-12" />
              </div>
            ))
          : nodes.map((node) => (
              <div
                key={node.node_id}
                className={`relative rounded-lg bg-card/50 backdrop-blur px-4 py-3 flex-1
                  flex flex-col items-center transition-all duration-300
                  hover:bg-card/70 hover:scale-105
                  ${flashingNodes.has(node.node_id) ? 'flash-highlight' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--emerald)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[color:var(--emerald)]"></span>
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Node {node.node_id}</span>
                </div>
                <div className="text-sm sm:text-base md:text-lg font-mono font-bold text-foreground">{node.finalized_slot}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 opacity-80">Finalized</div>
              </div>
            ))}
      </div>
    </section>
  );
} 