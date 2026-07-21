'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Header from '@/components/header';
import { EntityPage, DetailRow, HashLink, StatusPill, NotFoundCard } from '@/components/explorer-ui';
import { useQueryParam } from '@/lib/use-query-param';
import { api } from '@/lib/api';
import { BlockDetails } from '@/lib/types';

export default function BlockPage() {
  const id = useQueryParam('id');
  const [block, setBlock] = useState<BlockDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id === undefined) return;
    if (!id) {
      setLoading(false);
      return;
    }
    let live = true;
    setLoading(true);
    // A pure integer id is a slot; anything else is a block hash.
    const fetcher = /^\d+$/.test(id) ? api.getBlockBySlot(Number(id)) : api.getBlock(id);
    fetcher
      .then((r) => live && setBlock(r))
      .catch(() => live && setBlock(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [id]);

  const ts = block?.finalized_timestamp ?? block?.proposed_timestamp ?? block?.timestamp;

  return (
    <>
      <Header />
      <EntityPage title={`Block${block ? ` #${block.slot}` : ''}`}>
        {loading || id === undefined ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </div>
        ) : !block ? (
          <NotFoundCard what="block" id={id} />
        ) : (
          <div className="rounded-lg border border-border/60 bg-card px-5">
            <DetailRow label="Slot">{block.slot}</DetailRow>
            <DetailRow label="Status">
              {block.status === 'finalized' ? (
                <StatusPill tone="success">finalized</StatusPill>
              ) : (
                <StatusPill tone="pending">{block.status}</StatusPill>
              )}
            </DetailRow>
            <DetailRow label="Hash">
              <HashLink value={block.hash} truncateTo={false} />
            </DetailRow>
            {block.producer !== undefined ? (
              <DetailRow label="Producer">Node {block.producer}</DetailRow>
            ) : null}
            {block.parent_slot !== undefined ? (
              <DetailRow label="Parent">
                <HashLink
                  value={`slot ${block.parent_slot}`}
                  href={`/block?id=${block.parent_slot}`}
                  truncateTo={false}
                />
              </DetailRow>
            ) : null}
            {block.parent_hash ? (
              <DetailRow label="Parent hash">
                <HashLink value={block.parent_hash} href={`/block?id=${block.parent_hash}`} />
              </DetailRow>
            ) : null}
            {ts ? (
              <DetailRow label="Time">
                {new Date(ts).toLocaleString()}{' '}
                <span className="text-muted-foreground">
                  ({formatDistanceToNow(new Date(ts), { addSuffix: true })})
                </span>
              </DetailRow>
            ) : null}
          </div>
        )}
      </EntityPage>
    </>
  );
}
