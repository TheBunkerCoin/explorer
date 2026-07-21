'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function truncate(value: string, head = 8, tail = 8) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className={cn('text-muted-foreground hover:text-foreground transition-colors', className)}
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

// A monospace hash/pubkey that links to its detail page and offers a copy
// button. `href` omitted → plain (non-linked) mono text with copy.
export function HashLink({
  value,
  href,
  truncateTo,
  className,
}: {
  value: string;
  href?: string;
  truncateTo?: [number, number] | false;
  className?: string;
}) {
  const shown =
    truncateTo === false
      ? value
      : truncate(value, truncateTo?.[0] ?? 8, truncateTo?.[1] ?? 8);
  const body = (
    <span className={cn('font-mono text-sm break-all', className)}>{shown}</span>
  );
  return (
    <span className="inline-flex items-center gap-1.5">
      {href ? (
        <Link href={href} className="text-emerald-500 hover:text-emerald-400 hover:underline">
          {body}
        </Link>
      ) : (
        body
      )}
      <CopyButton value={value} />
    </span>
  );
}

// A labeled row in a detail card: fixed-width label on the left, value on the
// right. Stacks on narrow screens.
export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4 border-b border-border/50 last:border-0">
      <div className="w-full sm:w-44 shrink-0 text-sm text-muted-foreground">{label}</div>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: 'success' | 'pending' | 'error' | 'neutral';
  children: React.ReactNode;
}) {
  const tones = {
    success: 'bg-emerald-500/20 text-emerald-500',
    pending: 'bg-amber-500/20 text-amber-500',
    error: 'bg-red-500/20 text-red-400',
    neutral: 'bg-muted text-muted-foreground',
  } as const;
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-md font-medium', tones[tone])}>
      {children}
    </span>
  );
}

// Shared page shell for the detail routes: centered column, back-to-explorer
// link, a title, and slotted content.
export function EntityPage({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-0 py-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Explorer
        </Link>
        <h2 className="text-xl font-semibold mt-4 mb-5">{title}</h2>
        {children}
      </div>
    </main>
  );
}

export function NotFoundCard({ what, id }: { what: string; id: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-6">
      <p className="text-sm">
        No {what} found for{' '}
        <span className="font-mono break-all text-muted-foreground">{id}</span>.
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        It may not have reached the chain yet — transactions can take a few minutes to
        finalize over the radio link.
      </p>
    </div>
  );
}
