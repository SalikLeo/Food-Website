import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CustomerNotificationBanner() {
  const { activeOrderNotification, dismissOrderNotification } = useCart();

  useEffect(() => {
    if (activeOrderNotification) {
      // Automatically remove popup after 3 seconds
      const timer = setTimeout(() => {
        dismissOrderNotification();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeOrderNotification, dismissOrderNotification]);

  if (!activeOrderNotification) return null;

  const { order, newStatus, details } = activeOrderNotification;
  const cleanId = String(order?.id || '').replace(/^#/, '');

  // Clean duplicate emoji from title so the icon container handles the emoji
  const cleanTitle = (details?.title || 'Order Update!')
    .replace(/^[\p{Emoji}\s]+/u, '')
    .trim() || 'ORDER UPDATE';

  return (
    <div className="fixed top-4 inset-x-0 mx-auto z-[130] w-[94%] max-w-md animate-in slide-in-from-top-4 duration-300">
      <div className="p-4 sm:p-4.5 rounded-2xl border-2 border-orange-500 bg-[#16161e] text-white shadow-[0_16px_45px_rgba(0,0,0,0.85)] ring-4 ring-orange-500/25">
        
        {/* Top Header */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10 gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
              {details?.icon || '🔔'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-montserrat text-sm font-extrabold uppercase text-orange-400 leading-tight tracking-wide break-words">
                {cleanTitle}
              </h3>
              <div className="text-[11px] text-zinc-300 font-semibold mt-1 leading-snug break-words flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span>Order #{cleanId}</span>
                <span className="text-zinc-500">•</span>
                <span>Status: <strong className="text-white font-bold">{newStatus}</strong></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissOrderNotification}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-0.5"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* High contrast, crisp body text */}
        <p className="text-xs sm:text-[13px] text-zinc-100 font-medium leading-relaxed my-3 break-words">
          {details?.body}
        </p>

        {/* Action Button: Dismiss only */}
        <div className="pt-1">
          <button
            type="button"
            onClick={dismissOrderNotification}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-zinc-200 hover:text-white border border-white/10 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-98 text-center"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
}
