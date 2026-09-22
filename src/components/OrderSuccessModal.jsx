import React from 'react';
import { CheckCircle2, X, Clock, MapPin } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';

export default function OrderSuccessModal() {
  const { orderModalOpen, setOrderModalOpen, lastOrder } = useCart();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-tab-fade">
      <div className="relative w-full max-w-md bg-[#18181c] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-center space-y-5">
        
        {/* Decorative Top Accent Glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={() => setOrderModalOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          title="Close modal"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="font-montserrat text-xl sm:text-2xl font-bold uppercase tracking-tight text-white">
            Order Confirmed!
          </h3>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Thank you, <strong className="text-white">{lastOrder.customerName || 'Customer'}</strong>. Your meal is being prepared!
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-4 text-left space-y-3 text-xs">
          <div className="flex justify-between items-center text-zinc-400 border-b border-zinc-800 pb-2">
            <span>Order ID</span>
            <span className="text-orange-400 font-bold">#{lastOrder.id}</span>
          </div>

          <div className="flex justify-between items-center text-zinc-400">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-zinc-500" /> Placed at</span>
            <span>{formattedDate}</span>
          </div>

          {lastOrder.address && (
            <div className="flex justify-between items-start text-zinc-400">
              <span className="flex items-center gap-1.5 shrink-0"><MapPin className="w-3.5 h-3.5 text-zinc-500" /> Address</span>
              <span className="text-right text-zinc-300 font-medium truncate max-w-[200px]">{lastOrder.address}</span>
            </div>
          )}

          <div className="pt-2 border-t border-zinc-800 space-y-1.5">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Items Ordered</div>
            {(lastOrder.items || []).map((it, idx) => (
              <div key={idx} className="flex justify-between text-zinc-300">
                <span>
                  {it.quantity}× {it.name} {it.size ? `(${it.size})` : ''}
                </span>
                <span>Rs. {formatPrice(it.price * it.quantity)}</span>
              </div>
            ))}
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
              <div className="pt-2 border-t border-zinc-800/80 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Items Subtotal</span>
                  <span className="text-zinc-200 font-medium">Rs. {formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Delivery Fee</span>
                  <span className={deliveryFee === 0 ? 'text-emerald-400 font-bold' : 'text-zinc-200 font-medium'}>
                    {deliveryFee === 0 ? 'FREE' : `Rs. ${formatPrice(deliveryFee)}`}
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-sm">
            <span className="text-white">Total Amount</span>
            <span className="text-amber-400 font-montserrat text-base">Rs. {formatPrice(lastOrder.total)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleWhatsAppTrack}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>Track on WhatsApp</span>
          </button>

          <button
            onClick={() => setOrderModalOpen(false)}
            className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
