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
  FileText,
  Bike
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
    syncRecentOrders,
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
  const [reviewToConfirm, setReviewToConfirm] = useState(null);

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

  // Lock background scroll and sync live orders when modal is open
  useEffect(() => {
    if (isProfileOpen) {
      document.body.style.overflow = 'hidden';
      if (typeof syncRecentOrders === 'function') {
        syncRecentOrders();
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isProfileOpen, syncRecentOrders]);

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
    setReviewToConfirm(null);
    setReviewSuccessMessage(`Thank you! Review for Order #${String(order.id || '').replace(/^#/, '')} submitted successfully.`);
    setTimeout(() => {
      setReviewSuccessMessage('');
    }, 5000);
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

  // Delivery Rider Contact Card (Shown when order is Out for Delivery and has an assigned rider)
  const renderRiderContact = (order) => {
    const raw = String(order?.status || 'Pending').trim().toLowerCase();
    const isOutForDelivery = raw.includes('out') || raw.includes('delivery') || raw.includes('way') || raw.includes('ship') || raw.includes('rider');
    if (!isOutForDelivery || (!order?.riderName && !order?.riderPhone)) return null;

    return (
      <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between gap-3 ${
        isDark
          ? 'bg-purple-950/40 border-purple-500/30 text-purple-200'
          : 'bg-purple-50/90 border-purple-200 text-purple-950 shadow-2xs'
      }`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isDark ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'bg-purple-600 text-white shadow-2xs'
          }`}>
            <Bike className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${
              isDark ? 'text-purple-300' : 'text-purple-700'
            }`}>
              Your Delivery Rider
            </span>
            <h4 className={`text-xs sm:text-sm font-bold truncate ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}>
              {order.riderName || 'Assigned Rider'}
            </h4>
          </div>
        </div>

        {order.riderPhone && (
          <a
            href={`tel:${order.riderPhone}`}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
            title={`Call ${order.riderName || 'Rider'}: ${order.riderPhone}`}
          >
            <Phone className="w-3.5 h-3.5 fill-white/20" />
            <span>Call ({order.riderPhone})</span>
          </a>
        )}
      </div>
    );
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[120] transition-all duration-300 ${
        isProfileOpen
          ? 'opacity-100 pointer-events-auto visible'
          : 'opacity-0 pointer-events-none invisible'
      }`}
    >
      {/* Dark backdrop overlay covering the rest of the screen */}
      <div
        onClick={closeProfileModal}
        className={`absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-300 ${
          isProfileOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Right side drawer: full height top-0 right-0 bottom-0, w-full on mobile, sm:max-w-[580px] md:max-w-[660px] lg:max-w-[720px] on desktop */}
      <div
        className={`absolute top-0 right-0 bottom-0 h-full w-full sm:max-w-[580px] md:max-w-[660px] lg:max-w-[720px] shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out z-10 ${
          isDark 
            ? 'bg-[#121216] text-white border-l border-white/10' 
            : 'bg-white text-zinc-900 border-l border-zinc-200'
        } ${
          isProfileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        
        {/* Header */}
        <div className={`px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-3 shrink-0 mobile-side-drawer-top ${
          isDark ? 'border-white/10 bg-[#16161c]' : 'border-zinc-200/90 bg-[#faf8f5]'
        }`}>
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
              <h2 className={`font-montserrat text-base sm:text-xl uppercase tracking-tight font-bold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                CUSTOMER PROFILE & ORDERS
              </h2>
            </div>
          </div>

          <button
            onClick={closeProfileModal}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700/60'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border-zinc-200'
            } flex items-center justify-center border transition-all cursor-pointer focus:outline-none shrink-0`}
            aria-label="Close modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Tab Navigation Segmented Bar */}
        <div className={`px-3 sm:px-6 py-2.5 shrink-0 ${isDark ? 'bg-[#141418] border-white/5' : 'bg-[#f4efe6] border-zinc-200'} border-b`}>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setProfileTab('profile')}
              className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none text-center ${
                profileTab === 'profile'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                  : isDark
                    ? 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/80 shadow-2xs'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">
                My Profile
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProfileTab('orders')}
              className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none text-center ${
                profileTab === 'orders'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                  : isDark
                    ? 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/80 shadow-2xs'
              }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 shrink-0 ${profileTab === 'orders' ? 'text-white' : 'text-orange-400'}`} />
              <span className="whitespace-nowrap">
                <span className="hidden sm:inline">Recent </span>Orders
              </span>
              {recentOrders.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-tight shrink-0 transition-all ${
                  profileTab === 'orders'
                    ? 'bg-white/25 text-white'
                    : isDark
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                      : 'bg-orange-100 text-orange-700 border border-orange-200/90'
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
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                  : isDark
                    ? 'bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200/80 shadow-2xs'
              }`}
            >
              <Star className={`w-3.5 h-3.5 shrink-0 ${profileTab === 'reviews' ? 'text-white fill-white' : 'text-amber-400 fill-amber-400'}`} />
              <span className="whitespace-nowrap">
                <span className="hidden sm:inline">Add </span>Review
              </span>
              {pendingReviewOrders.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-tight shrink-0 transition-all ${
                  profileTab === 'reviews'
                    ? 'bg-white/25 text-white'
                    : isDark
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-amber-100 text-amber-800 border border-amber-200/90'
                }`}>
                  {pendingReviewOrders.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-dropdown-scroll pr-3 sm:pr-5 mobile-side-drawer-bottom">

          {/* TAB 1: COMPLETE PROFILE */}
          {profileTab === 'profile' && (
            <div className="space-y-4">
              {/* Profile Tab Header */}
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'} uppercase tracking-wider flex items-center gap-2`}>
                  <User className="w-4 h-4 text-orange-400" />
                  <span>Your Profile Details</span>
                </h3>
                <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  Auto-fill Checkout
                </span>
              </div>

              {/* Profile Details Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Name */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'} mb-1.5`}>
                    Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. M. Salik"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${isDark ? 'bg-black/40 border-zinc-700 text-white placeholder-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'} border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'} mb-1.5`}>
                    Phone Number *
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
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${isDark ? 'bg-black/40 border-zinc-700 text-white placeholder-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'} border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500`}
                    />
                  </div>
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
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${isDark ? 'bg-black/40 border-zinc-700 text-white placeholder-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'} border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none`}
                    />
                  </div>
                </div>

                {/* Save Profile Button */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Profile Details</span>
                  </button>

                  {saveSuccess && (
                    <div className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'} flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1`}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Saved successfully!</span>
                    </div>
                  )}
                </div>
              </form>
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
                <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  {recentOrders.length} {recentOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>

              {recentOrders.length === 0 ? (
                <div className={`p-8 rounded-3xl ${isDark ? 'bg-zinc-900/80 border-zinc-700/80' : 'bg-zinc-50 border-zinc-300'} border text-center space-y-3`}>
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
                    className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
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
                        className={`p-4 sm:p-4.5 rounded-2xl ${isDark ? 'bg-[#181820] border-zinc-700/80 hover:border-zinc-500 shadow-md hover:shadow-lg' : 'bg-white border-zinc-300 hover:border-zinc-400 shadow-xs hover:shadow-sm'} border space-y-3 transition-all`}
                      >
                        <div className={`flex items-start justify-between gap-2 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'} pb-2.5`}>
                          <div>
                            <span className="text-xs font-sans font-bold text-orange-400">
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
                        <div className={`flex items-center justify-between pt-2.5 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                          <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            Total: <span className="text-orange-400">Rs. {formatPrice(order.total || 0)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setReceiptOrder(order)}
                              className={`px-2.5 py-1.5 rounded-lg ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300'} text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer`}
                              title="View and download thermal receipt"
                            >
                              <FileText className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Receipt</span>
                            </button>

                            {String(order.status || '').toLowerCase() === 'delivered' && (
                              <>
                                {!reviewedOrderIds.includes(String(order.id)) && (
                                  <button
                                    type="button"
                                    onClick={() => setProfileTab('reviews')}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    title="Rate and review this delivered order"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span>Review</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    reorder(order);
                                    closeProfileModal();
                                    setIsCartOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Add items back to cart"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Reorder</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Delivery Rider Contact Card (Hidden unless Out for Delivery with an assigned rider) */}
                        {renderRiderContact(order)}
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
                <div className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  isDark
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-600 text-white shadow-2xs'
                    }`}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold leading-tight ${isDark ? 'text-emerald-300' : 'text-emerald-950'}`}>
                        {reviewSuccessMessage}
                      </p>
                      <p className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-emerald-400/80' : 'text-emerald-700'}`}>
                        Your valuable feedback has been recorded.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewSuccessMessage('')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      isDark ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-700 hover:bg-emerald-100'
                    }`}
                    aria-label="Dismiss message"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Pending reviews for delivered orders */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'} uppercase tracking-wider flex items-center gap-2`}>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Rate Delivered Orders</span>
                  </h3>
                  <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    {pendingReviewOrders.length} Pending
                  </span>
                </div>

                {pendingReviewOrders.length === 0 ? (
                  <div className={`p-5 rounded-2xl ${isDark ? 'bg-zinc-900/80 border-zinc-700/80 text-zinc-400' : 'bg-zinc-50 border-zinc-300 text-zinc-600'} border text-center text-xs space-y-1`}>
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
                          className={`p-4 sm:p-5 rounded-2xl ${isDark ? 'bg-[#181820] border-amber-500/40 hover:border-amber-500/70 shadow-md' : 'bg-white border-amber-500/40 hover:border-amber-500/70 shadow-xs'} border space-y-3.5 transition-all`}
                        >
                          <div className={`flex items-start justify-between gap-2 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'} pb-2.5`}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-sans font-bold text-orange-400">
                                  #{cleanId}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  Delivered
                                </span>
                              </div>
                              <div className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-0.5`}>
                                {formattedDate}
                              </div>
                            </div>
                            <div className="text-xs font-bold">
                              <span className={`${isDark ? 'text-zinc-400' : 'text-zinc-500'} mr-1`}>Total:</span>
                              <span className="text-orange-400 font-extrabold">Rs. {formatPrice(order.total || 0)}</span>
                            </div>
                          </div>

                          <div className={`text-xs ${isDark ? 'text-zinc-300 bg-black/40 border-zinc-700/80' : 'text-zinc-700 bg-zinc-50 border-zinc-200'} p-2.5 rounded-xl border leading-relaxed break-words`}>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400/90 block mb-0.5">
                              Ordered Items:
                            </span>
                            {(order.items || []).map((it) => `${it.quantity || 1}x ${it.name}`).join(' • ')}
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
                                ? 'bg-black/40 border-zinc-700 text-white placeholder-zinc-500'
                                : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                            }`}
                          />

                          {/* Rating & Submit Review Bar */}
                          <div className={`pt-2.5 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'} flex flex-col sm:flex-row items-center justify-between gap-3`}>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                              <div className="flex items-center gap-1.5">
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

                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => {
                                const rating = reviewRatings[order.id] !== undefined ? reviewRatings[order.id] : 5;
                                const comment = (reviewComments[order.id] || '').trim();
                                setReviewToConfirm({ order, rating, comment });
                              }}
                              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Submit Review</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* General Feedback / Store Review Form */}
              <div className={`p-4 sm:p-5 rounded-2xl ${isDark ? 'bg-[#181820] border-zinc-700/80 shadow-md' : 'bg-zinc-50 border-zinc-300 shadow-xs'} border space-y-3`}>
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

      {/* Review Submission Confirmation Modal */}
      {reviewToConfirm && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={() => !submittingReviewId && setReviewToConfirm(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity duration-200"
          />

          {/* Modal Card */}
          <div
            className={`relative w-full max-w-sm rounded-3xl p-5 sm:p-6 border shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 ${
              isDark ? 'bg-[#15151a] border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            <button
              type="button"
              onClick={() => !submittingReviewId && setReviewToConfirm(null)}
              disabled={Boolean(submittingReviewId)}
              className={`absolute top-4 right-4 p-2 rounded-xl transition-colors disabled:opacity-40 cursor-pointer ${
                isDark ? 'text-zinc-400 hover:text-white hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-500">
                <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
              </div>
              <h3 className={`font-sans font-extrabold text-base sm:text-lg uppercase tracking-tight ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                Confirm Review Submission
              </h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Are you sure you want to submit this feedback for Order <span className="font-sans font-bold text-orange-400">#{String(reviewToConfirm.order.id || '').replace(/^#/, '')}</span>?
              </p>
            </div>

            {/* Review Summary Box */}
            <div
              className={`rounded-2xl p-3.5 border text-xs space-y-2.5 mb-4 ${
                isDark ? 'bg-black/40 border-white/10' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-white/5' : 'border-zinc-200'}`}>
                <span className={`text-[11px] font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Your Rating
                </span>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i <= reviewToConfirm.rating
                            ? 'fill-amber-400 text-amber-400'
                            : isDark ? 'text-zinc-700' : 'text-zinc-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-amber-500 text-xs">
                    ({reviewToConfirm.rating}/5)
                  </span>
                  <span className="text-[11px] font-medium text-amber-600">
                    {reviewToConfirm.rating === 5
                      ? '• Excellent'
                      : reviewToConfirm.rating === 4
                      ? '• Very Good'
                      : reviewToConfirm.rating === 3
                      ? '• Good'
                      : reviewToConfirm.rating === 2
                      ? '• Fair'
                      : '• Poor'}
                  </span>
                </div>
              </div>

              <div className={`flex items-start justify-between pb-2 border-b ${isDark ? 'border-white/5' : 'border-zinc-200'} gap-2`}>
                <span className={`text-[11px] font-semibold flex-shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Items
                </span>
                <span className={`font-semibold text-right text-[11px] leading-relaxed break-words ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {reviewToConfirm.order.items?.map((it) => `${it.quantity || 1}x ${it.name}`).join(', ') || `Order #${reviewToConfirm.order.id}`}
                </span>
              </div>

              <div>
                <span className={`text-[10px] block mb-1 uppercase font-bold tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Your Comment
                </span>
                <p className={`text-[11px] italic p-2 rounded-xl border ${
                  isDark ? 'bg-zinc-900 border-white/5 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'
                }`}>
                  {reviewToConfirm.comment ? `"${reviewToConfirm.comment}"` : <span className="not-italic text-zinc-400">No comment provided</span>}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setReviewToConfirm(null)}
                disabled={Boolean(submittingReviewId)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border active:scale-95 transition-all cursor-pointer ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-zinc-300'
                    : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmitOrderReview(reviewToConfirm.order)}
                disabled={Boolean(submittingReviewId)}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {submittingReviewId ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </span>
                ) : (
                  <span>Confirm & Submit</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
