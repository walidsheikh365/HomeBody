import { useEffect, useRef } from 'react';

/**
 * Fires `onCross` once when `value` goes from below `threshold` to >= it.
 * Ignores crossings detected long after the fact (e.g. after the screen was
 * locked for minutes) so stale beeps don't play on return.
 */
export function useCrossing(value: number | null, threshold: number | null, onCross: () => void, staleAfter = 2500) {
  const prev = useRef<number | null>(value);
  const cb = useRef(onCross);
  cb.current = onCross;
  useEffect(() => {
    const p = prev.current;
    prev.current = value;
    if (value == null || threshold == null || p == null) return;
    if (p < threshold && value >= threshold && value - threshold <= staleAfter) cb.current();
  }, [value, threshold, staleAfter]);
}
