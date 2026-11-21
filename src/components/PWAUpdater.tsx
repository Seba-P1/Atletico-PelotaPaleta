import React, { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export const PWAUpdater: React.FC = () => {
  const hadControllerRef = useRef<boolean>(
    typeof navigator !== 'undefined' && Boolean(navigator.serviceWorker?.controller)
  );
  const reloadingRef = useRef<boolean>(false);
  const lastCheckTimestampRef = useRef<number>(0);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (r) {
        registrationRef.current = r;
        const now = Date.now();
        lastCheckTimestampRef.current = now;
        r.update().catch(() => {});
      }
    },
    onRegisterError(error) {
      console.warn('PWA register error:', error);
    },
  });

  // Chequeos de actualización al enfocar, cambiar visibilidad, online y periódico cada 5 min
  useEffect(() => {
    const triggerUpdate = () => {
      const reg = registrationRef.current;
      if (!reg) return;
      const now = Date.now();
      // Throttling: al menos 30 segundos entre chequeos
      if (now - lastCheckTimestampRef.current < 30_000) return;
      lastCheckTimestampRef.current = now;
      reg.update().catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerUpdate();
      }
    };
    const handleFocus = () => triggerUpdate();
    const handleOnline = () => triggerUpdate();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    const intervalId = window.setInterval(triggerUpdate, 5 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.clearInterval(intervalId);
    };
  }, []);

  // Auto-recargar cuando un nuevo Service Worker tome el control (skipWaiting + clientsClaim)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;

    const handleControllerChange = () => {
      if (hadControllerRef.current && !reloadingRef.current) {
        reloadingRef.current = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  if (!needRefresh) {
    return null;
  }

  return (
    <aside
      aria-label="Actualización disponible"
      className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-auto p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 shadow-2xl text-slate-900 dark:text-slate-100 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
          <RefreshCw className="w-4 h-4 animate-spin" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
            Nueva versión disponible
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Hay una nueva versión disponible del club
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            updateServiceWorker(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
        >
          Actualizar ahora
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          title="Después"
          aria-label="Posponer actualización"
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
