'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Header from '@/components/header';
import {
  EntityPage,
  DetailRow,
  HashLink,
  StatusPill,
  NotFoundCard,
} from '@/components/explorer-ui';
import { useQueryParam } from '@/lib/use-query-param';
import { api, hexToBase58, formatBunker } from '@/lib/api';
import { TransactionDetails } from '@/lib/types';

function statusPill(status: TransactionDetails['status']) {
  if (status.location === 'finalized') {
    return status.success === false ? (
      <StatusPill tone="error">failed</StatusPill>
    ) : (
      <StatusPill tone="success">finalized</StatusPill>
    );
  }
  if (status.location === 'confirmed') return <StatusPill tone="pending">confirmed</StatusPill>;
  return <StatusPill tone="pending">pending (mempool)</StatusPill>;
}

export default function TransactionPage() {
  const sig = useQueryParam('sig');
  const [tx, setTx] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sig === undefined) return;
    if (!sig) {
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    api
      .getTransaction(sig)
      .then((r) => live && setTx(r))
      .catch(() => live && setTx(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [sig]);

  const body = tx?.body;
  const isTransfer = body?.type === 'Transfer' || body?.to !== undefined;

  return (
    <>
      <Header />
      <EntityPage title="Transaction">
        {loading || sig === undefined ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </div>
        ) : !tx ? (
          <NotFoundCard what="transaction" id={sig} />
        ) : (
          <div className="rounded-lg border border-border/60 bg-card px-5">
            <DetailRow label="Signature">
              <HashLink value={tx.hash} truncateTo={false} />
            </DetailRow>
            <DetailRow label="Status">{statusPill(tx.status)}</DetailRow>
            {tx.status.error ? (
              <DetailRow label="Error">
                <span className="text-red-400">{tx.status.error}</span>
              </DetailRow>
            ) : null}
            {tx.status.slot !== undefined ? (
              <DetailRow label="Slot">
                <HashLink value={String(tx.status.slot)} href={`/block?id=${tx.status.slot}`} truncateTo={false} />
              </DetailRow>
            ) : null}
            {tx.status.block_hash ? (
              <DetailRow label="Block">
                <HashLink value={tx.status.block_hash} href={`/block?id=${tx.status.block_hash}`} />
              </DetailRow>
            ) : null}
            <DetailRow label="Type">{body?.type ?? (isTransfer ? 'Transfer' : 'Unknown')}</DetailRow>
            <DetailRow label="From">
              <HashLink value={hexToBase58(tx.sender)} href={`/account?address=${tx.sender}`} />
            </DetailRow>
            {body?.to ? (
              <DetailRow label="To">
                <HashLink value={hexToBase58(body.to)} href={`/account?address=${body.to}`} />
              </DetailRow>
            ) : null}
            {body?.amount !== undefined ? (
              <DetailRow label="Amount">
                {body.token_id ? `${body.amount.toLocaleString()} tokens` : `${formatBunker(body.amount)} BUNKER`}
              </DetailRow>
            ) : null}
            {body?.token_id ? (
              <DetailRow label="Token">
                <HashLink value={body.token_id} href={`/token?id=${body.token_id}`} truncateTo={false} />
              </DetailRow>
            ) : null}
            <DetailRow label="Fee">{formatBunker(tx.fee)} BUNKER</DetailRow>
            <DetailRow label="Nonce">{tx.nonce}</DetailRow>
          </div>
        )}
      </EntityPage>
    </>
  );
}
