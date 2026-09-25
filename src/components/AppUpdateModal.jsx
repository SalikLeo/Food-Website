import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  DownloadCloud, 
  X, 
  ExternalLink, 
  RefreshCw 
} from 'lucide-react';

export default function AppUpdateModal({
  isOpen,
  onClose,
  updateInfo,
  currentVersion = '1.0.1',
  isLatest = false,
  isDark = false,
  appName = 'Salik Fast Food'
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  if (!isOpen) return null;

  const apkUrl = updateInfo?.apkUrl || 'https://salikleo.website/downloads/Salik-Fast-Food-Customer.apk';
  const remoteVersion = updateInfo?.version || currentVersion;
  const releaseNotes = updateInfo?.releaseNotes || [
    'Performance improvements and bug fixes',
    'Live server image streaming',
    'Optimized app speed and responsiveness'
  ];
  const sizeMB = updateInfo?.sizeMB || '15.2 MB';

  const handleStartDownload = () => {
    setIsDownloading(true);
    setDownloadStarted(true);

    try {
      // 1. Direct open via Capacitor system handler
      if (typeof window !== 'undefined') {
        window.open(apkUrl, '_system');
      }

      // 2. Fallback direct download anchor trigger
      const a = document.createElement('a');
      a.href = apkUrl;
      a.download = updateInfo?.apkName || 'Salik-Fast-Food.apk';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download trigger error:', e);
    }

    setTimeout(() => {
      setIsDownloading(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div 
        className={`relative w-full max-w-sm sm:max-w-md rounded-3xl p-6 shadow-2xl border transition-all duration-300 z-10 animate-in fade-in zoom-in-95 ${
          isDark 
            ? 'bg-[#181820] border-white/10 text-white' 
            : 'bg-white border-zinc-200 text-zinc-900'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isDark 
              ? 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white' 
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
          }`}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {isLatest && !downloadStarted ? (
          /* ============================================================== */
          /* STATE 1: ALREADY UP TO DATE */
          /* ============================================================== */
          <div className="text-center py-2 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-montserrat text-lg font-bold uppercase tracking-tight">
                You're All Caught Up!
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                You are currently running the latest build of <strong>{appName}</strong>.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-98 transition-all cursor-pointer"
              >
                Done
              </button>
              <button
                type="button"
                onClick={handleStartDownload}
                className={`w-full py-2.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isDark 
                    ? 'border-white/10 hover:bg-white/5 text-zinc-400' 
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                }`}
              >
                <DownloadCloud className="w-3.5 h-3.5" />
                <span>Re-download Latest APK ({sizeMB})</span>
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* STATE 2: NEW UPDATE AVAILABLE OR DOWNLOADING */
          /* ============================================================== */
          <div className="space-y-4">
            {/* Header Badge */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-500 block">
                  New Build Available
                </span>
                <h3 className="font-montserrat text-lg font-bold uppercase tracking-tight">
                  Update {appName}
                </h3>
              </div>
            </div>

            {/* Release Notes */}
            <div>
              <span className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                What's New:
              </span>
              <ul className={`space-y-1.5 text-xs rounded-2xl p-3 border ${
                isDark ? 'bg-black/20 border-white/5 text-zinc-300' : 'bg-zinc-50/80 border-zinc-200 text-zinc-700'
              }`}>
                {Array.isArray(releaseNotes) ? releaseNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                    <span>{note}</span>
                  </li>
                )) : (
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                    <span>{releaseNotes}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Download Status or Instructions */}
            {downloadStarted ? (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Download Started!</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Android is downloading the update. Pull down your top notification bar and tap the file once finished to install.
                </p>
              </div>
            ) : (
              <div className={`text-[11px] flex items-center justify-between px-1 ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                <span>Package Size: <strong>{sizeMB}</strong></span>
                <span>Fast 1-tap installation</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleStartDownload}
                disabled={isDownloading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <DownloadCloud className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                <span>{downloadStarted ? 'Download Again (.APK)' : `Download & Update Now (${sizeMB})`}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {downloadStarted ? 'Close Window' : 'Maybe Later'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
