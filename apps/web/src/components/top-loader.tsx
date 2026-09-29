'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * TopLoader provides immediate 0ms visual feedback on any link click
 * across the entire application, eliminating the feeling of frozen UI during RSC fetches.
 */
export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reset/complete loader whenever the route or search parameters change
    setLoading(false);
    setProgress(100);
    const timeout = setTimeout(() => {
      setProgress(0);
    }, 250);
    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleAnchorClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Only trigger for internal links that don't open in new tabs
      if (
        href.startsWith('/') &&
        !href.startsWith('//') &&
        anchor.target !== '_blank' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        const url = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Don't trigger if it's the exact same page and hash
        if (url.pathname === currentUrl.pathname && url.search === currentUrl.search && url.hash) {
          return;
        }

        setLoading(true);
        setProgress(25);
      }
    }

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  useEffect(() => {
    if (!loading) return;

    const t1 = setTimeout(() => setProgress(55), 200);
    const t2 = setTimeout(() => setProgress(80), 600);
    const t3 = setTimeout(() => setProgress(92), 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [loading]);

  if (progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-9999 h-[3px] pointer-events-none bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(16,185,129,0.7)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: progress === 100 ? 'width 200ms ease-out, opacity 250ms ease-out 100ms' : 'width 300ms ease-out',
        }}
      />
    </div>
  );
}
