import { useEffect, useRef } from 'react';
import { useSetAtom, useAtom } from 'jotai';
import { blocksAtom, wsConnectedAtom, nonFinalizedSlotsAtom } from './atoms';
import { Block } from './types';

const WS_URL = 'ws://localhost:3001/ws';

export function useWebSocket() {
  const [blocks, setBlocks] = useAtom(blocksAtom);
  const setWsConnected = useSetAtom(wsConnectedAtom);
  const [nonFinalizedSlots, setNonFinalizedSlots] = useAtom(nonFinalizedSlotsAtom);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateBlockStatus = (updatedBlock: Block) => {
    setBlocks(prevBlocks => {
      return prevBlocks.map(block => {
        if (block.slot === updatedBlock.slot) {
          return updatedBlock;
        }
        return block;
      });
    });

    if (updatedBlock.status === 'finalized' || updatedBlock.type === 'skip') {
      setNonFinalizedSlots(prev => {
        const newSet = new Set(prev);
        newSet.delete(updatedBlock.slot);
        return newSet;
      });
    }
  };

  const connect = () => {
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
  };

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
  }, []);

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