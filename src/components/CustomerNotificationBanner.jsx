import React, { useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CustomerNotificationBanner() {
  const { activeOrderNotification, dismissOrderNotification, isDark, openProfileModal, setProfileTab } = useCart();

  useEffect(() => {
    if (activeOrderNotification) {
      // Automatically dismiss popup after 4.5 seconds
      const timer = setTimeout(() => {
        dismissOrderNotification();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [activeOrderNotification, dismissOrderNotification]);

  if (!activeOrderNotification) return null;

  const { order, newStatus, details } = activeOrderNotification;
  const cleanId = String(order?.id || '').replace(/^#/, '');

  // Clean duplicate emoji from title so the icon container handles the emoji
  const cleanTitle = (details?.title || 'Order Update!')
    .replace(/^[\p{Emoji}\s]+/u, '')
    .trim() || 'Order Update';

  // Context-specific theme styles based on status
  const normStatus = String(newStatus || '').toLowerCase();
  let themeConfig = {
    iconBg: 'bg-orange-50 text-orange-600 border-orange-200/60 dark:bg-orange-950/40 dark:border-orange-800/40',
    pill: 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60',
    progress: 'bg-orange-500',
    dot: 'bg-orange-500'
  };

  if (normStatus.includes('deliver') || normStatus.includes('complete')) {
    themeConfig = {
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-950/40 dark:border-emerald-800/40',
      pill: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
      progress: 'bg-emerald-500',
      dot: 'bg-emerald-500'
    };
  } else if (normStatus.includes('prepar') || normStatus.includes('cook') || normStatus.includes('kitchen')) {
    themeConfig = {
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200/60 dark:bg-amber-950/40 dark:border-amber-800/40',
      pill: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
      progress: 'bg-amber-500',
      dot: 'bg-amber-500'
    };
  } else if (normStatus.includes('cancel') || normStatus.includes('reject')) {
    themeConfig = {
      iconBg: 'bg-red-50 text-red-600 border-red-200/60 dark:bg-red-950/40 dark:border-red-800/40',
      pill: 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/60',
      progress: 'bg-red-500',
      dot: 'bg-red-500'
    };
  }

  const handleViewOrders = () => {
    dismissOrderNotification();
    if (typeof openProfileModal === 'function') {
      if (typeof setProfileTab === 'function') setProfileTab('orders');
      openProfileModal();
    }
  };

  return (
    <aside 
      aria-label="Order notification update"
      className="fixed top-4 sm:top-5 inset-x-0 mx-auto z-[130] w-[92%] max-w-md animate-in slide-in-from-top-3 fade-in duration-300"
    >
      <div 
        className={`relative overflow-hidden rounded-2xl border shadow-[0_10px_30px_-5px_rgba(0,0,0,0.12),0_4px_10px_-2px_rgba(0,0,0,0.04)] p-3.5 sm:p-4 transition-all ${
          isDark 
            ? 'bg-[#18181c] border-zinc-800 text-white shadow-black/60' 
            : 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-300/40'
        }`}
      >
        
        {/* Main Content Row */}
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl shrink-0 shadow-2xs ${themeConfig.iconBg}`}>
            {details?.icon || '🔔'}
          </div>

          {/* Text Details */}
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h4 className="font-bold text-xs sm:text-[13px] tracking-tight leading-tight">
                  {cleanTitle}
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${themeConfig.pill}`}>
                  #{cleanId}
                </span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={dismissOrderNotification}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 -mt-0.5 ${
                  isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'
                }`}
                title="Dismiss"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className={`text-xs font-medium leading-relaxed mt-1 line-clamp-2 ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}>
              {details?.body}
            </p>
          </div>
        </div>

        {/* Minimal Bottom Bar */}
        <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] ${
          isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-zinc-100 text-zinc-500'
        }`}>
          <div className="flex items-center gap-1.5 font-medium">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${themeConfig.dot}`} />
            <span>Status: <strong className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>{newStatus}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleViewOrders}
              className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-0.5 cursor-pointer transition-colors"
            >
              <span>View</span>
              <ChevronRight className="w-3 h-3" />
            </button>
            <span className={isDark ? 'text-zinc-700' : 'text-zinc-300'}>•</span>
            <button
              type="button"
              onClick={dismissOrderNotification}
              className={`font-semibold cursor-pointer transition-colors ${
                isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Smooth countdown progress bar along the bottom */}
        <div className={`absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden ${
          isDark ? 'bg-zinc-800' : 'bg-zinc-100'
        }`}>
          <div 
            className={`h-full ${themeConfig.progress}`}
            style={{
              animation: 'orderNotificationTimer 4.5s linear forwards'
            }}
          />
        </div>

      </div>

      <style>{`
        @keyframes orderNotificationTimer {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </aside>
  );
}
