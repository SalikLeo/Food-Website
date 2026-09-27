import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { isMobileApp } from '../config/api';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Never show if running inside native Capacitor APK or already installed as standalone PWA
    if (typeof window === 'undefined') return;
    if (isMobileApp || window.Capacitor) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    // 2. Check if dismissed recently (14-day snooze)
    const dismissedTime = localStorage.getItem('salik_pwa_prompt_dismissed');
    if (dismissedTime && Date.now() - Number(dismissedTime) < 14 * 86400000) {
      return;
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);

    if (isIosDevice) {
      setIsIOS(true);
      // Wait 3 seconds after page load before showing prompt
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    // 4. Android / Chrome / Edge beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setIsVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIOSModal(false);
    try {
      localStorage.setItem('salik_pwa_prompt_dismissed', String(Date.now()));
    } catch {}
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Non-intrusive floating bottom install bar */}
      <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-zinc-900/95 backdrop-blur-md border border-orange-500/30 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 ring-2 ring-black/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shrink-0 shadow-md">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xs text-white leading-tight truncate">
                {isIOS ? 'Add to iPhone Home Screen' : 'Install Salik Fast Food App'}
              </h4>
              <p className="text-[11px] text-zinc-400 leading-tight truncate mt-0.5">
                Fast 1-tap ordering & live status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close"
              aria-label="Close install prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated iOS Safari Step-by-Step Instructions Modal */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-5 text-white shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-sm">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Install Salik Fast Food onto your iPhone home screen for full-screen app ordering without the App Store:
            </p>

            <div className="space-y-3 text-xs bg-black/40 p-3.5 rounded-xl border border-white/5">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600/30 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <div>
                  Tap the <strong className="text-white">Share</strong> button <Share className="w-3.5 h-3.5 text-blue-400 inline mx-0.5" /> at the bottom of Safari.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600/30 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <div>
                  Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 text-zinc-300 inline mx-0.5" />.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600/30 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <div>
                  Tap <strong className="text-white">"Add"</strong> at the top right corner. Done!
                </div>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Got It, Thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
