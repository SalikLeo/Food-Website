import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Send,
  ShoppingBag,
  AlertCircle,
  X,
  CheckCircle2,
  MapPin,
  Phone,
  User,
  Clock,
  Utensils,
  Flame
} from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { useCart } from '../context/CartContext';
import { formatPrice, cleanDealInclusions, formatDealDescription, isMarketingDealDescription } from '../utils/formatters';
import { apiUrl } from '../config/api';
import { getStoredUserProfile, saveStoredUserProfile } from '../services/userProfile';
import CustomSelect from './Common/CustomSelect';

export default function OrderSection() {
  const {
    cartItems,
    subtotal,
    deliveryFee,
    total,
    isMinOrderMet,
    minOrder,
    getWhatsAppMessage,
    isCartOpen,
    setIsCartOpen,
    clearCart,
    setLastOrder,
    saveRecentOrder,
    setOrderModalOpen,
    isFreeDelivery,
    removeFromCart,
    userProfile,
    isDark
  } = useCart();

  const [formData, setFormData] = useState(() => {
    const prof = userProfile || getStoredUserProfile();
    return {
      name: prof.name || '',
      phone: prof.phone || '',
      address: prof.address || '',
      notes: '',
      paymentMethod: 'Cash on Delivery'
    };
  });

  // Sync formData whenever profile changes
  useEffect(() => {
    const handleProfileSync = (e) => {
      const p = e?.detail || getStoredUserProfile();
      if (p) {
        setFormData(prev => ({
          ...prev,
          name: p.name || prev.name,
          phone: p.phone || prev.phone,
          address: p.address || prev.address
        }));
      }
    };
    window.addEventListener('salik_profile_updated', handleProfileSync);
    return () => window.removeEventListener('salik_profile_updated', handleProfileSync);
  }, []);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmType, setConfirmType] = useState('web'); // 'web' | 'whatsapp'

  // Lock background scroll when modal is open
  useEffect(() => {
    if (showConfirmModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showConfirmModal]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showConfirmModal) {
        setShowConfirmModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmModal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
      setFormData(prev => ({
        ...prev,
        phone: digitsOnly
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validate = () => {
    if (cartItems.length === 0) {
      setErrorMsg('Please add at least one item to your cart from the menu or deals.');
      return false;
    }
    if (!formData.name?.trim()) {
      setErrorMsg('Please enter your full name.');
      return false;
    }
    const cleanPhone = (formData.phone || '').replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      setErrorMsg('Please enter a valid 11-digit phone number (e.g. 03001234567).');
      return false;
    }
    if (!formData.address.trim()) {
      setErrorMsg('Please enter your complete delivery address.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  // Open confirmation modal for web order
  const handleInitiatePlaceOrder = (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;
    setConfirmType('web');
    setShowConfirmModal(true);
  };

  // Open confirmation modal for WhatsApp order
  const handleInitiateWhatsAppOrder = (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;
    setConfirmType('whatsapp');
    setShowConfirmModal(true);
  };

  // Final confirmed execution for Web Order
  const executePlaceOrder = async () => {
    setLoading(true);
    setErrorMsg('');

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setShowConfirmModal(false);
      setErrorMsg('No internet connection. Please call our shop directly at 0309-5369472 to place your order.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        customerName: formData.name,
        phone: formData.phone,
        address: formData.address,
        notes: formData.notes,
        paymentMethod: formData.paymentMethod,
        items: cartItems,
        subtotal,
        deliveryFee,
        total
      };

      const res = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowConfirmModal(false);
        if (typeof setIsCartOpen === 'function') setIsCartOpen(false);
        setLastOrder(data.order);
        saveRecentOrder(data.order);
        setOrderModalOpen(true);
        if (typeof clearCart === 'function') clearCart();
        saveStoredUserProfile({
          name: formData.name,
          phone: formData.phone,
          address: formData.address
        });
        const savedProf = getStoredUserProfile();
        setFormData({
          name: savedProf.name || formData.name,
          phone: savedProf.phone || formData.phone,
          address: savedProf.address || formData.address,
          notes: '',
          paymentMethod: 'Cash on Delivery'
        });
      } else {
        setShowConfirmModal(false);
        setErrorMsg(data.error || 'Failed to place order. Please try again, call 0309-5369472, or use WhatsApp.');
      }
    } catch (err) {
      console.error(err);
      setShowConfirmModal(false);
      setErrorMsg('No internet connection. Please call our shop directly at 0309-5369472 or order via WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  // Final confirmed execution for WhatsApp Order
  const executeWhatsAppOrder = () => {
    setShowConfirmModal(false);
    const waOrder = {
      id: `WA-${Date.now().toString().slice(-4)}`,
      customerName: formData.name,
      phone: formData.phone,
      address: formData.address,
      notes: formData.notes,
      paymentMethod: `${formData.paymentMethod} (WhatsApp Order)`,
      items: [...cartItems],
      subtotal,
      deliveryFee,
      total,
      createdAt: new Date().toISOString(),
      status: 'WhatsApp'
    };
    saveRecentOrder(waOrder);

    // Save to DB in background
    try {
      fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.name,
          phone: formData.phone,
          address: formData.address,
          notes: formData.notes,
          paymentMethod: `${formData.paymentMethod} (WhatsApp Order)`,
          items: cartItems,
          subtotal,
          deliveryFee,
          total
        })
      });
    } catch (e) {
      console.error(e);
    }

    saveStoredUserProfile({
      name: formData.name,
      phone: formData.phone,
      address: formData.address
    });
    const message = getWhatsAppMessage(formData);
    window.open(`https://wa.me/923095369472?text=${message}`, '_blank');
    if (typeof setIsCartOpen === 'function') setIsCartOpen(false);
    if (typeof clearCart === 'function') clearCart();
  };

  return (
    <section id="order" className={`py-20 ${isDark ? 'bg-[#0a0a0d] border-t border-zinc-800/80' : 'bg-cream border-t border-zinc-200'} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form */}
          <div className={`lg:col-span-7 ${isDark ? 'bg-[#141419] border-white/10 text-white shadow-card-dark' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'} rounded-3xl p-6 sm:p-10 border transition-all`}>
            
            <div className="mb-8">
              <span className="text-xs font-bold tracking-[0.2em] text-orange-500 sm:text-orange-600 uppercase">
                CHECKOUT
              </span>
              <h2 className={`mt-1 text-4xl sm:text-5xl font-display uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'} leading-none`}>
                PLACE YOUR ORDER
              </h2>
            </div>

            {errorMsg && (
              <div className={`mb-6 p-4 rounded-xl ${isDark ? 'bg-red-950/40 border-red-800/50 text-red-300' : 'bg-red-50 border-red-200 text-red-700'} border text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
                {((typeof navigator !== 'undefined' && !navigator.onLine) || errorMsg.toLowerCase().includes('internet') || errorMsg.toLowerCase().includes('connection') || errorMsg.toLowerCase().includes('network') || errorMsg.includes('0309-5369472')) && (
                  <a
                    href="tel:03095369472"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-xs shrink-0 transition-all cursor-pointer whitespace-nowrap self-end sm:self-auto"
                  >
                    <Phone className="w-3.5 h-3.5 fill-current" />
                    <span>Call 0309-5369472</span>
                  </a>
                )}
              </div>
            )}

            <form onSubmit={handleInitiatePlaceOrder} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'} uppercase tracking-wider mb-2`}>
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Muhammad Ali"
                    className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${
                      isDark
                        ? 'bg-black/40 border-zinc-700 text-white placeholder-zinc-500'
                        : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'} uppercase tracking-wider mb-2`}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={11}
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="03001234567"
                    className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-montserrat tracking-wide transition-all ${
                      isDark
                        ? 'bg-black/40 border-zinc-700 text-white placeholder-zinc-500'
                        : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'} uppercase tracking-wider mb-2`}>
                  Delivery Address *
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="House, street, area, nearest landmark"
                  className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${
                    isDark
                      ? 'bg-black/40 border-zinc-700 text-white placeholder-zinc-500'
                      : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'} uppercase tracking-wider mb-2`}>
                  Order Notes (Optional)
                </label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Extra spicy, no onion, landmark for delivery..."
                  className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${
                    isDark
                      ? 'bg-black/40 border-zinc-700 text-white placeholder-zinc-500'
                      : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'} uppercase tracking-wider mb-2`}>
                  Payment Method
                </label>
                <CustomSelect
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  options={[
                    { value: 'Cash on Delivery', label: 'Cash on Delivery' },
                    { value: 'Easypaisa', label: 'Easypaisa' }
                  ]}
                  isDark={isDark}
                  className="w-full"
                  buttonClassName={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                    isDark
                      ? 'bg-[#18181f] border-zinc-700 text-white hover:border-zinc-600'
                      : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300'
                  }`}
                  menuClassName="w-full"
                />
              </div>

              {/* Action Buttons Row */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Placing Order...' : 'Place Order'}</span>
                </button>
              </div>
            </form>

          </div>

          {/* Right Column: ORDER SUMMARY */}
          <div className={`lg:col-span-5 ${isDark ? 'bg-[#141419] border-white/10 text-white shadow-card-dark' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'} rounded-3xl p-6 sm:p-8 border transition-all`}>
            <h3 className={`font-display text-2xl tracking-wide uppercase ${isDark ? 'text-white border-zinc-800' : 'text-zinc-900 border-zinc-200'} pb-4 border-b`}>
              Order Summary
            </h3>

            {cartItems.length === 0 ? (
              <div className={`py-10 text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'} text-xs space-y-3.5`}>
                <ShoppingBag className={`w-10 h-10 mx-auto ${isDark ? 'text-zinc-700' : 'text-zinc-300'}`} />
                <p className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>No items selected yet — add items from the menu and they'll appear here.</p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <a
                    href="#menu"
                    onClick={(e) => {
                      const el = document.getElementById('menu');
                      if (el) {
                        e.preventDefault();
                        el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full ${
                      isDark
                        ? 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30'
                        : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200'
                    } font-bold text-xs uppercase tracking-wider transition-all active:scale-95`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Explore Menu</span>
                  </a>
                  <a
                    href="#deals"
                    onClick={(e) => {
                      const el = document.getElementById('deals');
                      if (el) {
                        e.preventDefault();
                        el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full ${
                      isDark
                        ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                    } font-bold text-xs uppercase tracking-wider transition-all active:scale-95`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>View Deals</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className={`py-5 space-y-3 max-h-80 overflow-y-auto pr-1 divide-y ${isDark ? 'divide-zinc-800/80' : 'divide-zinc-100'}`}>
                {cartItems.map((item) => (
                  <div key={item.cartKey} className="pt-3 first:pt-0 flex items-start justify-between text-xs group">
                    <div className="flex items-start gap-2 min-w-0 pr-2">
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.cartKey)}
                        className={`p-1 -ml-1 mt-0.5 ${
                          isDark ? 'text-zinc-500 hover:text-red-400 hover:bg-zinc-800' : 'text-zinc-400 hover:text-red-600 hover:bg-red-50'
                        } rounded-md transition-all active:scale-90 flex-shrink-0 cursor-pointer`}
                        title="Remove item"
                        aria-label={`Remove ${item.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="min-w-0">
                        <div>
                          <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-800'}`}>
                            {item.quantity}× {item.name}
                          </span>
                          {item.size && (
                            <span className="text-orange-500 ml-1 font-medium">({item.size})</span>
                          )}
                        </div>
                        {Boolean(item.includes || (item.description && !isMarketingDealDescription(item.description))) && (
                          <p className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-0.5 leading-relaxed break-words`}>
                            {formatDealDescription(item.includes || item.description)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'} font-sans flex-shrink-0 mt-0.5`}>
                      Rs. {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className={`pt-4 border-t ${isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'} space-y-2 text-xs`}>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className={`${isDark ? 'text-zinc-200' : 'text-zinc-800'} font-semibold`}>
                  Rs. {formatPrice(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery fee</span>
                <span className={`font-semibold ${isFreeDelivery ? 'text-emerald-400 font-bold' : isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {isFreeDelivery ? 'FREE (Promotion)' : `Rs. ${formatPrice(deliveryFee)}`}
                </span>
              </div>
              <div className={`flex justify-between items-baseline pt-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <span className={`font-montserrat text-sm font-semibold ${isDark ? 'text-white' : 'text-zinc-900'} uppercase tracking-wider`}>
                  TOTAL
                </span>
                <span className="font-montserrat text-2xl text-orange-500 font-bold flex items-baseline">
                  <span className="text-base font-semibold mr-1">Rs.</span>
                  <span>{formatPrice(total)}</span>
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ORDER CONFIRMATION MODAL */}
      {showConfirmModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop Overlay */}
            <div
              onClick={() => !loading && setShowConfirmModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            />

            {/* Modal Card */}
            <div className={`relative rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto overflow-x-hidden border ${
              isDark ? 'bg-[#161619] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-xl'
            }`}>
              {/* Close Button */}
              <button
                type="button"
                onClick={() => !loading && setShowConfirmModal(false)}
                disabled={loading}
                className={`absolute top-5 right-5 p-2 rounded-xl transition-colors disabled:opacity-40 cursor-pointer ${
                  isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="text-center mb-5">
                <h3 className={`font-display text-2xl sm:text-3xl uppercase tracking-wide ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}>
                  Ready to place your order?
                </h3>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Please review your delivery details and items below before confirming.
                </p>
              </div>

              {/* Customer & Address Review Box */}
              <div className={`rounded-2xl p-4 border text-xs space-y-2.5 mb-4 ${
                isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div className={`flex items-center justify-between pb-2 border-b ${
                  isDark ? 'border-zinc-800 text-zinc-300' : 'border-zinc-200 text-zinc-700'
                }`}>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-zinc-500'} flex items-center gap-1.5`}>
                    <User className="w-3.5 h-3.5 text-orange-500" /> Customer
                  </span>
                  <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>{formData.name}</span>
                </div>

                <div className={`flex items-center justify-between pb-2 border-b ${
                  isDark ? 'border-zinc-800 text-zinc-300' : 'border-zinc-200 text-zinc-700'
                }`}>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-zinc-500'} flex items-center gap-1.5`}>
                    <Phone className="w-3.5 h-3.5 text-orange-500" /> Phone
                  </span>
                  <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>{formData.phone}</span>
                </div>

                <div className={`flex items-start justify-between pb-2 border-b ${
                  isDark ? 'border-zinc-800 text-zinc-300' : 'border-zinc-200 text-zinc-700'
                }`}>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-zinc-500'} flex items-center gap-1.5 flex-shrink-0`}>
                    <MapPin className="w-3.5 h-3.5 text-orange-500" /> Address
                  </span>
                  <span className={`font-semibold text-right max-w-[240px] leading-relaxed ${
                    isDark ? 'text-zinc-200' : 'text-zinc-800'
                  }`}>
                    {formData.address}
                  </span>
                </div>

                <div className={`flex items-center justify-between ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>Payment</span>
                  <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{formData.paymentMethod}</span>
                </div>

                {formData.notes && (
                  <div className={`pt-2 border-t text-[11px] italic ${
                    isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-zinc-200 text-zinc-500'
                  }`}>
                    <strong className={`not-italic ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Note: </strong>
                    {formData.notes}
                  </div>
                )}
              </div>

              {/* Items Summary & Total Box */}
              <div className={`rounded-2xl p-4 border text-xs space-y-2 mb-6 ${
                isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wider pb-1 border-b ${
                  isDark ? 'text-zinc-400 border-zinc-800' : 'text-zinc-500 border-zinc-200'
                }`}>
                  <span>Selected Items ({cartItems.reduce((s, i) => s + i.quantity, 0)})</span>
                  <span>Price</span>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 py-1 modal-items-scroll">
                  {cartItems.map((item) => (
                    <div key={item.cartKey} className={`flex justify-between items-center ${
                      isDark ? 'text-zinc-300' : 'text-zinc-700'
                    }`}>
                      <div className="truncate pr-2">
                        <strong className={isDark ? 'text-white' : 'text-zinc-900'}>{item.quantity}×</strong> {item.name}
                        {item.size && <span className="text-orange-500 text-[11px] ml-1">({item.size})</span>}
                      </div>
                      <span className={`font-semibold flex-shrink-0 ml-2 ${
                        isDark ? 'text-zinc-200' : 'text-zinc-800'
                      }`}>
                        Rs. {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={`pt-2 border-t space-y-1 text-[11px] ${
                  isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'
                }`}>
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Rs. {formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className={isFreeDelivery ? 'text-emerald-500 font-bold' : isDark ? 'text-zinc-200 font-semibold' : 'text-zinc-800 font-semibold'}>
                      {isFreeDelivery ? 'FREE (Promotion)' : `Rs. ${formatPrice(deliveryFee)}`}
                    </span>
                  </div>
                </div>

                <div className={`pt-2.5 border-t flex justify-between items-baseline font-montserrat ${
                  isDark ? 'border-zinc-800' : 'border-zinc-200'
                }`}>
                  <span className={`text-xs uppercase tracking-wider font-semibold ${
                    isDark ? 'text-zinc-300' : 'text-zinc-700'
                  }`}>TOTAL TO PAY</span>
                  <span className="text-xl font-bold text-amber-500">Rs. {formatPrice(total)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={executePlaceOrder}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Placing Order...' : 'Yes, Confirm & Place Order'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => !loading && setShowConfirmModal(false)}
                  disabled={loading}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer border ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 border-zinc-300'
                  }`}
                >
                  Change / Edit Details
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
