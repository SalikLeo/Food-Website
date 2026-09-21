import React from 'react';
import { CheckCircle2, X, Clock, MapPin } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { useCart } from '../context/CartContext';

export default function OrderSuccessModal() {
  const { orderModalOpen, setOrderModalOpen, lastOrder } = useCart();

  if (!orderModalOpen || !lastOrder) return null;

  const handleWhatsAppTrack = () => {
    const text = encodeURIComponent(
      `Assalam o Alaikum! I placed order #${lastOrder.id} for Rs. ${lastOrder.total}. Please confirm the delivery time.`
    );
    window.open(`https://wa.me/923095369472?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => setOrderModalOpen(false)}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Box */}
      <div className="relative bg-[#161619] border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-white shadow-2xl z-10 animate-in zoom-in-95 duration-200">
        
        <button
          onClick={() => setOrderModalOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h3 className="font-display text-3xl uppercase tracking-wide text-white">
            Order Confirmed!
          </h3>
          <p className="text-zinc-400 text-xs mt-1">
            Order ID: <span className="font-mono text-orange-400 font-bold">{lastOrder.id}</span>
          </p>
        </div>

        {/* Order Details box */}
        <div className="bg-zinc-900/80 rounded-2xl p-4 border border-zinc-800/80 space-y-3 text-xs mb-6">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="text-zinc-400">Estimated Delivery</span>
            <span className="font-bold text-orange-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 30-40 Minutes
            </span>
          </div>

          <div className="flex items-start justify-between pb-2 border-b border-zinc-800">
            <span className="text-zinc-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" /> Address
            </span>
            <span className="font-semibold text-right max-w-[200px] text-zinc-200 truncate">
              {lastOrder.address}
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              Items Ordered:
            </span>
            {(lastOrder.items || []).map((it, idx) => (
              <div key={idx} className="flex justify-between text-zinc-300">
                <span>
                  {it.quantity}× {it.name} {it.size ? `(${it.size})` : ''}
                </span>
                <span>Rs. {(it.price * it.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-sm">
            <span className="text-white">Total Amount</span>
            <span className="text-amber-400">Rs. {lastOrder.total?.toLocaleString()}</span>
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
