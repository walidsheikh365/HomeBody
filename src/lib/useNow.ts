import { useEffect, useState } from 'react';

/**
 * Re-renders periodically while `active`. The value is only a render trigger:
 * every timer derives its display from `Date.now() - startedAt`, so throttled
 * or suspended intervals never cause drift.
 */
export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    const onVis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, [active, intervalMs]);
  return active ? now : Date.now();
}

/** Elapsed ms for a start/pause style timer. */
export function elapsedMs(startedAt: number | null, accumulatedMs: number, now = Date.now()): number {
  return accumulatedMs + (startedAt != null ? Math.max(0, now - startedAt) : 0);
}
