import { useEffect, useRef, useCallback } from 'react';
import { useSetAtom, useAtom } from 'jotai';
import { blocksAtom, wsConnectedAtom, nonFinalizedSlotsAtom, latestProducerAtom, highestFinalizedSlotAtom, recentlyFinalizedBlocksAtom, radioStatsAtom } from './atoms';
import { Block } from './types';

const WS_URL = 'ws://localhost:3001/ws';

export function useWebSocket() {
  const [blocks, setBlocks] = useAtom(blocksAtom);
  const setWsConnected = useSetAtom(wsConnectedAtom);
  const setNonFinalizedSlots = useSetAtom(nonFinalizedSlotsAtom);
  const setLatestProducer = useSetAtom(latestProducerAtom);
  const setHighestFinalizedSlot = useSetAtom(highestFinalizedSlotAtom);
  const setRecentlyFinalizedBlocks = useSetAtom(recentlyFinalizedBlocksAtom);
  const setRadioStats = useSetAtom(radioStatsAtom);
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

      if (updatedBlock.status === 'finalized' && 
          updatedBlock.type === 'block' && 
          updatedBlock.producer !== undefined) {
        
        const previousBlock = prevBlocks.find(b => b.slot === updatedBlock.slot);
        if (previousBlock && previousBlock.status !== 'finalized') {
          setRecentlyFinalizedBlocks(prev => [
            ...prev,
            { 
              slot: updatedBlock.slot, 
              producer: updatedBlock.producer!, 
              timestamp: Date.now() 
            }
          ]);
          
          setTimeout(() => {
            setRecentlyFinalizedBlocks(prev => 
              prev.filter(entry => Date.now() - entry.timestamp < 2000)
            );
          }, 2000);
        }

        const highestFinalized = newBlocks.find(block => 
          block.status === 'finalized' && 
          block.type === 'block' && 
          block.producer !== undefined
        );
        
        if (highestFinalized && highestFinalized.slot === updatedBlock.slot) {
          setHighestFinalizedSlot(prevHighest => {
            if (prevHighest === null || updatedBlock.slot > prevHighest) {
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
  }, [setBlocks, setNonFinalizedSlots, setHighestFinalizedSlot, setLatestProducer, setRecentlyFinalizedBlocks]);

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
          } else if (message.type === 'radio_stats') {
            setRadioStats({
              packets_sent_2s: message.packets_sent_2s,
              packets_dropped_2s: message.packets_dropped_2s,
              packets_transmitted_2s: message.packets_transmitted_2s,
              packets_queued: message.packets_queued,
              bytes_transmitted_2s: message.bytes_transmitted_2s,
              effective_throughput_bps_2s: message.effective_throughput_bps_2s,
              packet_loss_rate_2s: message.packet_loss_rate_2s
            });
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
  }, [setWsConnected, updateBlockStatus, setRadioStats]);

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