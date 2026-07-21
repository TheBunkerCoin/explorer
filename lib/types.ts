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

// --- Solscan-style entity types ---

export interface TransactionBody {
  type?: string;
  to?: string;
  amount?: number;
  token_id?: string;
  ticker?: string;
  [key: string]: unknown;
}

// Where a transaction currently lives in its lifecycle. Mirrors the node's
// `status.location`: mempool -> confirmed (in a block) -> finalized.
export interface TransactionStatus {
  location: 'mempool' | 'confirmed' | 'finalized';
  slot?: number;
  block_hash?: string;
  executed?: boolean;
  success?: boolean;
  error?: string | null;
}

export interface TransactionDetails {
  hash: string;
  sender: string;
  nonce: number;
  fee: number;
  body?: TransactionBody;
  status: TransactionStatus;
}

// Row shape in the paginated /transactions list (newest-first).
export interface TransactionSummary {
  hash: string;
  sender: string;
  nonce: number;
  fee: number;
  body?: TransactionBody;
  slot?: number;
  success?: boolean;
}

export interface AccountDetails {
  pubkey: string;
  native_balance: number;
  token_balances: Record<string, number>;
  nonce: number;
}

export interface TokenSummary {
  id: string;
  ticker: string;
  current_supply: number;
  max_supply?: number;
}

export interface TokenHolder {
  pubkey: string;
  balance: number;
}

// What a pasted search query resolved to (drives routing from the search bar).
export type SearchKind = 'transaction' | 'account' | 'block' | 'token' | 'unknown';

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