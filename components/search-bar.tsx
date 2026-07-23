'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { api } from '@/lib/api';

// Universal explorer search: paste a transaction signature, account address,
// block slot/hash, or token id and route to its detail page. The kind is
// resolved by `api.search` (shape + existence probes against the node).
export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { kind, id } = await api.search(q);
      switch (kind) {
        case 'transaction':
          router.push(`/tx?sig=${encodeURIComponent(id)}`);
          break;
        case 'account':
          router.push(`/account?address=${encodeURIComponent(id)}`);
          break;
        case 'block':
          router.push(`/block?id=${encodeURIComponent(id)}`);
          break;
        case 'token':
          router.push(`/token?id=${encodeURIComponent(id)}`);
          break;
        default:
          setError('Not a recognizable transaction, account, block, or token.');
      }
    } catch {
      setError('Search failed — the explorer API may be unreachable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Search by tx signature, address, block, or token"
          spellCheck={false}
          autoComplete="off"
          // text-base (16px) on mobile prevents iOS Safari from auto-zooming
          // the viewport on focus; sm:text-sm restores the compact size on
          // larger screens.
          className="w-full rounded-lg border border-border bg-card pl-9 pr-24 py-2.5 text-base sm:text-sm font-mono outline-none focus:border-emerald-500/60 transition-colors"
        />
        <button
          type="submit"
          disabled={busy}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 disabled:opacity-50 px-3 py-1.5 text-xs font-medium transition-colors inline-flex items-center gap-1.5"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : null}
          Search
        </button>
      </div>
      {error ? <p className="text-xs text-red-400 mt-2 px-1">{error}</p> : null}
    </form>
  );
}
