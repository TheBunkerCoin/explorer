'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Header from '@/components/header';
import { EntityPage, DetailRow, HashLink, NotFoundCard } from '@/components/explorer-ui';
import { useQueryParam } from '@/lib/use-query-param';
import { api, hexToBase58 } from '@/lib/api';
import { TokenSummary, TokenHolder } from '@/lib/types';

export default function TokenPage() {
  const id = useQueryParam('id');
  const [token, setToken] = useState<TokenSummary | null>(null);
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id === undefined) return;
    if (!id) {
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    Promise.all([
      api.getTokens().then((all) => all.find((t) => t.id.toLowerCase() === id.toLowerCase()) ?? null),
      api.getTokenHolders(id).catch(() => []),
    ])
      .then(([t, h]) => {
        if (!live) return;
        setToken(t);
        setHolders(h);
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [id]);

  return (
    <>
      <Header />
      <EntityPage title="Token">
        {loading || id === undefined ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </div>
        ) : !token ? (
          <NotFoundCard what="token" id={id} />
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border border-border/60 bg-card px-5">
              <DetailRow label="Token ID">
                <HashLink value={token.id} truncateTo={false} />
              </DetailRow>
              <DetailRow label="Ticker">{token.ticker}</DetailRow>
              <DetailRow label="Supply">{token.current_supply.toLocaleString()}</DetailRow>
              {token.max_supply !== undefined ? (
                <DetailRow label="Max supply">{token.max_supply.toLocaleString()}</DetailRow>
              ) : null}
            </div>

            {holders.length > 0 ? (
              <div className="rounded-lg border border-border/60 bg-card p-5">
                <h3 className="text-sm font-medium mb-3">Holders ({holders.length})</h3>
                <div className="space-y-2">
                  {holders.map((h) => (
                    <div key={h.pubkey} className="flex items-center justify-between text-sm">
                      <HashLink value={hexToBase58(h.pubkey)} href={`/account?address=${h.pubkey}`} />
                      <span className="font-mono">{h.balance.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </EntityPage>
    </>
  );
}
