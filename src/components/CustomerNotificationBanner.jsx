import React, { useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CustomerNotificationBanner({ onTrackOrder }) {
  const { activeOrderNotification, dismissOrderNotification } = useCart();

  useEffect(() => {
    if (activeOrderNotification) {
      const timer = setTimeout(() => {
        dismissOrderNotification();
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [activeOrderNotification, dismissOrderNotification]);

  if (!activeOrderNotification) return null;

  const { order, newStatus, details } = activeOrderNotification;
  const cleanId = String(order?.id || '').replace(/^#/, '');

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md animate-in slide-in-from-top-4 duration-300">
      <div className="p-3.5 sm:p-4 rounded-2xl border-2 border-orange-500 bg-white/98 dark:bg-[#1a1a24]/98 text-zinc-900 dark:text-white shadow-2xl backdrop-blur-md ring-4 ring-orange-500/20">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-200/50 dark:border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center text-base shadow-xs shrink-0 animate-bounce">
              {details?.icon || '🔔'}
            </div>
            <div className="min-w-0">
              <h3 className="font-montserrat text-xs sm:text-sm font-extrabold uppercase text-orange-600 dark:text-orange-500 leading-none truncate">
                {details?.title || 'Order Update!'}
              </h3>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5 block truncate">
                Order #{cleanId} • Status: {newStatus}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissOrderNotification}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-2 line-clamp-2">
          {details?.body}
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          {onTrackOrder && (
            <button
              type="button"
              onClick={() => {
                dismissOrderNotification();
                onTrackOrder(order);
              }}
              className="flex-1 py-1.5 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <span>Track Order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={dismissOrderNotification}
            className={`${onTrackOrder ? '' : 'flex-1'} py-1.5 px-3 rounded-lg bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer`}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
