import React from 'react';
import { X, Clock, MapPin } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';

export default function OrderSuccessModal({ isDark: propIsDark } = {}) {
  const { orderModalOpen, setOrderModalOpen, lastOrder, isDark: contextIsDark } = useCart();
  const isDark = propIsDark !== undefined ? propIsDark : contextIsDark;

  if (!orderModalOpen || !lastOrder) return null;

  const handleWhatsAppTrack = () => {
    const text = encodeURIComponent(
      `Assalam o Alaikum! I placed order #${lastOrder.id} for Rs. ${formatPrice(lastOrder.total)}. Please confirm the delivery time.`
    );
    window.open(`https://wa.me/923095369472?text=${text}`, '_blank');
  };

  const formattedDate = lastOrder.createdAt
    ? new Date(lastOrder.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    : 'Just now';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-tab-fade overflow-y-auto">
      <div className={`relative w-full max-w-md border rounded-3xl p-5 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden text-center space-y-4 my-auto ${
        isDark ? 'bg-[#18181c] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-xl'
      }`}>
        
        {/* Decorative Top Accent Glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={() => setOrderModalOpen(false)}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-10 cursor-pointer ${
            isDark ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900'
          }`}
          title="Close modal"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex flex-col items-center space-y-1 pt-1">
          <h3 className={`font-montserrat text-xl sm:text-2xl font-bold uppercase tracking-tight ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}>
            Order Confirmed!
          </h3>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Thank you, <strong className={isDark ? 'text-white' : 'text-zinc-900'}>{lastOrder.customerName || 'Customer'}</strong>. Your meal is being prepared!
          </p>
        </div>

        {/* Order Details Card */}
        <div className={`border rounded-2xl p-4 text-left space-y-3 text-xs ${
          isDark ? 'bg-[#121214] border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <div className={`flex justify-between items-center pb-2 border-b ${
            isDark ? 'text-zinc-400 border-zinc-800' : 'text-zinc-500 border-zinc-200'
          }`}>
            <span className="font-medium">Order ID</span>
            <span className="text-orange-500 font-bold">#{lastOrder.id}</span>
          </div>

          <div className={`flex justify-between items-center ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-orange-500" /> Placed at</span>
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-800 font-medium'}>{formattedDate}</span>
          </div>

          {lastOrder.address && (
            <div className={`flex justify-between items-start ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              <span className="flex items-center gap-1.5 shrink-0"><MapPin className="w-3.5 h-3.5 text-orange-500" /> Address</span>
              <span className={`text-right font-medium truncate max-w-[200px] ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>{lastOrder.address}</span>
            </div>
          )}

          <div className={`pt-2 border-t space-y-1.5 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <div className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Items Ordered</div>
            <div className="max-h-36 overflow-y-auto space-y-1.5 modal-items-scroll pr-1">
              {(lastOrder.items || []).map((it, idx) => (
                <div key={idx} className={`flex justify-between ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  <span className="truncate pr-2">
                    <strong className={isDark ? 'text-white' : 'text-zinc-900'}>{it.quantity}×</strong> {it.name} {it.size ? `(${it.size})` : ''}
                  </span>
                  <span className={`shrink-0 font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Rs. {formatPrice(it.price * it.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal & Delivery Fee Calculation Breakdown */}
          {(() => {
            const calculatedSubtotal = (lastOrder.items || []).reduce(
              (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
              0
            );
            const subtotal = lastOrder.subtotal !== undefined ? Number(lastOrder.subtotal) : calculatedSubtotal;
            const deliveryFee = lastOrder.deliveryFee !== undefined 
              ? Number(lastOrder.deliveryFee) 
              : Math.max(0, (Number(lastOrder.total) || 0) - subtotal);

            return (
              <div className={`pt-2 border-t space-y-1 text-xs ${isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}>
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Rs. {formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className={deliveryFee === 0 ? 'text-emerald-500 font-bold' : isDark ? 'text-zinc-200 font-medium' : 'text-zinc-800 font-medium'}>
                    {deliveryFee === 0 ? 'FREE' : `Rs. ${formatPrice(deliveryFee)}`}
                  </span>
                </div>
              </div>
            );
          })()}

          <div className={`pt-2 border-t flex justify-between font-bold text-sm ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <span className={isDark ? 'text-white' : 'text-zinc-900'}>Total Amount</span>
            <span className="text-orange-500 font-montserrat text-base font-extrabold">Rs. {formatPrice(lastOrder.total)}</span>
          </div>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleWhatsAppTrack}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>Track on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setOrderModalOpen(false)}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98] border ${
              isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border-zinc-300'
            }`}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
