import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, Phone, RotateCcw, CheckCircle2, X } from 'lucide-react';
import { apiUrl } from '../config/api';

export default function OfflineNotice() {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showRestored, setShowRestored] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Probe actual connectivity via a quick fetch probe
  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(apiUrl('/api/settings'), {
        cache: 'no-store',
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) {
        setIsOnline(true);
        setDismissed(false);
        setShowRestored(true);
        window.dispatchEvent(new CustomEvent('salik_retry_connection'));
        setTimeout(() => setShowRestored(false), 3500);
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
      }
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
      setShowRestored(true);
      window.dispatchEvent(new CustomEvent('salik_retry_connection'));
      const timer = setTimeout(() => setShowRestored(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to manual retry requests from other components
  useEffect(() => {
    const onManualRetry = () => checkConnection();
    window.addEventListener('salik_check_online', onManualRetry);
    return () => window.removeEventListener('salik_check_online', onManualRetry);
  }, [checkConnection]);

  // Show back-online toast banner briefly
  if (showRestored) {
    return (
      <div className="fixed top-3 inset-x-0 mx-auto z-[9999] w-[92%] max-w-md pointer-events-auto animate-in slide-in-from-top-3 duration-300">
        <div className="p-3 rounded-2xl border-2 border-emerald-500/80 bg-[#0f1f17] text-white shadow-2xl ring-4 ring-emerald-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Back Online • Internet connection restored</span>
          </div>
          <button
            type="button"
            onClick={() => setShowRestored(false)}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center cursor-pointer transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Hide if online or user temporarily dismissed banner
  if (isOnline || dismissed) return null;

  return (
    <div className="fixed top-3 inset-x-0 mx-auto z-[9999] w-[94%] max-w-md pointer-events-auto animate-in slide-in-from-top-4 duration-300">
      <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-red-500/80 bg-[#161214] text-white shadow-[0_16px_45px_rgba(0,0,0,0.85)] ring-4 ring-red-500/25 backdrop-blur-md">
        
        {/* Header & Message */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-600/90 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                <h3 className="font-montserrat text-sm font-extrabold uppercase text-red-400 tracking-wide leading-tight">
                  No Internet Connection
                </h3>
              </div>
              <p className="text-[11px] text-zinc-300 font-medium mt-1 leading-snug">
                You are currently offline. Please check your connection or call our shop directly to place your order:
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            title="Minimize"
            aria-label="Dismiss warning"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2">
          <a
            href="tel:03095369472"
            className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md transition-all whitespace-nowrap"
          >
            <Phone className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>Call Shop (0309-5369472)</span>
          </a>

          <button
            type="button"
            onClick={checkConnection}
            disabled={isChecking}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-zinc-200 font-semibold text-xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Retry'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
