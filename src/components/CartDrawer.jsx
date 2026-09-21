import React, { useEffect } from 'react';
import { X, Plus, Minus, Trash2, Truck, AlertTriangle } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
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
    amountForFreeDelivery
  } = useCart();

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

      {/* Right side drawer: max-w-[420px] on desktop with backdrop, full width on small mobile */}
      <div
        className={`absolute top-0 right-0 bottom-0 h-full w-full sm:max-w-[420px] bg-white text-zinc-900 shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out z-10 ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200/80 flex items-center justify-between bg-white flex-shrink-0">
          <h3 className="font-display text-3xl uppercase tracking-tight text-zinc-900 flex items-center gap-1.5">
            <span>YOUR CART</span>
            {itemCount > 0 && <span className="text-[#e53e10]">({itemCount})</span>}
          </h3>

          <button
            onClick={() => setIsCartOpen(false)}
            className="w-8 h-8 rounded-full border border-red-300 hover:border-red-500 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors focus:outline-none"
            aria-label="Close Cart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Empty State */}
        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 bg-white">
            <div className="w-16 h-16 border-2 border-zinc-700 rounded-2xl flex items-center justify-center mx-auto text-zinc-700">
              <svg className="w-8 h-8 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>

            <p className="text-zinc-600 text-sm font-sans max-w-xs">
              Your cart is empty. Add something delicious.
            </p>

            <button
              onClick={handleBrowseMenu}
              className="px-8 py-3 rounded-full bg-[#e53e10] hover:bg-[#d1350a] text-white font-display text-base tracking-wider uppercase shadow-md active:scale-95 transition-all"
            >
              BROWSE MENU
            </button>
          </div>
        ) : (
          /* Items List */
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2 bg-[#faf9f6]">
            {cartItems.map((item) => (
              <div
                key={item.cartKey}
                className="p-2.5 sm:p-3 bg-white rounded-xl border border-zinc-200/80 shadow-xs flex items-center gap-3"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover bg-zinc-950 border border-zinc-100 flex-shrink-0 aspect-square"
                  onError={(e) => {
                    e.target.src = '/assets/deal-family.png';
                  }}
                />

                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-zinc-900 truncate">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.size && (
                          <span className="inline-block text-[10px] font-semibold text-orange-600">
                            Size: {item.size}
                          </span>
                        )}
                        {item.inStock === false && (
                          <span className="inline-block text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.2">
                            Sold Out Today
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.cartKey)}
                      className="text-zinc-400 hover:text-red-500 transition-colors p-1 -mr-1 -mt-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-1 sm:mt-1.5">
                    {/* Stepper */}
                    <div className="flex items-center border border-zinc-200 rounded-md overflow-hidden bg-zinc-50">
                      <button
                        onClick={() => updateQuantity(item.cartKey, -1)}
                        className="px-1.5 py-0.5 hover:bg-zinc-200 text-zinc-600 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-1.5 text-xs font-bold text-zinc-900 min-w-[16px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.cartKey, 1)}
                        className="px-1.5 py-0.5 hover:bg-zinc-200 text-zinc-600 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-bold text-xs sm:text-sm text-[#e53e10]">
                      Rs. {(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Summary & Checkout */}
        {cartItems.length > 0 && (
          <div className="p-5 sm:p-6 bg-[#faf9f6] border-t border-zinc-200/80 space-y-3.5 flex-shrink-0">
            {/* Free Delivery Incentive Message - only shown until unlocked */}
            {freeDeliveryThreshold > 0 && subtotal < freeDeliveryThreshold && (
              <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-950 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5 text-emerald-900">
                      <Truck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>
                        Add <strong className="font-bold text-emerald-700">Rs. {amountForFreeDelivery.toLocaleString()}</strong> more in cart for <strong className="font-bold text-emerald-700">FREE delivery</strong>
                      </span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded">
                      {Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100))}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-emerald-200/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {!isMinOrderMet && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold text-center">
                Minimum order for home delivery is Rs. {minOrder}. Add Rs.{' '}
                {(minOrder - subtotal).toLocaleString()} more to qualify.
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-semibold text-zinc-900">Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Delivery fee</span>
                <span className={`font-semibold ${isFreeDelivery ? 'text-emerald-600 font-bold' : 'text-zinc-900'}`}>
                  {isFreeDelivery ? 'FREE' : `Rs. ${deliveryFee.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-zinc-200">
                <span className="font-display text-xl uppercase tracking-wide text-zinc-900 font-normal">
                  TOTAL
                </span>
                <span className="font-display text-2xl text-[#e53e10] font-normal flex items-baseline">
                  <span className="font-sans text-base font-bold mr-1">Rs.</span>
                  <span>{total.toLocaleString()}</span>
                </span>
              </div>
            </div>

            {/* Sold out alert if applicable */}
            {hasSoldOutItems && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Some items are sold out today. Please remove them before checkout.</span>
              </div>
            )}

            <button
              onClick={handleCheckoutClick}
              disabled={hasSoldOutItems}
              className={`w-full py-3.5 rounded-2xl font-display text-lg uppercase tracking-wider shadow-md transition-all text-center flex items-center justify-center gap-2 ${
                hasSoldOutItems
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
                  : 'bg-gradient-to-r from-[#e53e10] to-[#f56505] hover:from-[#d1350a] hover:to-[#e05703] text-white hover:shadow-lg active:scale-[0.98] cursor-pointer'
              }`}
            >
              <span>CHECKOUT</span>
            </button>

            <div className="flex justify-between items-center text-[11px] text-zinc-500 pt-1">
              <button
                onClick={clearCart}
                className="hover:text-red-500 transition-colors"
              >
                Clear Cart
              </button>
              <button
                onClick={handleBrowseMenu}
                className="text-orange-600 hover:underline font-semibold"
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
