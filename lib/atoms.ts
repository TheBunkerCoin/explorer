import { atom } from 'jotai';
import { Block, Node, BlockDetails } from './types';

export const blocksAtom = atom<Block[]>([]);
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

export const wsConnectedAtom = atom(false);

export const nonFinalizedSlotsAtom = atom<Set<number>>(new Set<number>()); 