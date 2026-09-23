import React, { useEffect } from 'react';
import { X, ArrowRight, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CustomerNotificationBanner({ onTrackOrder, onAddReview }) {
  const { activeOrderNotification, dismissOrderNotification, openProfileModal } = useCart();

  useEffect(() => {
    if (activeOrderNotification) {
      const timer = setTimeout(() => {
        dismissOrderNotification();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activeOrderNotification, dismissOrderNotification]);

  if (!activeOrderNotification) return null;

  const { order, newStatus, details } = activeOrderNotification;
  const cleanId = String(order?.id || '').replace(/^#/, '');
  const isDelivered = String(newStatus || order?.status || '').toLowerCase() === 'delivered';

  // Clean duplicate emoji from title so the icon container handles the emoji
  const cleanTitle = (details?.title || 'Order Update!')
    .replace(/^[\p{Emoji}\s]+/u, '')
    .trim() || 'ORDER UPDATE';

  const handleAction = () => {
    dismissOrderNotification();
    if (isDelivered) {
      if (typeof onAddReview === 'function') {
        onAddReview(order);
      } else if (typeof openProfileModal === 'function') {
        openProfileModal('reviews');
      }
    } else {
      if (typeof onTrackOrder === 'function') {
        onTrackOrder(order);
      } else if (typeof openProfileModal === 'function') {
        openProfileModal('orders');
      }
    }
  };

  return (
    <div className="fixed top-4 inset-x-0 mx-auto z-[130] w-[94%] max-w-md animate-in slide-in-from-top-4 duration-300">
      <div className="p-4 sm:p-4.5 rounded-2xl border-2 border-orange-500 bg-[#16161e] text-white shadow-[0_16px_45px_rgba(0,0,0,0.85)] ring-4 ring-orange-500/25">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center text-xl shadow-sm shrink-0">
              {details?.icon || '🔔'}
            </div>
            <div className="min-w-0">
              <h3 className="font-montserrat text-sm font-extrabold uppercase text-orange-400 leading-tight tracking-wide truncate">
                {cleanTitle}
              </h3>
              <span className="text-[11px] text-zinc-300 font-semibold mt-0.5 block truncate">
                Order #{cleanId} • Status: <span className="text-white font-bold">{newStatus}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissOrderNotification}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          {isDelivered ? (
            <button
              type="button"
              onClick={handleAction}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Star className="w-4 h-4 fill-amber-300 text-amber-300 shrink-0" />
              <span>Add Review</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAction}
              className="flex-1 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <span>Track Order</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          )}

          <button
            type="button"
            onClick={dismissOrderNotification}
            className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer active:scale-95"
          >
            Dismiss
          </button>
        </div>

      </div>
    </div>
  );
}
