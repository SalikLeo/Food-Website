import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { isCustomerApp } from '../config/api';

export default function FloatingMobileCart() {
  const { itemCount, subtotal, isCartOpen, setIsCartOpen } = useCart();

  // In mobile app mode, the bottom-right floating cart icon is used instead
  if (isCustomerApp) {
    return null;
  }

  // Do not show if cart is empty or if cart drawer is currently open
  if (itemCount === 0 || isCartOpen) {
    return null;
  }

  return (
    <aside
      aria-label="Floating cart summary"
      className="fixed bottom-3.5 left-3 right-3 sm:left-6 sm:right-6 z-40 max-w-md mx-auto lg:hidden animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsCartOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsCartOpen(true);
          }
        }}
        className="w-full bg-[#121215]/95 backdrop-blur-md border border-zinc-700/80 hover:border-orange-500/80 rounded-2xl p-2 sm:p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.55)] flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] transition-all"
      >
        {/* Left: Cart Icon & Item info */}
        <div className="flex items-center gap-2.5 min-w-0 pl-1">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <ShoppingBag className="w-4 h-4 text-white" />
            <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-white text-orange-600 font-extrabold text-[9px] flex items-center justify-center shadow-xs border border-orange-100">
              {itemCount}
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-zinc-200 truncate">
              <span>{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
              <span className="text-zinc-500">•</span>
              <span className="font-bold text-white tracking-tight">
                Rs. {subtotal.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-orange-400 font-medium tracking-wide">
              Tap to review order
            </span>
          </div>
        </div>

        {/* Right: Checkout CTA button */}
        <div className="flex-shrink-0">
          <div className="h-9 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-[#e53e10] to-[#f56505] text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 group-hover:brightness-110 active:scale-95 transition-all">
            <span>View Cart</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </aside>
  );
}
