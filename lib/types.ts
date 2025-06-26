export interface Block {
  type: 'block' | 'skip';
  slot: number;
  hash: string;
  producer?: number; // Only for blocks, not skip certificates
  timestamp: number;
  proposed_timestamp?: number;
  finalized_timestamp?: number;
  parent_slot?: number;
  parent_hash?: string;
  status: 'pending' | 'proposed' | 'notarized' | 'finalized';
}

export interface Node {
  node_id: number;
  finalized_slot: number;
}

// BlockDetails is the same as Block for now, but kept separate for future extensions
export type BlockDetails = Block; 

export interface RadioStats {
  type: 'radio_stats';
  packets_sent_2s: number;
  packets_dropped_2s: number;
  packets_transmitted_2s: number;
  packets_queued: number;
  bytes_transmitted_2s: number;
  effective_throughput_bps_2s: number;
  packet_loss_rate_2s: number;
} 