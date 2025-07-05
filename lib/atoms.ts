import { atom } from 'jotai';
import { Block, Node, BlockDetails } from './types';

const rawBlocksAtom = atom<Block[]>([]);

export const blocksAtom = atom(
  (get) => {
    const blocks = get(rawBlocksAtom);
    const blockMap = new Map<number, Block>();
    
    blocks.forEach(block => {
      blockMap.set(block.slot, block);
    });
    
    return Array.from(blockMap.values()).sort((a, b) => b.slot - a.slot);
  },
  (get, set, update: Block[] | ((prev: Block[]) => Block[])) => {
    const currentBlocks = get(rawBlocksAtom);
    const newBlocks = typeof update === 'function' ? update(currentBlocks) : update;
    set(rawBlocksAtom, newBlocks);
  }
);

export const nodesAtom = atom<Node[]>([]);

export const blocksLoadingAtom = atom(true);
export const nodesLoadingAtom = atom(true);

export const selectedBlockHashAtom = atom<string | null>(null);
export const selectedBlockDetailsAtom = atom<BlockDetails | null>(null);
export const blockDetailsLoadingAtom = atom(false);

export const latestProducerAtom = atom<number | null>(null);

export const currentOffsetAtom = atom(0);
export const hasMoreBlocksAtom = atom(true);
export const isLoadingMoreAtom = atom(false);

export const initialLoadCompleteAtom = atom(false);

export const showSkippedSlotsAtom = atom(false);

export const displayCountAtom = atom(50);

export const lowestFetchedSlotAtom = atom<number | null>(null);

export const highestFinalizedSlotAtom = atom<number | null>(null);

export const wsConnectedAtom = atom(false);

export const nonFinalizedSlotsAtom = atom<Set<number>>(new Set<number>());

export const recentlyFinalizedBlocksAtom = atom<Array<{ slot: number; producer: number; timestamp: number }>>([]);

export const radioStatsAtom = atom<{
  packets_sent_2s: number;
  packets_dropped_2s: number;
  packets_transmitted_2s: number;
  packets_queued: number;
  bytes_transmitted_2s: number;
  effective_throughput_bps_2s: number;
  packet_loss_rate_2s: number;
} | null>(null); 