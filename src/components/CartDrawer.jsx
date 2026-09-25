import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, Truck, AlertTriangle, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice, cleanDealInclusions, formatDealDescription, isMarketingDealDescription } from '../utils/formatters';
import { resolveImageUrl } from '../config/api';

export default function CartDrawer({ isDark: isDarkProp }) {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    deliveryFee,
    total,
    itemCount,
    minOrder,
    isMinOrderMet,
    freeDeliveryThreshold,
    isFreeDelivery,
    amountForFreeDelivery,
    isDark: contextIsDark
  } = useCart();

  // Prefer explicitly passed prop if available, otherwise use reactive CartContext isDark
  const isDark = isDarkProp !== undefined ? isDarkProp : Boolean(contextIsDark);

  const hasSoldOutItems = cartItems.some(item => item.inStock === false);

  // Lock background scroll when cart is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen]);

  // Handle ESC key to close cart
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isCartOpen) {
        setIsCartOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen]);

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    const orderSec = document.getElementById('order');
    if (orderSec) {
      orderSec.scrollIntoView({ behavior: 'smooth' });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('salik_open_checkout'));
    }
  };

  const handleBrowseMenu = () => {
    setIsCartOpen(false);
    const menuSec = document.getElementById('menu');
    if (menuSec) {
      menuSec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        isCartOpen
          ? 'opacity-100 pointer-events-auto visible'
          : 'opacity-0 pointer-events-none invisible'
      }`}
    >
      {/* Dark backdrop overlay covering the rest of the screen */}
      <div
        onClick={() => setIsCartOpen(false)}
        className={`absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300 ${
          isCartOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Right side drawer: max-w-[500px] on desktop with backdrop, full width on small mobile */}
      <div
        className={`absolute top-0 right-0 bottom-0 h-full w-full sm:max-w-[490px] md:max-w-[500px] shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out z-10 ${
          isDark 
            ? 'bg-[#15151a] text-white border-l border-white/10' 
            : 'bg-white text-zinc-900'
        } ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className={`px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-3 flex-shrink-0 mobile-side-drawer-top ${
          isDark 
            ? 'bg-[#18181e] border-white/10' 
            : 'bg-white border-zinc-200/80'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold shrink-0">
              <ShoppingBag className="w-5 h-5 text-orange-400" />
            </div>
            <h3 className={`font-montserrat text-base sm:text-xl uppercase tracking-tight font-bold flex items-center gap-1.5 truncate ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}>
              <span>YOUR CART</span>
              {itemCount > 0 && <span className={isDark ? 'text-orange-400' : 'text-orange-600'}>({itemCount})</span>}
            </h3>
          </div>

          <button
            onClick={() => setIsCartOpen(false)}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors focus:outline-none cursor-pointer shrink-0 ${
              isDark 
                ? 'border-red-500/30 hover:border-red-500/60 text-red-400 hover:bg-red-500/10' 
                : 'border-red-300 hover:border-red-500 text-red-500 hover:bg-red-50'
            }`}
            aria-label="Close Cart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className={`w-20 h-20 rounded-full border flex items-center justify-center mb-4 ${
              isDark ? 'bg-orange-500/15 border-orange-500/30' : 'bg-orange-50 border-orange-200'
            }`}>
              <span className="text-3xl">🛒</span>
            </div>
            <h4 className={`font-montserrat text-lg font-bold mb-1 ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}>
              Your cart is empty
            </h4>
            <p className={`text-xs max-w-xs mb-6 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}>
              Looks like you haven't added anything yet. Explore our delicious pizzas, burgers & deals!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={handleBrowseMenu}
                className="px-6 py-2.5 rounded-full bg-[#e53e10] hover:bg-[#d1350a] text-white font-montserrat font-bold text-xs tracking-wider uppercase shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Explore Menu
              </button>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  const el = document.getElementById('deals');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-6 py-2.5 rounded-full border font-montserrat font-bold text-xs tracking-wider uppercase shadow-sm active:scale-95 transition-all cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700' : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                }`}
              >
                View Deals
              </button>
            </div>
          </div>
        ) : (
          /* Items List */
          <div className={`flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 custom-dropdown-scroll ${
            isDark ? 'bg-[#101014]' : 'bg-[#faf9f6]'
          }`}>
            {cartItems.map((item) => (
              <div
                key={item.cartKey}
                className={`p-2.5 sm:p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                  isDark 
                    ? 'bg-[#18181e] border-white/10 text-white shadow-2xs' 
                    : 'bg-white border-zinc-200/80 text-zinc-900 shadow-xs'
                }`}
              >
                <img
                  src={resolveImageUrl(item.image || '/assets/deal-family.png')}
                  alt={item.name}
                  className={`w-20 sm:w-24 h-16 sm:h-20 rounded-xl object-cover border flex-shrink-0 ${
                    isDark ? 'bg-zinc-900 border-white/10' : 'bg-zinc-100 border-zinc-100'
                  }`}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = resolveImageUrl('/assets/deal-family.png');
                  }}
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className={`font-bold text-sm sm:text-base break-words leading-tight ${
                        isDark ? 'text-white' : 'text-zinc-900'
                      }`}>
                        {item.name}
                      </h4>
                      {Boolean(item.includes || (item.description && !isMarketingDealDescription(item.description))) && (
                        <p className={`text-[10px] sm:text-[11px] mt-0.5 leading-relaxed break-words ${
                          isDark ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>
                          {formatDealDescription(item.includes || item.description)}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {item.size && (
                          <span className={`inline-block text-[10px] font-semibold ${
                            isDark ? 'text-orange-400' : 'text-orange-600'
                          }`}>
                            Size: {item.size}
                          </span>
                        )}
                        {item.inStock === false && (
                          <span className={`inline-block text-[9px] font-bold rounded px-1.5 py-0.5 border ${
                            isDark 
                              ? 'text-red-300 bg-red-950/50 border-red-800/60' 
                              : 'text-red-700 bg-red-50 border-red-200'
                          }`}>
                            Sold Out Today
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.cartKey)}
                      className={`transition-colors p-1 -mr-1 -mt-1 cursor-pointer ${
                        isDark ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'
                      }`}
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-1 sm:mt-1.5">
                    {/* Stepper */}
                    <div className={`flex items-center border rounded-lg overflow-hidden ${
                      isDark 
                        ? 'border-white/10 bg-zinc-800/80' 
                        : 'border-zinc-200 bg-zinc-50'
                    }`}>
                      <button
                        onClick={() => updateQuantity(item.cartKey, -1)}
                        className={`px-1.5 py-0.5 transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-200 text-zinc-600'
                        }`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className={`px-1.5 text-xs font-bold min-w-[16px] text-center ${
                        isDark ? 'text-white' : 'text-zinc-900'
                      }`}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.cartKey, 1)}
                        className={`px-1.5 py-0.5 transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-200 text-zinc-600'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className={`font-montserrat font-semibold text-xs sm:text-sm ${
                      isDark ? 'text-orange-400' : 'text-orange-600'
                    }`}>
                      Rs. {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Summary & Checkout */}
        {cartItems.length > 0 && (
          <div className={`p-5 sm:p-6 border-t space-y-3.5 flex-shrink-0 mobile-side-drawer-bottom ${
            isDark 
              ? 'bg-[#18181e] border-white/10' 
              : 'bg-[#faf9f6] border-zinc-200/80'
          }`}>
            {/* Free Delivery Incentive Message - only shown until unlocked */}
            {freeDeliveryThreshold > 0 && subtotal < freeDeliveryThreshold && (
              <div className={`p-3 rounded-xl border text-xs ${
                isDark 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
                  : 'bg-emerald-50/90 border-emerald-200/80 text-emerald-950'
              }`}>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-medium">
                    <span className={`flex items-center gap-1.5 ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>
                      <Truck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>
                        Add <strong className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Rs. {formatPrice(amountForFreeDelivery)}</strong> more in cart for <strong className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>FREE delivery</strong>
                      </span>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isDark ? 'text-emerald-300 bg-emerald-900/60' : 'text-emerald-700 bg-emerald-100/90'
                    }`}>
                      {Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100))}%
                    </span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                    isDark ? 'bg-emerald-900/60' : 'bg-emerald-200/60'
                  }`}>
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {!isMinOrderMet && (
              <div className={`p-2.5 rounded-xl border text-xs font-semibold text-center ${
                isDark 
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-200' 
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                Minimum order for home delivery is Rs. {minOrder}. Add Rs.{' '}
                {formatPrice(minOrder - subtotal)} more to qualify.
              </div>
            )}

            <div className="space-y-2 text-xs font-montserrat">
              <div className={`flex justify-between ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                <span className="font-medium">Subtotal</span>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Rs. {formatPrice(subtotal)}</span>
              </div>
              <div className={`flex justify-between ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                <span className="font-medium">Delivery fee</span>
                <span className={`font-semibold ${isFreeDelivery ? 'text-emerald-500' : isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {isFreeDelivery ? 'FREE' : `Rs. ${formatPrice(deliveryFee)}`}
                </span>
              </div>
              <div className={`flex justify-between items-baseline pt-2.5 border-t ${
                isDark ? 'border-white/10' : 'border-zinc-200'
              }`}>
                <span className={`font-montserrat text-sm uppercase tracking-wider font-semibold ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}>
                  TOTAL
                </span>
                <span className={`font-montserrat text-2xl ${
                  isDark ? 'text-orange-400' : 'text-orange-600'
                } font-bold flex items-baseline`}>
                  <span className="text-base font-semibold mr-1">Rs.</span>
                  <span>{formatPrice(total)}</span>
                </span>
              </div>
            </div>

            {/* Sold out alert if applicable */}
            {hasSoldOutItems && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-montserrat ${
                isDark 
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-200' 
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="font-medium">Some items are sold out today. Please remove them before checkout.</span>
              </div>
            )}

            <button
              onClick={handleCheckoutClick}
              disabled={hasSoldOutItems}
              className={`w-full py-3.5 rounded-2xl font-montserrat text-sm sm:text-base font-extrabold uppercase tracking-wider shadow-md transition-all text-center flex items-center justify-center gap-2 ${
                hasSoldOutItems
                  ? isDark 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5' 
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
                  : 'bg-gradient-to-r from-[#e53e10] to-[#f56505] hover:from-[#d1350a] hover:to-[#e05703] text-white hover:shadow-lg active:scale-[0.98] cursor-pointer'
              }`}
            >
              <span>CHECKOUT</span>
            </button>

            <div className={`flex justify-between items-center text-[11px] pt-1 font-montserrat ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}>
              <button
                onClick={clearCart}
                className="hover:text-red-500 transition-colors font-semibold cursor-pointer"
              >
                Clear Cart
              </button>
              <button
                onClick={handleBrowseMenu}
                className={`font-bold cursor-pointer ${
                  isDark ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:underline'
                }`}
              >
                Add more items
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
