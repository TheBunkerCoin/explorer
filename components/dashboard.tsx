'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSetAtom, useAtom } from 'jotai';
import { 
  blocksAtom, 
  nodesAtom, 
  blocksLoadingAtom, 
  nodesLoadingAtom, 
  currentOffsetAtom,
  hasMoreBlocksAtom,
  isLoadingMoreAtom,
  initialLoadCompleteAtom,
  latestProducerAtom,
  lowestFetchedSlotAtom,
  nonFinalizedSlotsAtom
} from '@/lib/atoms';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/websocket';
import NodeStatus from './node-status';
import BlockList from './block-list';
import BlockDetailsDialog from './block-details-dialog';

export default function Dashboard() {
  const [blocks, setBlocks] = useAtom(blocksAtom);
  const setNodes = useSetAtom(nodesAtom);
  const setBlocksLoading = useSetAtom(blocksLoadingAtom);
  const setNodesLoading = useSetAtom(nodesLoadingAtom);
  const [currentOffset, setCurrentOffset] = useAtom(currentOffsetAtom);
  const setHasMoreBlocks = useSetAtom(hasMoreBlocksAtom);
  const setIsLoadingMore = useSetAtom(isLoadingMoreAtom);
  const setInitialLoadComplete = useSetAtom(initialLoadCompleteAtom);
  const setLatestProducer = useSetAtom(latestProducerAtom);
  const [lowestFetchedSlot, setLowestFetchedSlot] = useAtom(lowestFetchedSlotAtom);
  const [nonFinalizedSlots] = useAtom(nonFinalizedSlotsAtom);
  
  const isFirstLoad = useRef(true);
  const totalBlocksCount = useRef(0);


  useWebSocket();

  const fetchBlocks = useCallback(async (offset: number, append: boolean = false) => {
    try {
      if (!append) {
        setBlocksLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const { blocks: newBlocks, hasMore } = await api.getBlocks(offset, 20);
      
      if (offset === 0 && !append) {
        if (isFirstLoad.current) {
          setBlocks(newBlocks);
          totalBlocksCount.current = newBlocks.length;
          if (newBlocks.length > 0) {
            setLowestFetchedSlot(newBlocks[newBlocks.length - 1].slot);
          }
          isFirstLoad.current = false;
        } else {
          setBlocks(prev => {
            const blockMap = new Map(prev.map(b => [b.slot, b]));
            
            newBlocks.forEach(newBlock => {
              const existingBlock = blockMap.get(newBlock.slot);
              
              if (!existingBlock) {
                blockMap.set(newBlock.slot, newBlock);
                
                if (newBlock.slot > (prev[0]?.slot || 0) && 
                    newBlock.type === 'block' && 
                    newBlock.producer !== undefined) {
                  setLatestProducer(newBlock.producer);
                }
              } else if (existingBlock.status !== newBlock.status || 
                         existingBlock.type !== newBlock.type) {
                blockMap.set(newBlock.slot, newBlock);
              }
            });
            
            return Array.from(blockMap.values()).sort((a, b) => b.slot - a.slot);
          });
        }
      } else if (append) {
        setBlocks(prev => {
          const existingSlots = new Set(prev.map(b => b.slot));
          const uniqueNewBlocks = newBlocks.filter(b => !existingSlots.has(b.slot));
          
          if (uniqueNewBlocks.length > 0) {
            const newLowest = uniqueNewBlocks[uniqueNewBlocks.length - 1].slot;
            setLowestFetchedSlot(current => 
              current === null ? newLowest : Math.min(current, newLowest)
            );
          }
          
          return [...prev, ...uniqueNewBlocks];
        });
        setCurrentOffset(offset);
      }
      
      setHasMoreBlocks(hasMore);
    } catch (error) {
      console.error('Failed to fetch blocks:', error);
    } finally {
      setBlocksLoading(false);
      setIsLoadingMore(false);
      setInitialLoadComplete(true);
    }
  }, [setBlocks, setBlocksLoading, setHasMoreBlocks, setCurrentOffset, setIsLoadingMore, setInitialLoadComplete, setLatestProducer, setLowestFetchedSlot]);

  const fetchNodes = useCallback(async () => {
    try {
      setNodesLoading(true);
      const nodesData = await api.getNodes();
      setNodes(nodesData);
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
    } finally {
      setNodesLoading(false);
    }
  }, [setNodes, setNodesLoading]);

  useEffect(() => {
    fetchBlocks(0);
    fetchNodes();
  }, [fetchBlocks, fetchNodes]);

  useEffect(() => {
    const pollInterval = 1000; 
    const interval = setInterval(() => {
      fetchBlocks(0);
      fetchNodes();
      
    }, pollInterval);
    
    return () => clearInterval(interval);
  }, [fetchBlocks, fetchNodes, nonFinalizedSlots.size]);

  useEffect(() => {
    const handleLoadMore = () => {
      const actualOffset = blocks.length;
      fetchBlocks(actualOffset, true);
    };

    window.addEventListener('loadMoreBlocks', handleLoadMore);
    return () => window.removeEventListener('loadMoreBlocks', handleLoadMore);
  }, [blocks.length, fetchBlocks]);

  return (
    <>
      <div className="w-full flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-3xl">
          <NodeStatus />
          <BlockList />
        </div>
      </div>
      <BlockDetailsDialog />
    </>
  );
} 