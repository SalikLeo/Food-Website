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
  Clock
} from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';
import { apiUrl } from '../config/api';

export default function OrderSection() {
  const {
    cartItems,
    subtotal,
    deliveryFee,
    total,
    isMinOrderMet,
    minOrder,
    getWhatsAppMessage,
    clearCart,
    setLastOrder,
    saveRecentOrder,
    setOrderModalOpen,
    isFreeDelivery
  } = useCart();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    paymentMethod: 'Cash on Delivery'
  });

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
        setLastOrder(data.order);
        saveRecentOrder(data.order);
        setOrderModalOpen(true);
        clearCart();
        setFormData({
          name: '',
          phone: '',
          address: '',
          notes: '',
          paymentMethod: 'Cash on Delivery'
        });
      } else {
        setShowConfirmModal(false);
        setErrorMsg(data.error || 'Failed to place order. Please try again or use WhatsApp.');
      }
    } catch (err) {
      console.error(err);
      setShowConfirmModal(false);
      setErrorMsg('Network error. Please check connection or order directly via WhatsApp.');
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

    const message = getWhatsAppMessage(formData);
    window.open(`https://wa.me/923095369472?text=${message}`, '_blank');
  };

  return (
    <section id="order" className="py-20 bg-cream border-t border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-zinc-200 shadow-sm">
            
            <div className="mb-8">
              <span className="text-xs font-bold tracking-[0.2em] text-orange-600 uppercase">
                CHECKOUT
              </span>
              <h2 className="mt-1 text-4xl sm:text-5xl font-display uppercase tracking-tight text-zinc-900 leading-none">
                PLACE YOUR ORDER
              </h2>
              <p className="mt-2 text-zinc-500 text-sm">
                Home delivery across the area. Minimum order Rs. {minOrder}.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleInitiatePlaceOrder} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Muhammad Ali"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
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
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-montserrat tracking-wide transition-all"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">11-digit mobile number (e.g. 03001234567)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  Delivery Address *
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="House, street, area, nearest landmark"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  Order Notes (Optional)
                </label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Extra spicy, no onion, landmark for delivery..."
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
                  Payment Method
                </label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                >
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Online Payment">Online Payment</option>
                </select>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Placing Order...' : 'Place Order'}</span>
                </button>
              </div>
            </form>

          </div>

          {/* Right Column: ORDER SUMMARY */}
          <div className="lg:col-span-5 bg-[#141416] rounded-3xl p-6 sm:p-8 text-white border border-zinc-800 shadow-xl">
            <h3 className="font-display text-2xl tracking-wide uppercase text-white pb-4 border-b border-zinc-800">
              Order Summary
            </h3>

            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-zinc-700" />
                <p>No items selected yet — add items from the menu and they'll appear here.</p>
              </div>
            ) : (
              <div className="py-5 space-y-3 max-h-80 overflow-y-auto pr-1 divide-y divide-zinc-800/50">
                {cartItems.map((item) => (
                  <div key={item.cartKey} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-zinc-200">
                        {item.quantity}× {item.name}
                      </span>
                      {item.size && (
                        <span className="text-orange-400 ml-1">({item.size})</span>
                      )}
                    </div>
                    <span className="font-semibold text-orange-400 font-sans">
                      Rs. {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-zinc-800 space-y-2 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-zinc-200 font-semibold">
                  Rs. {formatPrice(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery fee</span>
                <span className={`font-semibold ${isFreeDelivery ? 'text-emerald-400 font-bold' : 'text-zinc-200'}`}>
                  {isFreeDelivery ? 'FREE (Promotion)' : `Rs. ${formatPrice(deliveryFee)}`}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-4 border-t border-zinc-800/80">
                <span className="font-montserrat text-sm font-semibold text-white uppercase tracking-wider">
                  TOTAL
                </span>
                <span className="font-montserrat text-2xl text-amber-400 font-extrabold flex items-baseline">
                  <span className="text-base font-bold mr-1">Rs.</span>
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
            <div className="relative bg-[#161619] border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-white shadow-2xl z-10 animate-in zoom-in-95 duration-200">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => !loading && setShowConfirmModal(false)}
                disabled={loading}
                className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5 bg-orange-500/15 border border-orange-500/30 text-orange-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <h3 className="font-display text-2xl sm:text-3xl uppercase tracking-wide text-white">
                  Ready to place your order?
                </h3>
                <p className="text-zinc-400 text-xs mt-1">
                  Please review your delivery details and items below before confirming.
                </p>
              </div>

              {/* Customer & Address Review Box */}
              <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 text-xs space-y-2.5 mb-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-zinc-300">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" /> Customer
                  </span>
                  <span className="font-bold text-white text-sm">{formData.name}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-zinc-300">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" /> Phone
                  </span>
                  <span className="font-bold text-white text-sm">{formData.phone}</span>
                </div>

                <div className="flex items-start justify-between pb-2 border-b border-zinc-800 text-zinc-300">
                  <span className="text-zinc-500 flex items-center gap-1.5 flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Address
                  </span>
                  <span className="font-semibold text-right text-zinc-200 max-w-[240px] leading-relaxed">
                    {formData.address}
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500">Payment</span>
                  <span className="font-semibold text-zinc-200">{formData.paymentMethod}</span>
                </div>

                {formData.notes && (
                  <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 italic">
                    <strong className="text-zinc-300 not-italic">Note: </strong>
                    {formData.notes}
                  </div>
                )}
              </div>

              {/* Items Summary & Total Box */}
              <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/80 text-xs space-y-2 mb-6">
                <div className="flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider pb-1 border-b border-zinc-800">
                  <span>Selected Items ({cartItems.reduce((s, i) => s + i.quantity, 0)})</span>
                  <span>Price</span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 py-1 modal-items-scroll">
                  {cartItems.map((item) => (
                    <div key={item.cartKey} className="flex justify-between text-zinc-300">
                      <span className="truncate max-w-[220px]">
                        <strong className="text-white">{item.quantity}×</strong> {item.name}
                        {item.size && <span className="text-orange-400 text-[11px] ml-1">({item.size})</span>}
                      </span>
                      <span className="font-semibold text-zinc-200">
                        Rs. {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-zinc-800 space-y-1 text-zinc-400 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-zinc-200">Rs. {formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className={isFreeDelivery ? 'text-emerald-400 font-bold' : 'text-zinc-200 font-semibold'}>
                      {isFreeDelivery ? 'FREE (Promotion)' : `Rs. ${formatPrice(deliveryFee)}`}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-zinc-800 flex justify-between items-baseline font-montserrat">
                  <span className="text-xs uppercase tracking-wider text-zinc-300 font-semibold">TOTAL TO PAY</span>
                  <span className="text-xl font-extrabold text-amber-400">Rs. {formatPrice(total)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={executePlaceOrder}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Placing Order...' : 'Yes, Confirm & Place Order'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => !loading && setShowConfirmModal(false)}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
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
