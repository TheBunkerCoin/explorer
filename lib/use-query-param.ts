'use client';

import { useEffect, useState } from 'react';

// Read a single query-string param, reactively across same-route navigation.
//
// Detail routes are static pages (output: 'export' can't pre-render unbounded
// runtime ids), so the entity id travels in the query string. Navigating
// BETWEEN two ids of the SAME route — e.g. /block?id=5 → /block?id=4 via a
// parent link — does NOT remount the component and, because Next's <Link>
// uses history.pushState (which fires no 'popstate'), a one-shot read would
// leave the page showing stale data while the URL changed.
//
// We avoid `useSearchParams` (it forces a <Suspense> boundary under static
// export) and instead re-read window.location.search on every navigation by
// patching history.pushState/replaceState to emit an event we subscribe to,
// plus the native popstate for back/forward.
//
// Returns undefined until mounted (SSR/first paint), then '' if absent.
export function useQueryParam(key: string): string | undefined {
  const [value, setValue] = useState<string | undefined>(undefined);

  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setValue(params.get(key) ?? '');
    };
    read();

    // Patch pushState/replaceState once so client-side navigations (which
    // don't fire popstate) still notify us. Guarded to install a single time.
    const w = window as unknown as { __qpPatched?: boolean };
    if (!w.__qpPatched) {
      w.__qpPatched = true;
      for (const method of ['pushState', 'replaceState'] as const) {
        const original = history[method];
        history[method] = function patched(this: History, ...args: unknown[]) {
          const result = (original as (...a: unknown[]) => unknown).apply(this, args);
          window.dispatchEvent(new Event('qp:navigation'));
          return result;
        } as typeof history[typeof method];
      }
    }

    window.addEventListener('popstate', read);
    window.addEventListener('qp:navigation', read);
    return () => {
      window.removeEventListener('popstate', read);
      window.removeEventListener('qp:navigation', read);
    };
  }, [key]);

  return value;
}
