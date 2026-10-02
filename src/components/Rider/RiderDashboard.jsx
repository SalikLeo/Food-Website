import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bike,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  CheckCircle2,
  Package,
  RefreshCw,
  LogOut,
  Navigation,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Check,
  AlertCircle,
  ShoppingBag,
  Wallet,
  Receipt,
  ArrowRight,
  Loader2,
  X,
  ChevronRight
} from 'lucide-react';
import { apiUrl } from '../../config/api';
import { formatPrice, getLocalDateStr } from '../../utils/formatters';
import { getSocket } from '../../services/socketService';

export default function RiderDashboard({ rider, onLogout, onBackToStore }) {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [stats, setStats] = useState({
    activeCount: 0,
    activeCashToCollect: 0,
    todayDeliveries: 0,
    todayCash: 0,
    allTimeDeliveries: 0,
    allTimeCash: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Delivery Action Modal State
  const [deliveringOrder, setDeliveringOrder] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

  // Sound alert
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_rider_sound');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Dark / Light Theme
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('salik_rider_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('salik_rider_theme', next);
    } catch {}
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem('salik_rider_sound', String(next));
    } catch {}
    if (next) {
      playAlertSound();
    }
  };

  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      // Upbeat 3-note alert chime
      const notes = [
        { freq: 587.33, time: now, dur: 0.15 }, // D5
        { freq: 739.99, time: now + 0.14, dur: 0.15 }, // F#5
        { freq: 880.00, time: now + 0.28, dur: 0.35 }  // A5
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
      console.warn('Audio error:', e);
    }
  };

  // Track known active order IDs to detect new assignments
  const knownActiveIdsRef = useRef(new Set());
  const initialLoadRef = useRef(false);

  const fetchRiderData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(apiUrl(`/api/rider/orders?riderId=${rider.id}&t=${Date.now()}`), {
        cache: 'no-store'
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        const newActives = data.activeOrders || [];

        // Check if a brand new active order arrived
        if (initialLoadRef.current) {
          const freshOrders = newActives.filter(o => !knownActiveIdsRef.current.has(String(o.id)));
          if (freshOrders.length > 0 && soundEnabled) {
            playAlertSound();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          }
        }

        knownActiveIdsRef.current = new Set(newActives.map(o => String(o.id)));
        initialLoadRef.current = true;

        setActiveOrders(newActives);
        setCompletedOrders(data.completedOrders || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching rider data:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRiderData();

    // 1. Socket listener for instant updates
    const socket = getSocket();
    const handleOrderChange = () => {
      fetchRiderData();
    };

    if (socket) {
      socket.on('order:updated', handleOrderChange);
      socket.on('order:status_updated', handleOrderChange);
      socket.on('order:rider_assigned', handleOrderChange);
      socket.on('orders:updated', handleOrderChange);
    }

    // 2. Polling fallback every 5 seconds
    const intervalId = setInterval(() => {
      fetchRiderData();
    }, 5000);

    return () => {
      if (socket) {
        socket.off('order:updated', handleOrderChange);
        socket.off('order:status_updated', handleOrderChange);
        socket.off('order:rider_assigned', handleOrderChange);
        socket.off('orders:updated', handleOrderChange);
      }
      clearInterval(intervalId);
    };
  }, [rider.id, soundEnabled]);

  // Start Delivery (Transition order to Out for Delivery)
  const handleStartDelivery = async (orderId) => {
    try {
      const res = await fetch(apiUrl(`/api/rider/orders/${orderId}/start-delivery`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId: rider.id })
      });
      if (res.ok) {
        fetchRiderData(true);
      }
    } catch (err) {
      alert('Network error while starting delivery');
    }
  };

  // Complete Delivery
  const handleConfirmDelivered = async (e) => {
    e.preventDefault();
    if (!deliveringOrder) return;
    setIsSubmittingDelivery(true);

    try {
      const res = await fetch(apiUrl(`/api/rider/orders/${deliveringOrder.id}/deliver`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riderId: rider.id,
          notes: deliveryNotes.trim()
        })
      });

      if (res.ok) {
        setDeliveringOrder(null);
        setDeliveryNotes('');
        fetchRiderData(true);
      } else {
        alert('Failed to mark order as delivered.');
      }
    } catch (err) {
      alert('Network error while marking order delivered.');
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  const getCleanPhone = (p) => {
    if (!p) return '';
    const digits = String(p).replace(/\D/g, '');
    if (digits.startsWith('92') && digits.length === 12) {
      return '0' + digits.slice(2);
    }
    return digits;
  };

  const getWhatsAppLink = (p, orderId, total) => {
    const rawDigits = String(p || '').replace(/\D/g, '');
    let intl = rawDigits;
    if (rawDigits.startsWith('03') && rawDigits.length === 11) {
      intl = '92' + rawDigits.slice(1);
    }
    const msg = encodeURIComponent(
      `Assalam o Alaikum! I am ${rider.name} from Salik Fast Food. I am delivering your Order #${String(orderId).replace(/^#/, '')} (Bill: Rs. ${formatPrice(total)}). Please confirm your exact location.`
    );
    return `https://wa.me/${intl}?text=${msg}`;
  };

  const getMapLink = (address) => {
    const query = encodeURIComponent(`${address}, Wah Cantt`);
    return `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  };

  return (
    <div className={`min-h-screen font-sans select-none transition-colors duration-200 ${
      isDark ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-900'
    }`}>
      {/* Top Fixed Header */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md ${
        isDark ? 'bg-zinc-900/90 border-zinc-800/80 text-white' : 'bg-white/90 border-zinc-200 text-zinc-900 shadow-2xs'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-600/30">
              <Bike className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-sm sm:text-base truncate">{rider.name}</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                  On Duty
                </span>
              </div>
              <p className={`text-[11px] font-medium truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {rider.phone} &bull; PIN: <span className="font-mono">{rider.pin || '••••'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                soundEnabled
                  ? (isDark ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-600')
                  : (isDark ? 'bg-zinc-800/60 border-zinc-700 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-500')
              }`}
              title={soundEnabled ? 'Alert Sound On' : 'Alert Sound Off'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark ? 'bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchRiderData(true)}
              disabled={refreshing}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark ? 'bg-zinc-800/60 border-zinc-700 text-zinc-300 hover:text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
              title="Logout from shift"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4 pb-20">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* 1. Active Deliveries */}
          <div className={`p-3 sm:p-4 rounded-2xl border transition-all ${
            activeOrders.length > 0
              ? (isDark ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200')
              : (isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200')
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Active
              </span>
              <Bike className={`w-4 h-4 ${activeOrders.length > 0 ? 'text-orange-500' : 'text-zinc-400'}`} />
            </div>
            <div className={`text-xl sm:text-2xl font-black ${activeOrders.length > 0 ? 'text-orange-500' : ''}`}>
              {activeOrders.length}
            </div>
            <div className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
              Rs. {formatPrice(stats.activeCashToCollect)} to collect
            </div>
          </div>

          {/* 2. Today Deliveries */}
          <div className={`p-3 sm:p-4 rounded-2xl border ${
            isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Delivered Today
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-500">
              {stats.todayDeliveries}
            </div>
            <div className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
              {stats.allTimeDeliveries} all-time
            </div>
          </div>

          {/* 3. Today Cash Collected */}
          <div className={`p-3 sm:p-4 rounded-2xl border ${
            isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Cash Today
              </span>
              <Wallet className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-amber-500 truncate">
              Rs. {formatPrice(stats.todayCash)}
            </div>
            <div className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
              Total collected
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex rounded-2xl p-1 border ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200/80 border-zinc-300'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'active'
                ? 'bg-orange-600 text-white shadow-sm'
                : (isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900')
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>Active Deliveries ({activeOrders.length})</span>
            {activeOrders.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-orange-600 text-white shadow-sm'
                : (isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900')
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Delivered History ({completedOrders.length})</span>
          </button>
        </div>

        {/* Active Deliveries Tab */}
        {activeTab === 'active' && (
          <div className="space-y-3">
            {activeOrders.length === 0 ? (
              <div className={`text-center py-12 px-4 rounded-3xl border border-dashed ${
                isDark ? 'bg-zinc-900/40 border-zinc-800 text-zinc-500' : 'bg-white border-zinc-300 text-zinc-400'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-zinc-800/40 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className={`text-base font-bold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  All Caught Up!
                </h3>
                <p className="text-xs max-w-sm mx-auto mt-1">
                  No active orders currently assigned to you. New delivery assignments will alert you automatically!
                </p>
              </div>
            ) : (
              activeOrders.map((order) => {
                const cleanId = String(order.id).replace(/^#/, '');
                const cleanPhone = getCleanPhone(order.phone);
                const isOutForDelivery = order.status === 'Out for Delivery';
                const createdTime = order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                return (
                  <div
                    key={order.id}
                    className={`rounded-3xl border transition-all overflow-hidden shadow-sm ${
                      isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                  >
                    {/* Card Top Strip: Order ID, Status, Timestamp */}
                    <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 flex-wrap ${
                      isDark ? 'border-zinc-800/80 bg-zinc-900' : 'border-zinc-100 bg-zinc-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-orange-500">
                          #{cleanId}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isOutForDelivery
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}>
                          {order.status || 'Preparing'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-zinc-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{createdTime}</span>
                      </div>
                    </div>

                    {/* Card Body: Customer Info & Address */}
                    <div className="p-4 sm:p-5 space-y-3.5">
                      {/* Customer Name & Phone */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-black text-base tracking-tight">{order.customerName || 'Customer'}</h4>
                          <p className={`text-xs font-mono font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {order.phone}
                          </p>
                        </div>

                        {/* Direct Action Buttons: 1-Tap Call & 1-Tap WhatsApp */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {cleanPhone && (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              title="Call Customer"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span className="hidden xs:inline">Call</span>
                            </a>
                          )}

                          {cleanPhone && (
                            <a
                              href={getWhatsAppLink(cleanPhone, cleanId, order.total)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Delivery Address & 1-Tap Google Maps */}
                      <div className={`p-3 rounded-2xl border flex items-start justify-between gap-3 ${
                        isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                      }`}>
                        <div className="flex items-start gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                              Delivery Address
                            </span>
                            <p className="text-xs sm:text-sm font-semibold leading-snug break-words">
                              {order.address || 'Address not provided'}
                            </p>
                            {order.notes && (
                              <p className="text-xs text-amber-500 font-medium mt-1">
                                Note: {order.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {order.address && (
                          <a
                            href={getMapLink(order.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 shadow-sm transition-colors cursor-pointer"
                            title="Open in Google Maps"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Navigate</span>
                          </a>
                        )}
                      </div>

                      {/* Ordered Items Summary */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                          Included Items ({(order.items || []).length})
                        </span>
                        <div className="space-y-1">
                          {(order.items || []).map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                              <span className="font-semibold text-zinc-300 truncate">
                                {it.quantity || 1}x {it.name}
                                {it.size && <span className="text-orange-400 ml-1">({it.size})</span>}
                              </span>
                              <span className="font-mono text-zinc-400 shrink-0">
                                Rs. {formatPrice(it.price * (it.quantity || 1))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total Bill / Cash to Collect */}
                      <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-orange-50/60 border-orange-200'
                      }`}>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                            Payment Method
                          </span>
                          <span className="text-xs font-bold text-zinc-300">
                            {order.paymentMethod || 'Cash on Delivery'}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">
                            Cash to Collect
                          </span>
                          <span className="text-lg sm:text-xl font-black text-emerald-500 font-mono">
                            Rs. {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="pt-2 flex items-center gap-2">
                        {!isOutForDelivery && (
                          <button
                            type="button"
                            onClick={() => handleStartDelivery(order.id)}
                            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                          >
                            <Bike className="w-4 h-4" />
                            <span>Pick Up & Start Delivery</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setDeliveringOrder(order);
                            setDeliveryNotes('');
                          }}
                          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark as Delivered & Collected</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Completed History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {completedOrders.length === 0 ? (
              <div className={`text-center py-12 px-4 rounded-3xl border border-dashed ${
                isDark ? 'bg-zinc-900/40 border-zinc-800 text-zinc-500' : 'bg-white border-zinc-300 text-zinc-400'
              }`}>
                <Receipt className="w-10 h-10 mx-auto mb-2 text-zinc-500" />
                <h3 className="text-base font-bold uppercase tracking-wider text-zinc-400">
                  No Completed Deliveries Yet
                </h3>
                <p className="text-xs mt-1">
                  Deliveries marked as complete will appear in this history tab.
                </p>
              </div>
            ) : (
              completedOrders.map((order) => {
                const cleanId = String(order.id).replace(/^#/, '');
                const deliveredDate = order.deliveredAt || order.updatedAt || order.createdAt;
                const formattedTime = deliveredDate
                  ? new Date(deliveredDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                  : '';

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                      isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-zinc-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-xs text-orange-500">
                          #{cleanId}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Delivered
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm truncate">{order.customerName || 'Customer'}</h4>
                      <p className="text-[11px] text-zinc-400 truncate">{order.address}</p>
                      <span className="text-[10px] text-zinc-500 mt-1 block">
                        {formattedTime}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        Collected
                      </span>
                      <span className="font-mono font-bold text-sm sm:text-base text-emerald-500">
                        Rs. {formatPrice(order.total)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Confirm Delivery Modal */}
      {deliveringOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className={`relative max-w-md w-full rounded-3xl p-6 border shadow-2xl animate-in zoom-in-95 duration-150 ${
            isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="font-black text-xl uppercase tracking-wide text-center">
              Complete Delivery #{String(deliveringOrder.id).replace(/^#/, '')}?
            </h3>

            <p className={`text-xs text-center mt-1.5 mb-4 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Please confirm you have handed over the food and collected <strong>Rs. {formatPrice(deliveringOrder.total)}</strong> from <strong>{deliveringOrder.customerName}</strong>.
            </p>

            <form onSubmit={handleConfirmDelivered} className="space-y-4">
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Rider Note <span className="font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Handed to customer at gate"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-orange-500 ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingDelivery}
                  onClick={() => setDeliveringOrder(null)}
                  className={`flex-1 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider cursor-pointer ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDelivery}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDelivery ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Delivered</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
