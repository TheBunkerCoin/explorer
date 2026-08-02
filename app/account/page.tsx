'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Header from '@/components/header';
import { EntityPage, DetailRow, HashLink, NotFoundCard } from '@/components/explorer-ui';
import { useQueryParam } from '@/lib/use-query-param';
import { api, hexToBase58, formatBunker } from '@/lib/api';
import { AccountDetails } from '@/lib/types';

export default function AccountPage() {
  const address = useQueryParam('address');
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address === undefined) return;
    if (!address) {
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    api
      .getAccount(address)
      .then((r) => live && setAccount(r))
      .catch(() => live && setAccount(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [address]);

  const tokens = account ? Object.entries(account.token_balances ?? {}) : [];

  return (
    <>
      <Header />
      <EntityPage title="Account">
        {loading || address === undefined ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </div>
        ) : !account ? (
          <NotFoundCard what="account" id={address} />
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border border-border/60 bg-card px-5">
              <DetailRow label="Address">
                <HashLink value={hexToBase58(account.pubkey ?? address)} truncateTo={false} />
              </DetailRow>
              <DetailRow label="Balance">
                <span className="text-lg font-semibold">
                  {formatBunker(account.native_balance)}
                </span>{' '}
                <span className="text-muted-foreground text-sm">BUNKER</span>
              </DetailRow>
              <DetailRow label="Nonce">{account.nonce}</DetailRow>
            </div>

            {tokens.length > 0 ? (
              <div className="rounded-lg border border-border/60 bg-card p-5">
                <h3 className="text-sm font-medium mb-3">Token balances</h3>
                <div className="space-y-2">
                  {tokens.map(([id, bal]) => (
                    <div key={id} className="flex items-center justify-between text-sm">
                      <HashLink value={id} href={`/token?id=${id}`} truncateTo={false} />
                      <span className="font-mono">{Number(bal).toLocaleString()}</span>
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
