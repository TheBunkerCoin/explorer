import { useEffect, useRef, useCallback } from 'react';
import { useSetAtom, useAtom } from 'jotai';
import { blocksAtom, wsConnectedAtom, nonFinalizedSlotsAtom, latestProducerAtom, highestFinalizedSlotAtom } from './atoms';
import { Block } from './types';

const WS_URL = 'ws://localhost:3001/ws';

export function useWebSocket() {
  const [blocks, setBlocks] = useAtom(blocksAtom);
  const setWsConnected = useSetAtom(wsConnectedAtom);
  const setNonFinalizedSlots = useSetAtom(nonFinalizedSlotsAtom);
  const setLatestProducer = useSetAtom(latestProducerAtom);
  const setHighestFinalizedSlot = useSetAtom(highestFinalizedSlotAtom);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateBlockStatus = useCallback((updatedBlock: Block) => {
    setBlocks(prevBlocks => {
      const newBlocks = prevBlocks.map(block => {
        if (block.slot === updatedBlock.slot) {
          return updatedBlock;
        }
        return block;
      });

      // Check if this update creates a new highest finalized block
      if (updatedBlock.status === 'finalized' && 
          updatedBlock.type === 'block' && 
          updatedBlock.producer !== undefined) {
        
        // Find the highest finalized block
        const highestFinalized = newBlocks.find(block => 
          block.status === 'finalized' && 
          block.type === 'block' && 
          block.producer !== undefined
        );
        
        if (highestFinalized && highestFinalized.slot === updatedBlock.slot) {
          setHighestFinalizedSlot(prevHighest => {
            if (prevHighest === null || updatedBlock.slot > prevHighest) {
              // New highest finalized block - highlight the producer
              setLatestProducer(updatedBlock.producer!);
              return updatedBlock.slot;
            }
            return prevHighest;
          });
        }
      }

      return newBlocks;
    });

    if (updatedBlock.status === 'finalized' || updatedBlock.type === 'skip') {
      setNonFinalizedSlots(prev => {
        const newSet = new Set(prev);
        newSet.delete(updatedBlock.slot);
        return newSet;
      });
    }
  }, [setBlocks, setNonFinalizedSlots, setHighestFinalizedSlot, setLatestProducer]);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to BunkerCoin WebSocket');
        setWsConnected(true);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'update_slot' && message.UpdateSlot) {
            updateBlockStatus(message.UpdateSlot);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        wsRef.current = null;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    }
  }, [setWsConnected, updateBlockStatus]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  useEffect(() => {
    const nonFinalized = new Set<number>();
    blocks.forEach(block => {
      if (block.status !== 'finalized' && block.type !== 'skip') {
        nonFinalized.add(block.slot);
      }
    });
    setNonFinalizedSlots(nonFinalized);
  }, [blocks, setNonFinalizedSlots]);
} 