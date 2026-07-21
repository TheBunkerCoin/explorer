'use client';

import { useEffect, useState } from 'react';

// Read a single query-string param on the client. Detail routes are static
// pages (output: 'export' can't pre-render unbounded runtime ids), so the
// entity id travels in the query string and is read in the browser.
// Returns undefined during SSR/first paint, then the value once mounted.
export function useQueryParam(key: string): string | undefined {
  const [value, setValue] = useState<string | undefined>(undefined);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValue(params.get(key) ?? '');
  }, [key]);
  return value;
}
