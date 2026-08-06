import { useEffect, useRef } from 'react';

export function useWakeLock(isActive: boolean) {
  const wakeLock = useRef<any>(null);

  useEffect(() => {
    const requestLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock.current = await navigator.wakeLock.request('screen');
        }
      } catch (err) { console.error('WakeLock error:', err) }
    };

    const releaseLock = async () => {
      if (wakeLock.current) {
        await wakeLock.current.release();
        wakeLock.current = null;
      }
    };

    isActive ? requestLock() : releaseLock();

    // Re-solicitar el bloqueo si el usuario minimiza y vuelve a maximizar la app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) requestLock()
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      releaseLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]);
}