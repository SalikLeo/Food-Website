import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Package,
  ShoppingBag,
  Flame,
  Wallet,
  Clock,
  LogOut,
  ArrowLeft,
  RefreshCw,
  Store,
  Truck,
  TrendingUp,
  Star,
  Settings,
  Calendar,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Bell,
  Volume2,
  VolumeX,
  Bike
} from 'lucide-react';
import ProductManager from './ProductManager';
import OrdersManager from './OrdersManager';
import DealsManager from './DealsManager';
import DeliverySettingsManager from './DeliverySettingsManager';
import ItemSalesManager from './ItemSalesManager';
import ReviewManager from './ReviewManager';
import RidersManager from './RidersManager';
import { apiUrl, APP_MODE } from '../../config/api';
import { formatPrice, getLocalDateStr, formatToDDMMYY } from '../../utils/formatters';
import { App as CapApp } from '@capacitor/app';
import { 
  requestNotificationPermission, 
  notifyAdminNewOrder, 
  notifyAdminNewReview, 
  playNotificationSound, 
  triggerVibration 
} from '../../services/notificationService';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AdminDashboard({ onLogout, onBackToStore }) {
  const [activeTab, setActiveTab] = useState('orders');
  const [tabHistory, setTabHistory] = useState(['orders']);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const dateInputRef = useRef(null);

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        try {
          dateInputRef.current.showPicker();
          return;
        } catch (err) {
          console.warn('showPicker error:', err);
        }
      }
      dateInputRef.current.focus();
    }
  };

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setTabHistory(prev => (prev[prev.length - 1] === tab ? prev : [...prev, tab]));
  };


  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [deals, setDeals] = useState([]);
  const [familyDeal, setFamilyDeal] = useState(null);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [riders, setRiders] = useState([]);
  const [settings, setSettings] = useState({ deliveryFee: 100, minOrder: 500 });
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalDeals: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showStorefrontConfirm, setShowStorefrontConfirm] = useState(false);

  // Detailed Time Filter State
  const [timeFilterMode, setTimeFilterMode] = useState('today'); // 'today' | 'monthly' | 'annual' | 'all'
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr(new Date())); // 'YYYY-MM-DD'
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth()); // 0 - 11
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  // Available Years from orders (plus current and last 2 years)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set([currentYear, currentYear - 1, currentYear - 2]);
    (orders || []).forEach(o => {
      if (o.createdAt) {
        const y = new Date(o.createdAt).getFullYear();
        if (!isNaN(y)) yearSet.add(y);
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [orders]);

  const todayLocalStr = useMemo(() => getLocalDateStr(new Date()), []);
  const isDefaultFilter = timeFilterMode === 'today' && selectedDate === todayLocalStr;

  const resetToDefaultFilter = () => {
    const now = new Date();
    setTimeFilterMode('today');
    setSelectedDate(getLocalDateStr(now));
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  };

  // Filtered orders for both stats cards AND orders manager
  const dateFilteredOrders = useMemo(() => {
    return (orders || []).filter(o => {
      if (!o.createdAt) return true;
      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return true;
      const orderDateStr = getLocalDateStr(orderDate);

      if (timeFilterMode === 'today') {
        return selectedDate ? orderDateStr === selectedDate : true;
      }
      if (timeFilterMode === 'monthly') {
        return orderDate.getFullYear() === Number(selectedYear) && orderDate.getMonth() === Number(selectedMonth);
      }
      if (timeFilterMode === 'annual') {
        return orderDate.getFullYear() === Number(selectedYear);
      }
      if (timeFilterMode === 'all') {
        return true;
      }
      return true;
    });
  }, [orders, timeFilterMode, selectedDate, selectedMonth, selectedYear]);

  // Check if there are pending orders from other days when viewing today
  const pendingOutsideCount = useMemo(() => {
    if (timeFilterMode !== 'today' || selectedDate !== todayLocalStr) return 0;
    return (orders || []).filter(o => o.status === 'Pending' && getLocalDateStr(o.createdAt) !== todayLocalStr).length;
  }, [orders, timeFilterMode, selectedDate, todayLocalStr]);

  const displayStats = useMemo(() => {
    const totalOrders = dateFilteredOrders.length;
    const pendingOrders = dateFilteredOrders.filter(o => o.status === 'Pending').length;
    const totalRevenue = dateFilteredOrders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    return {
      totalProducts: stats.totalProducts || products.length,
      totalDeals: stats.totalDeals || (deals.length + (familyDeal ? 1 : 0)),
      totalOrders,
      pendingOrders,
      totalRevenue
    };
  }, [dateFilteredOrders, stats, products.length, deals.length, familyDeal]);

  // Derived counts for tab buttons
  const pendingOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'Pending').length;
  }, [orders]);

  const totalDealsCount = useMemo(() => {
    return stats.totalDeals || (deals.length + (familyDeal ? 1 : 0));
  }, [stats.totalDeals, deals.length, familyDeal]);

  const totalItemsSold = useMemo(() => {
    return orders
      .filter(o => o.status === 'Delivered')
      .reduce((sum, o) => {
        const itemQty = (o.items || []).reduce((q, item) => q + (Number(item.quantity) || 1), 0);
        return sum + itemQty;
      }, 0);
  }, [orders]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowLogoutConfirm(false);
        setShowStorefrontConfirm(false);
      }
    };
    if (showLogoutConfirm || showStorefrontConfirm) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutConfirm, showStorefrontConfirm]);

  // Handle native Android hardware back button
  useEffect(() => {
    let backHandle = null;
    const setupBack = async () => {
      try {
        backHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
          // 1. If any modal or receipt is open on the modal stack, close the topmost modal
          if (window.__salikModalStack && window.__salikModalStack.length > 0) {
            const closeTopModal = window.__salikModalStack.pop();
            if (typeof closeTopModal === 'function') {
              closeTopModal();
              return;
            }
          }
          // 2. If confirmation modals are open
          if (showLogoutConfirm) {
            setShowLogoutConfirm(false);
            return;
          }
          if (showStorefrontConfirm) {
            setShowStorefrontConfirm(false);
            return;
          }
          // 3. If tabHistory has previous tabs, go to previous tab
          if (tabHistory.length > 1) {
            const nextHistory = tabHistory.slice(0, -1);
            const prevTab = nextHistory[nextHistory.length - 1];
            setTabHistory(nextHistory);
            setActiveTab(prevTab);
            return;
          }
          // 4. If current tab is not default 'orders', go to default 'orders'
          if (activeTab !== 'orders') {
            setActiveTab('orders');
            setTabHistory(['orders']);
            return;
          }
          // 5. Default tab ('orders') with no history -> exit app
          CapApp.exitApp();
        });
      } catch (e) {
        console.warn('Capacitor App listener not active:', e);
      }
    };
    setupBack();
    return () => {
      if (backHandle?.remove) {
        backHandle.remove();
      }
    };
  }, [showLogoutConfirm, showStorefrontConfirm, tabHistory, activeTab]);



  // Sound alert state & synthesizer
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_admin_sound_alert');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const playOrderAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      // 4-note upbeat chime: C5 -> E5 -> G5 -> C6
      const notes = [
        { freq: 523.25, time: now, dur: 0.14 },
        { freq: 659.25, time: now + 0.12, dur: 0.14 },
        { freq: 783.99, time: now + 0.24, dur: 0.16 },
        { freq: 1046.50, time: now + 0.38, dur: 0.40 }
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.exponentialRampToValueAtTime(0.35, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + dur);
      });
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  };

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('salik_admin_sound_alert', String(next));
      } catch {}
      if (next) {
        playOrderAlertSound();
      }
      return next;
    });
  };

  // Real-time new order tracking & alerts
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const knownOrderIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);

  const processIncomingOrders = (incomingOrders) => {
    if (!Array.isArray(incomingOrders)) return;

    if (!initialLoadDoneRef.current) {
      // Seed existing orders on first load without triggering alerts
      incomingOrders.forEach(o => {
        if (o && o.id) knownOrderIdsRef.current.add(String(o.id).trim());
      });
      initialLoadDoneRef.current = true;
      setOrders(incomingOrders);
      return;
    }

    // Detect newly arrived orders
    const newOrders = incomingOrders.filter(o => {
      if (!o || !o.id) return false;
      const cleanId = String(o.id).trim();
      return !knownOrderIdsRef.current.has(cleanId);
    });

    if (newOrders.length > 0) {
      newOrders.forEach(o => knownOrderIdsRef.current.add(String(o.id).trim()));

      const latest = newOrders[0];
      setNewOrderAlert({
        order: latest,
        count: newOrders.length,
        receivedAt: new Date()
      });

      // Dispatch sound, vibration, and native/web notification
      if (soundEnabled) {
        notifyAdminNewOrder(latest, newOrders.length);
      } else {
        triggerVibration([250, 100, 250, 100, 400]);
        notifyAdminNewOrder(latest, newOrders.length);
      }
    }

    setOrders(incomingOrders);
  };

  // Real-time new customer review tracking & alerts
  const [newReviewAlert, setNewReviewAlert] = useState(null);
  const knownReviewIdsRef = useRef(new Set());
  const initialReviewsLoadDoneRef = useRef(false);

  const processIncomingReviews = (incomingReviews) => {
    if (!Array.isArray(incomingReviews)) return;

    if (!initialReviewsLoadDoneRef.current) {
      incomingReviews.forEach(r => {
        if (r && r.id) knownReviewIdsRef.current.add(String(r.id).trim());
      });
      initialReviewsLoadDoneRef.current = true;
      setReviews(incomingReviews);
      return;
    }

    const newRevs = incomingReviews.filter(r => {
      if (!r || !r.id) return false;
      const cleanId = String(r.id).trim();
      return !knownReviewIdsRef.current.has(cleanId);
    });

    if (newRevs.length > 0) {
      newRevs.forEach(r => knownReviewIdsRef.current.add(String(r.id).trim()));

      const latest = newRevs[0];
      setNewReviewAlert({
        review: latest,
        count: newRevs.length,
        receivedAt: new Date()
      });

      notifyAdminNewReview(latest, newRevs.length);
    }

    setReviews(incomingReviews);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodsRes, catsRes, dealsRes, ordersRes, statsRes, settingsRes, reviewsRes, ridersRes] = await Promise.all([
        fetch(apiUrl('/api/products')).then(r => r.json()),
        fetch(apiUrl('/api/categories')).then(r => r.json()),
        fetch(apiUrl('/api/deals')).then(r => r.json()),
        fetch(apiUrl('/api/orders')).then(r => r.json()),
        fetch(apiUrl('/api/stats')).then(r => r.json()),
        fetch(apiUrl('/api/settings')).then(r => r.json()).catch(() => ({ deliveryFee: 100 })),
        fetch(apiUrl('/api/reviews')).then(r => r.json()).catch(() => []),
        fetch(apiUrl('/api/riders')).then(r => r.json()).catch(() => [])
      ]);

      setProducts(prodsRes || []);
      setCategories(catsRes || []);
      setDeals(dealsRes?.deals || []);
      setFamilyDeal(dealsRes?.familyDeal || null);
      if (ordersRes) processIncomingOrders(ordersRes);
      if (reviewsRes) processIncomingReviews(reviewsRes);
      setRiders(ridersRes || []);
      setStats(statsRes || {});
      if (settingsRes && typeof settingsRes.deliveryFee === 'number') {
        setSettings(settingsRes);
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Fast 3-second live polling for immediate new orders and reviews
    const pollUpdates = () => {
      fetch(apiUrl('/api/orders'))
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            processIncomingOrders(data);
          }
        })
        .catch(() => {});

      fetch(apiUrl('/api/reviews'))
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            processIncomingReviews(data);
          }
        })
        .catch(() => {});
    };

    const interval = setInterval(pollUpdates, 3000);

    const onFocusOrVisible = () => {
      pollUpdates();
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    // Request notification permissions for Android Native & Web
    requestNotificationPermission().catch(() => {});

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [soundEnabled]);

  return (
    <div className="min-h-screen bg-[#d5d8de] text-zinc-900 mobile-app-container is-mobile-app">
      
      {/* Real-time New Order Popup / Notification Banner */}
      {newOrderAlert && (
        <div className="fixed top-3 inset-x-0 mx-auto z-50 w-[94%] max-w-md animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white/98 backdrop-blur-md border-2 border-orange-500 rounded-2xl p-3.5 sm:p-4 shadow-2xl text-zinc-900 ring-4 ring-orange-500/20">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center animate-bounce shadow-xs shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-montserrat text-xs sm:text-sm font-extrabold uppercase text-orange-600 leading-none truncate">
                      New Order Received!
                    </h3>
                    {newOrderAlert.count > 1 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold shrink-0">
                        +{newOrderAlert.count - 1} more
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-semibold mt-0.5 block truncate">
                    #{newOrderAlert.order.id} • Just now
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={toggleSound}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                  title={soundEnabled ? 'Mute Chime' : 'Unmute Chime'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-orange-600" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setNewOrderAlert(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                  title="Dismiss Alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Order Details Preview */}
            <div className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 min-w-0">
                <div className="font-bold text-zinc-900 truncate">
                  👤 {newOrderAlert.order.customer?.name || newOrderAlert.order.customerName || 'Customer'}
                  {(newOrderAlert.order.customer?.phone || newOrderAlert.order.customerPhone) && (
                    <span className="text-zinc-500 font-normal text-[11px] ml-1.5">
                      ({newOrderAlert.order.customer?.phone || newOrderAlert.order.customerPhone})
                    </span>
                  )}
                </div>
                <div className="text-zinc-600 text-[11px] truncate">
                  🍽️ {(newOrderAlert.order.items || []).map(it => `${it.quantity}x ${it.name}`).join(', ') || 'Order items'}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-extrabold text-emerald-600">
                  Rs. {formatPrice(newOrderAlert.order.total || 0)}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {newOrderAlert.order.status || 'Pending'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  switchTab('orders');
                  setTimeFilterMode('all');
                  setNewOrderAlert(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>View & Manage Order</span>
              </button>

              <button
                type="button"
                onClick={() => setNewOrderAlert(null)}
                className="py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs active:scale-98 transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time New Review Alert Popup / Notification Banner */}
      {newReviewAlert && (
        <div className="fixed top-3 inset-x-0 mx-auto z-50 w-[94%] max-w-md animate-in slide-in-from-top-4 duration-300">
          <div className="bg-white/98 backdrop-blur-md border-2 border-amber-500 rounded-2xl p-3.5 sm:p-4 shadow-2xl text-zinc-900 ring-4 ring-amber-500/20">
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center animate-bounce shadow-xs shrink-0">
                  <Star className="w-4 h-4 fill-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-montserrat text-xs sm:text-sm font-extrabold uppercase text-amber-600 leading-none truncate">
                      New Review Received!
                    </h3>
                    {newReviewAlert.count > 1 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                        +{newReviewAlert.count - 1} more
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-semibold mt-0.5 block truncate">
                    {newReviewAlert.review.orderId ? `Order #${newReviewAlert.review.orderId} • ` : ''}Just now
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setNewReviewAlert(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                  title="Dismiss Alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Review Details Preview */}
            <div className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 min-w-0">
                <div className="font-bold text-zinc-900 truncate">
                  👤 {newReviewAlert.review.author || newReviewAlert.review.name || 'Customer'}
                </div>
                <div className="text-zinc-600 text-[11px] truncate italic">
                  {newReviewAlert.review.text && newReviewAlert.review.text !== '-' ? `"${newReviewAlert.review.text}"` : 'No written comment'}
                </div>
              </div>

              <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
                {[...Array(Number(newReviewAlert.review.rating) || 5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  switchTab('reviews');
                  setNewReviewAlert(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-white" />
                <span>Manage Reviews</span>
              </button>

              <button
                type="button"
                onClick={() => setNewReviewAlert(null)}
                className="py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs active:scale-98 transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar (hidden when viewing receipt) */}
      {!isReceiptOpen && (
        <header className="bg-white/95 backdrop-blur-md border-b border-zinc-200 text-zinc-900 sticky top-0 z-30 shadow-xs admin-app-header">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2.5">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-orange-500 bg-orange-50 shadow-xs shrink-0 flex items-center justify-center">
                <img
                  src="/assets/salik-logo.png"
                  alt="Salik Fast Food"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/assets/salik-logo.svg';
                  }}
                />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h1 className="font-montserrat tracking-tight text-lg font-bold leading-tight flex items-center gap-1.5 text-zinc-900 truncate">
                  SALIK <span className="text-orange-500">FAST FOOD</span>
                </h1>
                <span className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1 mt-0.5 leading-tight truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block shrink-0" />
                  <span className="text-orange-600 font-bold uppercase tracking-wider text-[10px]">Store Administrator</span>
                </span>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Sound Alert Toggle */}
              <button
                onClick={toggleSound}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xs"
                title={soundEnabled ? 'Order Sound Alert: ON (Click to mute)' : 'Order Sound Alert: MUTED (Click to unmute)'}
                aria-label="Toggle Sound Alert"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-orange-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              <button
                onClick={fetchData}
                disabled={loading}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-2xs"
                title="Refresh Data"
                aria-label="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : ''}`} />
              </button>

              {APP_MODE !== 'admin' && (
                <button
                  onClick={() => setShowStorefrontConfirm(true)}
                  className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-xs font-bold text-zinc-800 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs"
                  title="Go to Storefront"
                  aria-label="Storefront"
                >
                  <Store className="w-4 h-4 text-orange-600 shrink-0" />
                  <span className="hidden md:inline">Storefront</span>
                </button>
              )}

              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold text-red-600 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs"
                title="Logout of Admin Panel"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-2 pb-6 space-y-3.5 sm:space-y-6">
        
        {/* Stats Section with Detailed Time Filter */}
        <div className="space-y-2.5 sm:space-y-3">
          {/* Detailed Time Filter Card */}
          <div className="bg-white border border-zinc-300/80 rounded-2xl p-2 sm:p-2.5 shadow-2xs space-y-2">
            {/* Top Row: 4 Mode Buttons + Small Cross (✕) Reset Button */}
            <div className="flex items-center gap-1.5 w-full">
              <div className="grid grid-cols-4 gap-1.5 flex-1">
                <button
                  type="button"
                  onClick={() => setTimeFilterMode('today')}
                  className={`w-full py-1.5 sm:py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer text-center select-none active:scale-[0.98] ${
                    timeFilterMode === 'today'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-zinc-100 hover:bg-zinc-200/90 text-zinc-700 border border-zinc-200/80'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilterMode('monthly')}
                  className={`w-full py-1.5 sm:py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer text-center select-none active:scale-[0.98] ${
                    timeFilterMode === 'monthly'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-zinc-100 hover:bg-zinc-200/90 text-zinc-700 border border-zinc-200/80'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilterMode('annual')}
                  className={`w-full py-1.5 sm:py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer text-center select-none active:scale-[0.98] ${
                    timeFilterMode === 'annual'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-zinc-100 hover:bg-zinc-200/90 text-zinc-700 border border-zinc-200/80'
                  }`}
                >
                  Annual
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilterMode('all')}
                  className={`w-full py-1.5 sm:py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer text-center select-none active:scale-[0.98] ${
                    timeFilterMode === 'all'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-zinc-100 hover:bg-zinc-200/90 text-zinc-700 border border-zinc-200/80'
                  }`}
                >
                  All Time
                </button>
              </div>

              {/* Small Cross (✕) Reset Button to quickly return to default (Today / current date) */}
              {!isDefaultFilter && (
                <button
                  type="button"
                  onClick={resetToDefaultFilter}
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all cursor-pointer active:scale-90 shadow-2xs shrink-0"
                  title="Reset to default (Today - current date)"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Detailed Controls Row */}
            {timeFilterMode === 'today' && (
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>Date:</span>
                  </span>

                  {/* Quick Date buttons */}
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayLocalStr)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedDate === todayLocalStr
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const y = new Date();
                      y.setDate(y.getDate() - 1);
                      setSelectedDate(getLocalDateStr(y));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      (() => {
                        const y = new Date();
                        y.setDate(y.getDate() - 1);
                        return selectedDate === getLocalDateStr(y);
                      })()
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    Yesterday
                  </button>

                  {/* Previous Day Step Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const curr = new Date(selectedDate + 'T00:00:00');
                      curr.setDate(curr.getDate() - 1);
                      setSelectedDate(getLocalDateStr(curr));
                    }}
                    className="p-1 sm:p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer border border-zinc-200/80"
                    title="Previous Day"
                    aria-label="Previous Day"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Date Picker Button with Calendar overlay */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleOpenDatePicker}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all cursor-pointer select-none ${
                      selectedDate !== todayLocalStr
                        ? 'bg-orange-50 border-orange-400 text-orange-950 font-bold shadow-2xs ring-1 ring-orange-500/20'
                        : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                    }`}
                    title="Click to pick a specific date from calendar"
                  >
                    <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0 pointer-events-none" />
                    <span className="font-bold text-zinc-900 pointer-events-none">
                      {formatToDDMMYY(selectedDate)}
                    </span>
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={selectedDate}
                      max={todayLocalStr}
                      onClick={(e) => {
                        try {
                          if (typeof e.target.showPicker === 'function') {
                            e.target.showPicker();
                          }
                        } catch (err) {}
                      }}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDate(e.target.value);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10 admin-date-picker-input"
                      title="Pick a date from calendar"
                    />
                  </div>

                  {/* Next Day Step Button */}
                  <button
                    type="button"
                    disabled={selectedDate >= todayLocalStr}
                    onClick={() => {
                      const curr = new Date(selectedDate + 'T00:00:00');
                      curr.setDate(curr.getDate() + 1);
                      const nextStr = getLocalDateStr(curr);
                      if (nextStr <= todayLocalStr) {
                        setSelectedDate(nextStr);
                      }
                    }}
                    className="p-1 sm:p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer border border-zinc-200/80 disabled:opacity-30 disabled:pointer-events-none"
                    title="Next Day"
                    aria-label="Next Day"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {timeFilterMode === 'monthly' && (
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>Month:</span>
                  </span>

                  {/* Month Dropdown */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-orange-300 bg-orange-50 text-orange-950 font-bold shadow-2xs">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-1 text-zinc-900"
                    >
                      {MONTH_NAMES.map((mName, idx) => (
                        <option key={idx} value={idx}>
                          {mName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year Dropdown */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800 font-semibold">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Year:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-1 text-zinc-900"
                    >
                      {availableYears.map(y => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {timeFilterMode === 'annual' && (
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>Year:</span>
                  </span>

                  {/* Year Dropdown */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-orange-300 bg-orange-50 text-orange-950 font-bold shadow-2xs">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-1 text-zinc-900"
                    >
                      {availableYears.map(y => (
                        <option key={y} value={y}>
                          {y} (Full Year)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {timeFilterMode === 'all' && (
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] font-semibold text-zinc-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Viewing all-time orders & total statistics
                </span>
                <span className="text-[11px] font-bold text-zinc-800">
                  {dateFilteredOrders.length} {dateFilteredOrders.length === 1 ? 'order' : 'orders'}
                </span>
              </div>
            )}
          </div>

          {/* Stats Cards Row (3-Card Layout: Orders, Pending, Revenue) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            
            {/* 1. Orders */}
            <div className="bg-white rounded-2xl p-2.5 sm:p-4 border border-zinc-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] text-zinc-500 font-bold uppercase tracking-wider block truncate">
                  Orders
                </span>
                <span className="font-sans text-base sm:text-2xl text-zinc-900 font-bold block leading-tight">
                  {displayStats.totalOrders}
                </span>
              </div>
            </div>

            {/* 2. Pending */}
            <div className="bg-white rounded-2xl p-2.5 sm:p-4 border border-zinc-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] text-zinc-500 font-bold uppercase tracking-wider block truncate">
                  Pending
                </span>
                <span className="font-sans text-base sm:text-2xl text-amber-600 font-bold block leading-tight">
                  {displayStats.pendingOrders}
                </span>
              </div>
            </div>

            {/* 3. Revenue */}
            <div className="bg-white rounded-2xl p-2.5 sm:p-4 border border-zinc-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] text-zinc-500 font-bold uppercase tracking-wider block truncate">
                  Revenue
                </span>
                <span className="font-sans text-xs sm:text-xl font-bold text-emerald-700 block leading-tight truncate">
                  Rs. {formatPrice(displayStats.totalRevenue)}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Tab Navigation (Orders first, Menu second) */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:items-center gap-2 sm:gap-2.5 border-b border-zinc-300/80 pb-2.5 sm:pb-3 w-full">
          <button
            onClick={() => switchTab('orders')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <ShoppingBag className="w-4 h-4 flex-shrink-0" />
            <span>Orders ({pendingOrdersCount})</span>
            {pendingOrdersCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            )}
          </button>

          <button
            onClick={() => switchTab('products')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'products'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <Package className="w-4 h-4 flex-shrink-0" />
            <span>Menu ({products.length})</span>
          </button>

          <button
            onClick={() => switchTab('deals')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'deals'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <Flame className="w-4 h-4 flex-shrink-0" />
            <span>Deals ({totalDealsCount})</span>
          </button>

          <button
            onClick={() => switchTab('sales')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            <span>Sales ({totalItemsSold})</span>
          </button>

          <button
            onClick={() => switchTab('riders')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'riders'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <Bike className="w-4 h-4 flex-shrink-0" />
            <span>Riders ({riders.length})</span>
          </button>

          <button
            onClick={() => switchTab('reviews')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <Star className="w-4 h-4 flex-shrink-0" />
            <span>Reviews ({reviews.length})</span>
          </button>

          <button
            onClick={() => switchTab('settings')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'settings' || activeTab === 'delivery'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Settings</span>
          </button>
        </div>


        {/* Tab Content with Smooth Fade-in Transition */}
        <div key={activeTab} className="animate-fade-in">
          {activeTab === 'products' && (
            <ProductManager
              products={products}
              categories={categories}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersManager
              orders={dateFilteredOrders}
              allOrders={orders}
              totalPendingCount={pendingOrdersCount}
              pendingOutsideTodayCount={pendingOutsideCount}
              onResetToAllPending={() => {
                setTimeFilterMode('all');
              }}
              products={products}
              deals={deals}
              familyDeal={familyDeal}
              settings={settings}
              riders={riders}
              onRefresh={fetchData}
              onReceiptOpenChange={setIsReceiptOpen}
            />
          )}

          {activeTab === 'deals' && (
            <DealsManager
              deals={deals}
              familyDeal={familyDeal}
              products={products}
              categories={categories}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'sales' && (
            <ItemSalesManager
              orders={orders}
              products={products}
              deals={deals}
              familyDeal={familyDeal}
            />
          )}

          {activeTab === 'riders' && (
            <RidersManager
              riders={riders}
              orders={orders}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'reviews' && (
            <ReviewManager
              reviews={reviews}
              onRefresh={fetchData}
            />
          )}

          {(activeTab === 'settings' || activeTab === 'delivery') && (
            <DeliverySettingsManager
              onRefresh={fetchData}
            />
          )}
        </div>

      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95 duration-150 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-900">
                Confirm Logout
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Are you sure you want to log out of the Salik Fast Food Management Panel?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Yes, Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Storefront Navigation Confirmation Modal */}
      {showStorefrontConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowStorefrontConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95 duration-150 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto">
              <Store className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-900">
                Go to Storefront?
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Are you sure you want to leave the admin panel and return to the customer food store?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowStorefrontConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowStorefrontConfirm(false);
                  onBackToStore();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Store className="w-4 h-4" />
                <span>Yes, Go to Store</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
