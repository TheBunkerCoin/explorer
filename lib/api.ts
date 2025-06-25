import { Block, Node, BlockDetails } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    const response = await fetch(`${API_URL}/block/${hash}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch block');
    }
    return response.json();
  },
}; 