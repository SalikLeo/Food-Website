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
  ChevronRight,
  ChevronDown,
  Bell
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import WhatsAppIcon from '../WhatsAppIcon';
import { apiUrl } from '../../config/api';
import { formatPrice, getLocalDateStr } from '../../utils/formatters';
import { getSocket } from '../../services/socketService';
import { updateSystemBarsTheme } from '../../utils/systemBars';
import {
  requestNotificationPermission,
  notifyRiderNewAssignment,
  notifyRiderOrderUpdate
} from '../../services/notificationService';

export default function RiderDashboard({ rider, onLogout, onBackToStore }) {
  const cacheKey = `salik_rider_cache_${rider?.id || rider?.phone || 'default'}`;
  const initialCache = (() => {
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  })();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [activeOrders, setActiveOrders] = useState(initialCache?.activeOrders || []);
  const [completedOrders, setCompletedOrders] = useState(initialCache?.completedOrders || []);
  const [stats, setStats] = useState(initialCache?.stats || {
    activeCount: 0,
    activeCashToCollect: 0,
    todayDeliveries: 0,
    todayCash: 0,
    allTimeDeliveries: 0,
    allTimeCash: 0
  });
  const [loading, setLoading] = useState(!initialCache);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [expandedItemsOrders, setExpandedItemsOrders] = useState({});
  const [riderAlert, setRiderAlert] = useState(null);

  const toggleItemsExpand = (orderId) => {
    setExpandedItemsOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Auto-dismiss in-app notification banner after 7 seconds
  useEffect(() => {
    if (!riderAlert) return;
    const timer = setTimeout(() => {
      setRiderAlert(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [riderAlert]);

  // Request notification permissions & handle notification tap in native APK
  useEffect(() => {
    requestNotificationPermission().catch(() => {});

    let notifListener = null;
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
        const extra = event?.notification?.extra || {};
        setActiveTab('active');
        if (extra.orderId) {
          setExpandedItemsOrders(prev => ({ ...prev, [extra.orderId]: true }));
        }
      }).then(handle => {
        notifListener = handle;
      }).catch(() => {});
    }

    return () => {
      if (notifListener && typeof notifListener.remove === 'function') {
        notifListener.remove();
      }
    };
  }, []);

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
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Dark / Light Theme
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('salik_rider_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    updateSystemBarsTheme(isDark);
  }, [isDark]);

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

  // Track known active order IDs & statuses to detect new assignments and updates
  const knownActiveIdsRef = useRef(new Set((initialCache?.activeOrders || []).map(o => String(o.id).replace(/^#/, ''))));
  const knownActiveMetaRef = useRef(
    new Map(
      (initialCache?.activeOrders || []).map(o => [
        String(o.id).replace(/^#/, ''),
        { status: o.status, total: Number(o.total) || 0, customerName: o.customerName }
      ])
    )
  );
  const initialLoadRef = useRef(Boolean(initialCache));

  const fetchRiderData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const qRiderId = encodeURIComponent(String(rider?.id || ''));
      const qPhone = encodeURIComponent(String(rider?.phone || ''));
      const qName = encodeURIComponent(String(rider?.name || ''));
      const res = await fetch(apiUrl(`/api/rider/orders?riderId=${qRiderId}&phone=${qPhone}&name=${qName}&t=${Date.now()}`), {
        cache: 'no-store'
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        const newActives = data.activeOrders || [];
        const newCompleted = data.completedOrders || [];
        const newStats = data.stats || {
          activeCount: newActives.length,
          activeCashToCollect: 0,
          todayDeliveries: 0,
          todayCash: 0,
          allTimeDeliveries: 0,
          allTimeCash: 0
        };

        if (initialLoadRef.current) {
          // 1. Detect brand new assigned active orders
          const freshOrders = newActives.filter(
            o => o && o.id && !knownActiveIdsRef.current.has(String(o.id).replace(/^#/, ''))
          );
          if (freshOrders.length > 0) {
            const latest = freshOrders[0];
            const cleanId = String(latest.id).replace(/^#/, '');
            notifyRiderNewAssignment(latest, freshOrders.length, soundEnabledRef.current);
            setRiderAlert({
              type: 'new',
              orderId: cleanId,
              title: freshOrders.length > 1 ? `${freshOrders.length} New Deliveries Assigned!` : `New Delivery Assigned (#${cleanId})`,
              message: `${latest.customerName || 'Customer'} • Rs. ${formatPrice(latest.total)}${latest.address ? ` • ${latest.address}` : ''}`
            });
          } else {
            // 2. Detect status or bill changes on already-assigned active orders
            for (const o of newActives) {
              if (!o || !o.id) continue;
              const cleanId = String(o.id).replace(/^#/, '');
              const prev = knownActiveMetaRef.current.get(cleanId);
              if (!prev) continue;
              if (prev.status && o.status && prev.status !== o.status) {
                const title = `🛵 Order #${cleanId} Status Updated`;
                const body = `Order #${cleanId} for ${o.customerName || 'Customer'} is now "${o.status}".`;
                notifyRiderOrderUpdate(o, title, body, soundEnabledRef.current);
                setRiderAlert({
                  type: 'update',
                  orderId: cleanId,
                  title: `Order #${cleanId} • ${o.status}`,
                  message: `${o.customerName || 'Customer'} • Rs. ${formatPrice(o.total)}`
                });
                break;
              }
              if (Number(prev.total) !== (Number(o.total) || 0)) {
                const title = `💰 Order #${cleanId} Bill Updated`;
                const body = `Updated cash to collect for #${cleanId}: Rs. ${formatPrice(o.total)}.`;
                notifyRiderOrderUpdate(o, title, body, soundEnabledRef.current);
                setRiderAlert({
                  type: 'update',
                  orderId: cleanId,
                  title: `Order #${cleanId} Bill Updated`,
                  message: `New cash to collect: Rs. ${formatPrice(o.total)}`
                });
                break;
              }
            }

            // 3. Detect if an active order was cancelled or unassigned by Admin
            const currentActiveSet = new Set(newActives.map(o => String(o.id).replace(/^#/, '')));
            const completedSet = new Set(newCompleted.map(o => String(o.id).replace(/^#/, '')));
            for (const [oldId, oldMeta] of knownActiveMetaRef.current.entries()) {
              if (!currentActiveSet.has(oldId) && !completedSet.has(oldId)) {
                const title = `⚠️ Order #${oldId} Removed`;
                const body = `Order #${oldId} (${oldMeta.customerName || 'Customer'}) was cancelled or unassigned.`;
                notifyRiderOrderUpdate({ id: oldId }, title, body, soundEnabledRef.current);
                setRiderAlert({
                  type: 'warning',
                  orderId: oldId,
                  title: `Order #${oldId} Cancelled / Unassigned`,
                  message: `Order for ${oldMeta.customerName || 'Customer'} is no longer active.`
                });
                break;
              }
            }
          }
        }

        knownActiveIdsRef.current = new Set(newActives.map(o => String(o.id).replace(/^#/, '')));
        knownActiveMetaRef.current = new Map(
          newActives.map(o => [
            String(o.id).replace(/^#/, ''),
            { status: o.status, total: Number(o.total) || 0, customerName: o.customerName }
          ])
        );
        initialLoadRef.current = true;

        setActiveOrders(newActives);
        setCompletedOrders(newCompleted);
        setStats(newStats);

        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            activeOrders: newActives,
            completedOrders: newCompleted,
            stats: newStats,
            updatedAt: Date.now()
          }));
        } catch (e) {
          console.error('Cache save error:', e);
        }
      }
    } catch (err) {
      console.error('Error fetching rider data:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  const didInitialSyncRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (!didInitialSyncRef.current && initialCache) {
        didInitialSyncRef.current = true;
        const cachedList = [
          ...(initialCache.activeOrders || []),
          ...(initialCache.completedOrders || [])
        ].filter(o => o && o.id && Array.isArray(o.items) && o.items.length > 0);
        if (cachedList.length > 0) {
          try {
            await fetch(apiUrl('/api/orders/sync'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orders: cachedList })
            });
          } catch {}
        }
      }
      fetchRiderData();
    };
    init();

    // 1. Socket listener for instant updates (debounced so multi-event broadcasts only fetch once)
    const socket = getSocket();
    let debounceTimer = null;
    const handleOrderChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchRiderData(false);
      }, 250);
    };

    if (socket) {
      socket.on('orders:updated', handleOrderChange);
      socket.on('order:rider_assigned', handleOrderChange);
    }

    // 2. Gentle polling fallback every 20 seconds when visible
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchRiderData(false);
    }, 20000);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (socket) {
        socket.off('orders:updated', handleOrderChange);
        socket.off('order:rider_assigned', handleOrderChange);
      }
      clearInterval(intervalId);
    };
  }, [rider.id]);

  // Start Delivery (Transition order to Out for Delivery)
  const handleStartDelivery = async (orderId) => {
    try {
      const cleanId = String(orderId || '').replace(/^#/, '').trim();
      const targetOrder = (activeOrders || []).find(o => String(o?.id || '').replace(/^#/, '').trim() === cleanId) || null;
      const cleanOrderId = encodeURIComponent(cleanId);

      // Update known meta ahead of fetch so self-triggered status change doesn't double-notify
      const prevMeta = knownActiveMetaRef.current.get(cleanId);
      if (prevMeta) {
        knownActiveMetaRef.current.set(cleanId, { ...prevMeta, status: 'Out for Delivery' });
      }

      const res = await fetch(apiUrl(`/api/rider/orders/${cleanOrderId}/start-delivery`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riderId: rider.id,
          ...(targetOrder ? { order: targetOrder } : {})
        })
      });
      if (res.ok) {
        setRiderAlert({
          type: 'update',
          orderId: cleanId,
          title: `Order #${cleanId} Out for Delivery`,
          message: `Customer has been notified that you are on the way.`
        });
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
      const cleanId = String(deliveringOrder.id || '').replace(/^#/, '').trim();
      const cleanOrderId = encodeURIComponent(cleanId);

      // Remove from known active map ahead of fetch so it doesn't trigger a cancellation warning
      knownActiveIdsRef.current.delete(cleanId);
      knownActiveMetaRef.current.delete(cleanId);

      const res = await fetch(apiUrl(`/api/rider/orders/${cleanOrderId}/deliver`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riderId: rider.id,
          notes: deliveryNotes.trim(),
          order: deliveringOrder
        })
      });

      if (res.ok) {
        const collectedAmount = formatPrice(deliveringOrder.total);
        notifyRiderOrderUpdate(
          deliveringOrder,
          `✅ Order #${cleanId} Delivered!`,
          `Rs. ${collectedAmount} collected from ${deliveringOrder.customerName || 'Customer'}.`,
          soundEnabledRef.current
        );
        setRiderAlert({
          type: 'delivered',
          orderId: cleanId,
          title: `Order #${cleanId} Delivered!`,
          message: `Rs. ${collectedAmount} added to today's collected cash.`
        });
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
                {rider.phone} &bull; PIN: {rider.pin || '••••'}
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
              onClick={() => setShowLogoutConfirm(true)}
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
        {/* In-App Notification Banner */}
        {riderAlert && (
          <div
            onClick={() => {
              if (riderAlert.type !== 'delivered') {
                setActiveTab('active');
              }
              setRiderAlert(null);
            }}
            className={`p-3.5 rounded-2xl border shadow-lg flex items-center justify-between gap-3 cursor-pointer transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
              riderAlert.type === 'new'
                ? (isDark ? 'bg-orange-500/15 border-orange-500/40 text-orange-200' : 'bg-orange-50 border-orange-300 text-orange-950')
                : riderAlert.type === 'delivered'
                ? (isDark ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-950')
                : riderAlert.type === 'warning'
                ? (isDark ? 'bg-red-500/15 border-red-500/40 text-red-200' : 'bg-red-50 border-red-300 text-red-950')
                : (isDark ? 'bg-blue-500/15 border-blue-500/40 text-blue-200' : 'bg-blue-50 border-blue-300 text-blue-950')
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                riderAlert.type === 'new'
                  ? 'bg-orange-600 text-white'
                  : riderAlert.type === 'delivered'
                  ? 'bg-emerald-600 text-white'
                  : riderAlert.type === 'warning'
                  ? 'bg-red-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-sans font-bold text-xs sm:text-sm truncate">
                  {riderAlert.title}
                </p>
                <p className={`text-[11px] sm:text-xs font-medium truncate ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  {riderAlert.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRiderAlert(null);
              }}
              className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-black/5 text-zinc-500'
              }`}
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
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
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${
                  isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                }`}>
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
                const createdTime = order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
                const isItemsExpanded = Boolean(expandedItemsOrders[order.id]);

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
                        <span className="font-sans font-bold text-sm text-orange-600">
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

                      <div className={`flex items-center gap-1 text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
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
                          <p className={`text-xs font-sans font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            {order.phone}
                          </p>
                        </div>

                        {/* Direct Action Buttons: 1-Tap Call & 1-Tap WhatsApp */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {cleanPhone && (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-sm transition-all cursor-pointer"
                              title="Call Customer"
                            >
                              <Phone className="w-5 h-5" />
                            </a>
                          )}

                          {cleanPhone && (
                            <a
                              href={getWhatsAppLink(cleanPhone, cleanId, order.total)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <WhatsAppIcon className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className={`p-3 rounded-2xl border flex items-start justify-between gap-3 ${
                        isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                      }`}>
                        <div className="flex items-start gap-2 min-w-0">
                          <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              Delivery Address
                            </span>
                            <p className={`text-xs sm:text-sm font-semibold leading-snug break-words ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
                              {order.address || 'Address not provided'}
                            </p>
                            {order.notes && (
                              <p className={`text-xs font-medium mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                Note: {order.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ordered Items Summary (Collapsible via View / Hide button) */}
                      <div className={`p-3 rounded-2xl border transition-all ${
                        isDark ? 'bg-zinc-950/40 border-zinc-800/80' : 'bg-zinc-50/70 border-zinc-200/80'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            Included Items ({(order.items || []).length})
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleItemsExpand(order.id)}
                            className={`h-7 flex items-center gap-1 px-2.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer active:scale-95 shrink-0 ${
                              isDark
                                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                                : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-700 shadow-2xs'
                            }`}
                            title={isItemsExpanded ? 'Hide Items' : 'View Items'}
                          >
                            <span>{isItemsExpanded ? 'Hide' : 'View'}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isItemsExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </div>

                        {isItemsExpanded && (
                          <div className={`mt-2.5 pt-2.5 border-t space-y-1.5 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                            {(order.items || []).map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                                <span className={`font-semibold truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                  {it.quantity || 1}x {it.name}
                                  {it.size && <span className={`ml-1 font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>({it.size})</span>}
                                </span>
                                <span className={`font-sans font-semibold shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                                  Rs. {formatPrice(it.price * (it.quantity || 1))}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Total Bill / Cash to Collect */}
                      <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-orange-50/60 border-orange-200'
                      }`}>
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            Payment Method
                          </span>
                          <span className={`text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                            {order.paymentMethod || 'Cash on Delivery'}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                            Cash to Collect
                          </span>
                          <span className="text-lg sm:text-xl font-sans font-bold text-emerald-600">
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
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border ${
                  isDark ? 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                }`}>
                  <Receipt className="w-6 h-6 text-zinc-400" />
                </div>
                <h3 className={`text-base font-bold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
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
                  ? new Date(deliveredDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', hour12: true })
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
                        <span className="font-sans font-bold text-xs text-orange-600">
                          #{cleanId}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Delivered
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm truncate">{order.customerName || 'Customer'}</h4>
                      <p className={`text-[11px] truncate ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{order.address}</p>
                      <span className="text-[10px] text-zinc-500 mt-1 block">
                        {formattedTime}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        Collected
                      </span>
                      <span className="font-sans font-bold text-sm sm:text-base text-emerald-600">
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

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className={`rounded-2xl max-w-sm w-full p-6 shadow-2xl border space-y-4 animate-in zoom-in-95 duration-150 text-center ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold">
                Confirm Logout
              </h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Are you sure you want to end your shift and log out of the rider app?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>Yes, Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
