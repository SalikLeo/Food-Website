import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  Phone,
  MapPin,
  X,
  Check,
  CheckCircle2,
  RotateCcw,
  Star,
  ShoppingBag,
  ArrowRight,
  Loader2,
  FileText
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';
import { apiUrl } from '../config/api';
import CustomerReceiptModal from './CustomerReceiptModal';
import {
  getStoredCustomerUser,
  clearStoredCustomerUser,
  triggerGoogleLogin
} from '../services/googleAuth';
import { saveStoredUserProfile } from '../services/userProfile';

export default function UserProfileModal() {
  const {
    isProfileOpen,
    closeProfileModal,
    profileTab,
    setProfileTab,
    userProfile,
    recentOrders,
    reorder,
    setIsCartOpen,
    isDark
  } = useCart();

  // Local editable form state for Name, Phone, Address
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Authenticated Google user info
  const [customerUser, setCustomerUser] = useState(() => getStoredCustomerUser());
  const [googleLoading, setGoogleLoading] = useState(false);

  // Reviews tracking state
  const [reviewedOrderIds, setReviewedOrderIds] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_reviewed_order_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [reviewRatings, setReviewRatings] = useState({});
  const [reviewComments, setReviewComments] = useState({});
  const [submittingReviewId, setSubmittingReviewId] = useState(null);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState('');

  // General review state (if user wants to leave a store review directly)
  const [generalRating, setGeneralRating] = useState(5);
  const [generalComment, setGeneralComment] = useState('');
  const [generalSubmitting, setGeneralSubmitting] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);

  // Receipt Modal state
  const [receiptOrder, setReceiptOrder] = useState(null);

  // Sync inputs with userProfile whenever modal opens or profile changes
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhone(userProfile.phone || '');
      setAddress(userProfile.address || '');
    }
  }, [userProfile, isProfileOpen]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isProfileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isProfileOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isProfileOpen) {
        closeProfileModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProfileOpen, closeProfileModal]);

  if (!isProfileOpen) return null;

  // Filter delivered orders that are pending review
  const pendingReviewOrders = (recentOrders || []).filter((o) => {
    return (
      o &&
      o.id &&
      String(o.status || '').toLowerCase() === 'delivered' &&
      !reviewedOrderIds.includes(String(o.id))
    );
  });

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '').slice(0, 11);
    saveStoredUserProfile({
      name,
      phone: cleanPhone,
      address
    });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await triggerGoogleLogin({
        onSuccess: (user) => {
          setCustomerUser(user);
          setGoogleLoading(false);
          // If profile name is empty, auto-fill with Google name
          if (!name && user?.name) {
            setName(user.name);
            saveStoredUserProfile({
              name: user.name,
              phone,
              address
            });
          }
        },
        onError: (err) => {
          setGoogleLoading(false);
          console.warn(err);
        },
        onConfigRequired: () => {
          setGoogleLoading(false);
          alert('Google Sign-In is configured! Please add your VITE_GOOGLE_CLIENT_ID to the .env file.');
        }
      });
    } catch (e) {
      setGoogleLoading(false);
      console.error(e);
    }
  };

  const handleCustomerLogout = () => {
    clearStoredCustomerUser();
    setCustomerUser(null);
  };

  const handleSubmitOrderReview = async (order) => {
    setSubmittingReviewId(order.id);
    const rating = reviewRatings[order.id] !== undefined ? reviewRatings[order.id] : 5;
    const comment = (reviewComments[order.id] || '').trim() || '-';
    const customerName = (order.customerName || name || customerUser?.name || 'Customer').trim();
    const itemOrdered = (order.items || []).map((i) => `${i.quantity || 1}x ${i.name}`).join(', ') || `Order #${order.id}`;

    const payload = {
      name: customerName,
      location: order.address || address || 'Wah Cantt',
      rating: Number(rating) || 5,
      platform: 'Website Order Review',
      itemOrdered,
      comment,
      orderId: String(order.id)
    };

    try {
      await fetch(apiUrl('/api/reviews'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Network issue saving review, recorded locally:', err);
    }

    const updated = Array.from(new Set([...reviewedOrderIds, String(order.id)]));
    setReviewedOrderIds(updated);
    try {
      localStorage.setItem('salik_reviewed_order_ids', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setSubmittingReviewId(null);
    setReviewSuccessMessage(`Thank you! Review for Order #${order.id} submitted successfully.`);
    setTimeout(() => {
      setReviewSuccessMessage('');
    }, 4000);
  };

  const handleSubmitGeneralReview = async (e) => {
    e.preventDefault();
    if (!generalComment.trim()) return;
    setGeneralSubmitting(true);

    const payload = {
      name: (name || customerUser?.name || 'Customer').trim(),
      location: address || 'Wah Cantt',
      rating: Number(generalRating) || 5,
      platform: 'Website Customer Feedback',
      itemOrdered: 'Fast Food Experience',
      comment: generalComment.trim()
    };

    try {
      await fetch(apiUrl('/api/reviews'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setGeneralSuccess(true);
      setGeneralComment('');
      setTimeout(() => setGeneralSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to submit general review:', err);
      alert('Could not submit review at this moment. Please check your connection.');
    } finally {
      setGeneralSubmitting(false);
    }
  };

  const getStatusBadge = (status = 'Pending') => {
    const s = String(status).toLowerCase();
    if (s === 'delivered') {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Delivered
        </span>
      );
    }
    if (s.includes('out') || s.includes('delivery')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30 animate-pulse">
          Out for Delivery
        </span>
      );
    }
    if (s.includes('prep')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
          Preparing
        </span>
      );
    }
    if (s.includes('confirm')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
          Confirmed
        </span>
      );
    }
    if (s.includes('cancel')) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
          Cancelled
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
        Pending
      </span>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5">
      {/* Dark backdrop */}
      <div
        onClick={closeProfileModal}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Main Modal Card */}
      <div className={`relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl ${
        isDark ? 'bg-[#121216] border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl'
      } border shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200`}>
        
        {/* Header */}
        <div className={`px-4 sm:px-6 py-3.5 sm:py-4 border-b ${
          isDark ? 'border-white/10 bg-[#16161c]' : 'border-zinc-200/90 bg-[#faf8f5]'
        } flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold shrink-0">
              {customerUser?.picture ? (
                <img
                  src={customerUser.picture}
                  alt={customerUser.name}
                  className="w-10 h-10 rounded-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-5 h-5 text-orange-400" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className={`font-display text-lg sm:text-2xl tracking-wide leading-tight truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                CUSTOMER PROFILE & ORDERS
              </h2>
              <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-0.5 truncate`}>
                Salik Fast Food • Wah Cantt
              </p>
            </div>
          </div>

          <button
            onClick={closeProfileModal}
            className={`w-9 h-9 rounded-full ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700/60'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border-zinc-200'
            } flex items-center justify-center border transition-all cursor-pointer focus:outline-none shrink-0`}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Segmented Bar */}
        <div className={`px-3 sm:px-6 py-2.5 ${isDark ? 'bg-[#141418] border-white/5' : 'bg-[#f4efe6] border-zinc-200'} border-b`}>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setProfileTab('profile')}
              className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none text-center ${
                profileTab === 'profile'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                  : isDark
                    ? 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/80 shadow-2xs'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Complete </span>Profile
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProfileTab('orders')}
              className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none text-center ${
                profileTab === 'orders'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                  : isDark
                    ? 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/80 shadow-2xs'
              }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 shrink-0 ${profileTab === 'orders' ? 'text-white' : 'text-orange-400'}`} />
              <span className="truncate">
                <span className="hidden sm:inline">Recent </span>Orders
              </span>
              {recentOrders.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
                  profileTab === 'orders' ? 'bg-white/25 text-white' : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {recentOrders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setProfileTab('reviews')}
              className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none text-center ${
                profileTab === 'reviews'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                  : isDark
                    ? 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/80 shadow-2xs'
              }`}
            >
              <Star className={`w-3.5 h-3.5 shrink-0 ${profileTab === 'reviews' ? 'text-white fill-white' : 'text-amber-400 fill-amber-400'}`} />
              <span className="truncate">
                <span className="hidden sm:inline">Add </span>Review
              </span>
              {pendingReviewOrders.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
                  profileTab === 'reviews' ? 'bg-amber-400 text-black' : 'bg-amber-500 text-black'
                }`}>
                  {pendingReviewOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-dropdown-scroll pr-3 sm:pr-5">

          {/* TAB 1: COMPLETE PROFILE */}
          {profileTab === 'profile' && (
            <div className="space-y-4">
              {/* Google Account Quick Connect / Status */}
              <div className={`p-3.5 rounded-2xl ${isDark ? 'bg-zinc-900/80 border-white/5' : 'bg-zinc-50 border-zinc-200'} border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
                <div className="flex items-center gap-3">
                  {customerUser?.picture ? (
                    <img
                      src={customerUser.picture}
                      alt={customerUser.name}
                      className="w-10 h-10 rounded-full object-cover border border-orange-500/50"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-200 text-zinc-600'} flex items-center justify-center font-bold text-sm`}>
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {customerUser ? customerUser.name : 'Google Account (Optional)'}
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {customerUser ? customerUser.email : 'Sign in to sync your profile & order receipts'}
                    </div>
                  </div>
                </div>

                {customerUser ? (
                  <button
                    type="button"
                    onClick={handleCustomerLogout}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>{googleLoading ? 'Connecting...' : 'Sign in with Google'}</span>
                  </button>
                )}
              </div>

              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'} mb-1.5`}>
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. M. Salik"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${isDark ? 'bg-black/40 border-white/10 text-white placeholder-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'} border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'} mb-1.5`}>
                    Phone Number (11-Digit) *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={11}
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="03001234567"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${isDark ? 'bg-black/40 border-white/10 text-white placeholder-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'} border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    />
                  </div>
                  <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-500'} mt-1 block`}>
                    Format: 03001234567 (used for delivery call and live order updates)
                  </span>
                </div>

                {/* Delivery Address */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'} mb-1.5`}>
                    Delivery Address *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-orange-400" />
                    <textarea
                      required
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House/Shop #, Street, Sector, Area in Wah Cantt"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${isDark ? 'bg-black/40 border-white/10 text-white placeholder-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'} border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none`}
                    />
                  </div>
                </div>

                {/* Save Profile Button */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Profile Details</span>
                  </button>

                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Saved successfully!</span>
                    </span>
                  )}
                </div>
              </form>

              {/* Navigation Cards Under Profile */}
              <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-zinc-200'} grid grid-cols-1 sm:grid-cols-2 gap-3`}>
                <button
                  type="button"
                  onClick={() => setProfileTab('orders')}
                  className={`p-3.5 rounded-2xl ${isDark ? 'bg-zinc-900/90 border-white/10 hover:border-orange-500/40 text-white' : 'bg-zinc-50 border-zinc-200 hover:border-orange-500/40 text-zinc-900 shadow-2xs'} border text-left transition-all group cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'} flex items-center gap-2`}>
                      <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
                      <span>Recent Orders</span>
                    </span>
                    <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                      {recentOrders.length}
                    </span>
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    View your past orders, status, and reorder with 1 tap.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setProfileTab('reviews')}
                  className={`p-3.5 rounded-2xl ${isDark ? 'bg-zinc-900/90 border-white/10 hover:border-amber-500/40 text-white' : 'bg-zinc-50 border-zinc-200 hover:border-amber-500/40 text-zinc-900 shadow-2xs'} border text-left transition-all group cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'} flex items-center gap-2`}>
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>Add Review</span>
                    </span>
                    {pendingReviewOrders.length > 0 ? (
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                        {pendingReviewOrders.length} pending
                      </span>
                    ) : (
                      <span className={`text-[11px] font-bold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Leave feedback
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Rate delivered orders or share your overall feedback.
                  </p>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: RECENT ORDERS */}
          {profileTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'} uppercase tracking-wider flex items-center gap-2`}>
                  <RotateCcw className="w-4 h-4 text-orange-400" />
                  <span>Your Order History</span>
                </h3>
                <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {recentOrders.length} {recentOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>

              {recentOrders.length === 0 ? (
                <div className={`p-8 rounded-3xl ${isDark ? 'bg-zinc-900/60 border-white/5' : 'bg-zinc-50 border-zinc-200'} border text-center space-y-3`}>
                  <div className={`w-12 h-12 rounded-2xl ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'} flex items-center justify-center mx-auto`}>
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>No Recent Orders Found</h4>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'} max-w-sm mx-auto`}>
                    You haven't placed any orders from this device yet. Explore our mouth-watering menu and place your order!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      closeProfileModal();
                      const menuSec = document.getElementById('menu');
                      if (menuSec) menuSec.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => {
                    const cleanId = String(order.id || '').replace(/^#/, '');
                    const items = order.items || [];
                    const formattedDate = order.createdAt
                      ? new Date(order.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })
                      : 'Recent';

                    return (
                      <div
                        key={order.id}
                        className={`p-4 rounded-2xl ${isDark ? 'bg-zinc-900/90 border-white/10 hover:border-white/20' : 'bg-white border-zinc-200/90 hover:border-zinc-300 shadow-2xs'} border space-y-3 transition-all`}
                      >
                        <div className={`flex items-start justify-between gap-2 border-b ${isDark ? 'border-white/5' : 'border-zinc-100'} pb-2.5`}>
                          <div>
                            <span className="text-xs font-mono font-bold text-orange-400">
                              #{cleanId}
                            </span>
                            <div className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-0.5`}>
                              {formattedDate}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(order.status)}
                          </div>
                        </div>

                        {/* Items list */}
                        <div className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'} leading-relaxed break-words`}>
                          {items.map((it) => `${it.quantity || 1}x ${it.name}`).join(' • ') || 'Order items'}
                        </div>

                        {/* Bottom Total & Actions */}
                        <div className={`flex items-center justify-between pt-2 border-t ${isDark ? 'border-white/5' : 'border-zinc-100'}`}>
                          <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            Total: <span className="text-orange-400">Rs. {formatPrice(order.total || 0)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setReceiptOrder(order)}
                              className={`px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200'} text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer`}
                              title="View and download thermal receipt"
                            >
                              <FileText className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Receipt</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                reorder(order);
                                closeProfileModal();
                                setIsCartOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Add items back to cart"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reorder</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADD REVIEW */}
          {profileTab === 'reviews' && (
            <div className="space-y-5">
              
              {reviewSuccessMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{reviewSuccessMessage}</span>
                </div>
              )}

              {/* Pending reviews for delivered orders */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'} uppercase tracking-wider flex items-center gap-2`}>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Rate Delivered Orders</span>
                  </h3>
                  <span className="text-xs text-amber-400 font-bold">
                    {pendingReviewOrders.length} Pending
                  </span>
                </div>

                {pendingReviewOrders.length === 0 ? (
                  <div className={`p-5 rounded-2xl ${isDark ? 'bg-zinc-900/60 border-white/5 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'} border text-center text-xs space-y-1`}>
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                    <span className="font-semibold block">All delivered orders have been reviewed!</span>
                    <span className="text-[11px] opacity-75">Thank you for helping us maintain top food quality and service.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingReviewOrders.map((order) => {
                      const cleanId = String(order.id || '').replace(/^#/, '');
                      const rating = reviewRatings[order.id] !== undefined ? reviewRatings[order.id] : 5;
                      const comment = reviewComments[order.id] || '';
                      const isSubmitting = submittingReviewId === order.id;

                      return (
                        <div
                          key={order.id}
                          className={`p-4 sm:p-5 rounded-2xl ${isDark ? 'bg-zinc-900/90 border-amber-500/25' : 'bg-white border-amber-500/30 shadow-2xs'} border space-y-3.5`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-orange-400">
                                #{cleanId}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Delivered
                              </span>
                            </div>
                            <div className="text-xs font-bold">
                              <span className={`${isDark ? 'text-zinc-400' : 'text-zinc-500'} mr-1`}>Total:</span>
                              <span className="text-orange-400 font-extrabold">Rs. {formatPrice(order.total || 0)}</span>
                            </div>
                          </div>

                          <div className={`text-xs ${isDark ? 'text-zinc-300 bg-black/25 border-white/5' : 'text-zinc-700 bg-zinc-50 border-zinc-200/80'} p-2.5 rounded-xl border leading-relaxed break-words`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400/90 block mb-0.5">
                              Ordered Items:
                            </span>
                            {(order.items || []).map((it) => `${it.quantity || 1}x ${it.name}`).join(' • ')}
                          </div>

                          {/* Star Rating Picker */}
                          <div className={`pt-2 border-t ${isDark ? 'border-white/5' : 'border-zinc-100'} flex flex-wrap items-center justify-between gap-2`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                Your Rating:
                              </span>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() =>
                                      setReviewRatings((prev) => ({ ...prev, [order.id]: star }))
                                    }
                                    className="p-1 hover:scale-125 transition-transform cursor-pointer focus:outline-none"
                                    title={`${star} Star`}
                                  >
                                    <Star
                                      className={`w-5 h-5 ${
                                        star <= rating
                                          ? 'text-amber-400 fill-amber-400'
                                          : isDark ? 'text-zinc-700' : 'text-zinc-300'
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                              <span className="text-xs font-bold text-amber-500 ml-1">
                                {rating === 5
                                  ? 'Excellent'
                                  : rating === 4
                                  ? 'Very Good'
                                  : rating === 3
                                  ? 'Good'
                                  : rating === 2
                                  ? 'Fair'
                                  : 'Poor'}
                              </span>
                            </div>
                          </div>

                          {/* Comment input textarea */}
                          <textarea
                            rows={2}
                            value={comment}
                            onChange={(e) =>
                              setReviewComments((prev) => ({
                                ...prev,
                                [order.id]: e.target.value
                              }))
                            }
                            placeholder="Share your experience (e.g. food taste, packaging, delivery speed)..."
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none ${
                              isDark
                                ? 'bg-black/40 border-white/10 text-white placeholder-zinc-500'
                                : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                            }`}
                          />

                          <div className="flex justify-end pt-0.5">
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleSubmitOrderReview(order)}
                              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isSubmitting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>{isSubmitting ? 'Submitting...' : 'Submit Review'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* General Feedback / Store Review Form */}
              <div className={`p-4 sm:p-5 rounded-2xl ${isDark ? 'bg-zinc-900/60 border-white/10' : 'bg-zinc-50 border-zinc-200 shadow-2xs'} border space-y-3`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Write General Store Review / Feedback
                </h4>

                {generalSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Your review has been submitted for approval. Thank you!</span>
                  </div>
                )}

                <form onSubmit={handleSubmitGeneralReview} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Rating:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setGeneralRating(star)}
                          className="p-1 hover:scale-125 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              star <= generalRating
                                ? 'text-amber-400 fill-amber-400'
                                : isDark ? 'text-zinc-600' : 'text-zinc-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    required
                    value={generalComment}
                    onChange={(e) => setGeneralComment(e.target.value)}
                    placeholder="Tell us what you love or how we can improve..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-zinc-500 resize-none ${
                      isDark
                        ? 'bg-black/40 border-white/10 text-white placeholder-zinc-500'
                        : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400'
                    }`}
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={generalSubmitting}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 ${
                        isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs'
                      }`}
                    >
                      {generalSubmitting ? 'Posting...' : 'Post General Review'}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Embedded Customer Receipt Modal */}
      {receiptOrder && (
        <CustomerReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>,
    document.body
  );
}
