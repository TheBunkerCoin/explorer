import {
  Block,
  Node,
  BlockDetails,
  TransactionDetails,
  TransactionSummary,
  AccountDetails,
  TokenSummary,
  TokenHolder,
  SearchKind,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Decode base58 to lowercase hex, or return null if `s` isn't valid base58.
// Wallets and `sendTransaction` speak base58 (Solana convention), but the
// node's REST endpoints key on hex — so pasted signatures/addresses must be
// normalized to hex before lookup.
function base58ToHex(s: string): string | null {
  if (!s || /[^123456789A-HJ-NP-Za-km-z]/.test(s)) return null;
  const bytes: number[] = [0];
  for (const ch of s) {
    const val = B58_ALPHABET.indexOf(ch);
    if (val < 0) return null;
    let carry = val;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Leading '1's are leading zero bytes.
  for (let i = 0; i < s.length && s[i] === '1'; i++) bytes.push(0);
  return bytes
    .reverse()
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Normalize any id (hex or base58) to the lowercase hex the node keys on.
function toHexId(id: string): string {
  if (/^[0-9a-fA-F]+$/.test(id) && id.length % 2 === 0) return id.toLowerCase();
  return base58ToHex(id) ?? id;
}

// Accounts display as base58 (the wallet-facing address format); the node's
// REST layer emits hex. Non-hex input is returned unchanged.
export function hexToBase58(hex: string): string {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return hex;
  const bytes = hex.match(/../g)!.map((b) => parseInt(b, 16));
  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let prefix = '';
  for (const byte of bytes) {
    if (byte !== 0) break;
    prefix += '1';
  }
  return (
    prefix +
    digits
      .reverse()
      .map((d) => B58_ALPHABET[d])
      .join('')
  );
}

export const api = {
  getBlocks: async (offset: number = 0, limit: number = 20): Promise<{ blocks: Block[], hasMore: boolean }> => {
    const response = await fetch(`${API_URL}/blocks?offset=${offset}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch blocks');
    
    const blocks: Block[] = await response.json();
    const hasMore = blocks.length === limit;
    
    return { blocks, hasMore };
  },

  getNodes: async (): Promise<Node[]> => {
    const response = await fetch(`${API_URL}/nodes`);
    if (!response.ok) throw new Error('Failed to fetch nodes');
    return response.json();
  },

  getBlock: async (hash: string): Promise<BlockDetails | null> => {
    const response = await fetch(`${API_URL}/block/${toHexId(hash)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch block');
    }
    return response.json();
  },

  getBlockBySlot: async (slot: number): Promise<BlockDetails | null> => {
    const response = await fetch(`${API_URL}/block/slot/${slot}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch block');
    }
    return response.json();
  },

  getTransaction: async (hash: string): Promise<TransactionDetails | null> => {
    const response = await fetch(`${API_URL}/transactions/${toHexId(hash)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch transaction');
    }
    return response.json();
  },

  getTransactions: async (
    offset: number = 0,
    limit: number = 25,
  ): Promise<{ transactions: TransactionSummary[]; hasMore: boolean }> => {
    const response = await fetch(`${API_URL}/transactions?offset=${offset}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    const data = await response.json();
    // The node returns { transactions, total, ... }; tolerate a bare array too.
    const transactions: TransactionSummary[] = Array.isArray(data)
      ? data
      : (data.transactions ?? []);
    return { transactions, hasMore: transactions.length === limit };
  },

  getAccount: async (pubkey: string): Promise<AccountDetails | null> => {
    const response = await fetch(`${API_URL}/accounts/${toHexId(pubkey)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch account');
    }
    return response.json();
  },

  getTokens: async (): Promise<TokenSummary[]> => {
    const response = await fetch(`${API_URL}/tokens`);
    if (!response.ok) throw new Error('Failed to fetch tokens');
    const data = await response.json();
    return Array.isArray(data) ? data : (data.tokens ?? []);
  },

  getTokenHolders: async (id: string): Promise<TokenHolder[]> => {
    const response = await fetch(`${API_URL}/tokens/${id}/holders`);
    if (!response.ok) throw new Error('Failed to fetch token holders');
    const data = await response.json();
    return Array.isArray(data) ? data : (data.holders ?? []);
  },

  // Resolve a pasted search query to an entity by shape + existence probes.
  // A 64-hex string could be a block hash, tx hash, or account pubkey (all
  // 32 bytes) — probe in that order and return the first that exists.
  // A pure integer is a block slot. Returns { kind, id } for routing.
  search: async (raw: string): Promise<{ kind: SearchKind; id: string }> => {
    const q = raw.trim();
    if (!q) return { kind: 'unknown', id: q };

    // Pure integer -> block slot.
    if (/^\d+$/.test(q)) {
      const block = await api.getBlockBySlot(Number(q)).catch(() => null);
      if (block) return { kind: 'block', id: q };
      return { kind: 'unknown', id: q };
    }

    // 8-hex -> token id (4 bytes).
    if (/^[0-9a-fA-F]{8}$/.test(q)) {
      return { kind: 'token', id: q.toLowerCase() };
    }

    // 64-hex (or base58 ~44 chars): a 32-byte value that could be a tx
    // signature, a block hash, or an account pubkey — all identical in shape,
    // so existence decides. Probe all three concurrently and resolve by
    // PRIORITY (tx → block → account), not by which request returned first.
    // Order matters: `/accounts/:pubkey` may answer with a zeroed account for
    // an arbitrary key, so an account "hit" is the weakest signal and must be
    // checked last — otherwise a block hash resolves to a phantom account
    // (the bug this ordering fixes).
    const looksLike32 = /^[0-9a-fA-F]{64}$/.test(q) || /^[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(q);
    if (looksLike32) {
      const [tx, block, acct] = await Promise.all([
        api.getTransaction(q).catch(() => null),
        api.getBlock(q).catch(() => null),
        api.getAccount(q).catch(() => null),
      ]);
      if (tx) return { kind: 'transaction', id: q };
      if (block) return { kind: 'block', id: q };
      if (acct) return { kind: 'account', id: q };
      // Nothing matched. Route to the account page: a 32-byte value is
      // addressable as an account for any key (the endpoint answers with a
      // zeroed account when unseen), so this always renders something
      // sensible — and the account page reads correctly whether or not the
      // address has activity. A hex string is far more often a pasted
      // address than an unindexed tx signature.
      return { kind: 'account', id: q };
    }

    return { kind: 'unknown', id: q };
  },
}; 
// Native amounts arrive in base units (1 BUNKER = 1,000,000 units).
export function formatBunker(units: number): string {
  return (units / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 6 });
}
