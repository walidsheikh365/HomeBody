import { useEffect, useState } from 'react';

type Sentinel = { release: () => Promise<void>; released: boolean; addEventListener: (t: 'release', cb: () => void) => void };
type WakeLockApi = { request: (type: 'screen') => Promise<Sentinel> };

export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

/**
 * Keeps the screen awake while `enabled`. Re-acquires after the page becomes
 * visible again (the OS releases the lock when you switch away). Fails silently
 * where unsupported, in which case the screen follows the normal auto-lock.
 */
export function useWakeLock(enabled: boolean): { supported: boolean; held: boolean } {
  const supported = wakeLockSupported();
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!enabled || !supported) return;
    let sentinel: Sentinel | null = null;
    let cancelled = false;
    const api = (navigator as unknown as { wakeLock: WakeLockApi }).wakeLock;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      try {
        sentinel = await api.request('screen');
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        setHeld(true);
        sentinel.addEventListener('release', () => setHeld(false));
      } catch {
        setHeld(false);
      }
    };

    acquire();
    const onVis = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVis);
    // Some iOS versions only grant the lock from a user gesture.
    window.addEventListener('pointerdown', acquire, { passive: true });
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointerdown', acquire);
      sentinel?.release().catch(() => {});
      setHeld(false);
    };
  }, [enabled, supported]);

  return { supported, held };
}
