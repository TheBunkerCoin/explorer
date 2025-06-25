export interface Block {
  type: 'block' | 'skip';
  slot: number;
  hash: string;
  producer?: number; // only blocks
  timestamp: number;
  parent_slot?: number;
  parent_hash?: string;
  status: 'pending' | 'proposed' | 'notarized' | 'finalized';
}

export interface Node {
  node_id: number;
  finalized_slot: number;
}

export interface BlockDetails extends Block {
  // can include both blocks and skip certificates
} 