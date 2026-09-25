import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiUrl } from '../config/api';
import { flyItemToCart } from '../utils/flyToCart';
import { formatPrice, cleanDealInclusions } from '../utils/formatters';
import { 
  requestNotificationPermission, 
  notifyCustomerOrderStatus, 
  getStatusNotificationDetails 
} from '../services/notificationService';
import { getStoredUserProfile, saveStoredUserProfile } from '../services/userProfile';
import { App as CapApp } from '@capacitor/app';

const CartContext = createContext();

const getSystemTheme = () => {
  try {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch (e) {
    // fallback
  }
  return 'light';
};

const getInitialTheme = () => {
  try {
    const manual = localStorage.getItem('salik_theme_manual_override');
    if (manual === 'light' || manual === 'dark') return manual;
    return getSystemTheme();
  } catch {
    return getSystemTheme();
  }
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_cart') || localStorage.getItem('mehrban_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState('profile');
  const [userProfile, setUserProfile] = useState(() => getStoredUserProfile());

  // Theme state: adapts to mobile/system theme by default, preserves manual toggle
  const [theme, setTheme] = useState(() => getInitialTheme());

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('salik_theme_manual_override', next);
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem('salik_app_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      window.dispatchEvent(new CustomEvent('salik_theme_changed', { detail: theme }));
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  // Adapt to mobile/system theme changes dynamically when no manual override is set
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e) => {
      try {
        const manual = localStorage.getItem('salik_theme_manual_override');
        if (!manual) {
          setTheme(e.matches ? 'dark' : 'light');
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleSystemChange);
      }
    };
  }, []);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'salik_theme_manual_override' || e.key === 'salik_app_theme') {
        const val = e.newValue;
        if (val === 'light' || val === 'dark') {
          setTheme(val);
        }
      }
    };
    const handleCustomTheme = (e) => {
      if (e?.detail === 'light' || e?.detail === 'dark') {
        setTheme(e.detail);
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('salik_theme_changed', handleCustomTheme);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('salik_theme_changed', handleCustomTheme);
    };
  }, []);

  useEffect(() => {
    const handleProfileUpdate = (e) => {
      if (e?.detail) {
        setUserProfile(e.detail);
      } else {
        setUserProfile(getStoredUserProfile());
      }
    };
    window.addEventListener('salik_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    return () => {
      window.removeEventListener('salik_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  const openProfileModal = (tab = 'profile') => {
    setProfileTab(tab);
    setIsProfileOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileOpen(false);
  };

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  const [recentOrders, setRecentOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_recent_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeOrderNotification, setActiveOrderNotification] = useState(null);
  const knownStatusesRef = useRef(new Map());
  const initialSyncDoneRef = useRef(false);

  const dismissOrderNotification = () => setActiveOrderNotification(null);

  useEffect(() => {
    try {
      localStorage.setItem('salik_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error(e);
    }
  }, [cartItems]);

  const getNotifiedStatuses = () => {
    try {
      const saved = localStorage.getItem('salik_notified_statuses');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  };

  const markStatusNotified = (orderId, status) => {
    try {
      const cleanId = String(orderId).replace(/^#/, '');
      const set = getNotifiedStatuses();
      set.add(`${cleanId}_${status}`);
      const arr = Array.from(set).slice(-100);
      localStorage.setItem('salik_notified_statuses', JSON.stringify(arr));
    } catch {}
  };

  const syncRecentOrders = async () => {
    try {
      const saved = localStorage.getItem('salik_recent_orders');
      const localOrders = saved ? JSON.parse(saved) : [];
      if (!localOrders || !Array.isArray(localOrders) || localOrders.length === 0) return;

      const res = await fetch(apiUrl(`/api/orders?_t=${Date.now()}`), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!res.ok) return;
      const serverOrders = await res.json();
      if (!Array.isArray(serverOrders) || serverOrders.length === 0) return;

      const serverMap = new Map();
      serverOrders.forEach(o => {
        if (!o || !o.id) return;
        const rawId = String(o.id).trim();
        const cleanId = rawId.replace(/^#/, '');
        serverMap.set(rawId, o);
        serverMap.set(cleanId, o);
      });

      const notifiedSet = getNotifiedStatuses();
      let hasChanges = false;

      const updated = localOrders.map(localOrder => {
        if (!localOrder || !localOrder.id) return localOrder;
        const rawId = String(localOrder.id).trim();
        const cleanId = rawId.replace(/^#/, '');
        const serverOrder = serverMap.get(rawId) || serverMap.get(cleanId);
        
        if (serverOrder) {
          const currentServerStatus = String(serverOrder.status || localOrder.status || '').trim();
          const localStatus = String(localOrder.status || 'Pending').trim();
          const statusChanged = currentServerStatus && currentServerStatus !== localStatus;
          const totalChanged = serverOrder.total !== undefined && Number(serverOrder.total) !== Number(localOrder.total);
          const feeChanged = serverOrder.deliveryFee !== undefined && Number(serverOrder.deliveryFee) !== Number(localOrder.deliveryFee);
          const subtotalChanged = serverOrder.subtotal !== undefined && Number(serverOrder.subtotal) !== Number(localOrder.subtotal);

          const statusNotifyKey = `${cleanId}_${currentServerStatus}`;

          // Instant notification if order progressed to Preparing, Out for Delivery, Delivered, or Cancelled
          // and hasn't notified yet on this device
          if (currentServerStatus && currentServerStatus !== 'Pending' && !notifiedSet.has(statusNotifyKey)) {
            markStatusNotified(cleanId, currentServerStatus);
            notifiedSet.add(statusNotifyKey);

            const details = getStatusNotificationDetails(currentServerStatus, cleanId, serverOrder.riderName);
            setActiveOrderNotification({
              order: { ...localOrder, ...serverOrder },
              oldStatus: localStatus,
              newStatus: currentServerStatus,
              details,
              receivedAt: new Date()
            });
            notifyCustomerOrderStatus(serverOrder, localStatus, currentServerStatus);
          }

          const riderChanged = serverOrder.riderId !== localOrder.riderId ||
            serverOrder.riderName !== localOrder.riderName ||
            serverOrder.riderPhone !== localOrder.riderPhone;

          if (statusChanged || totalChanged || feeChanged || subtotalChanged || riderChanged) {
            hasChanges = true;
            return {
              ...localOrder,
              status: serverOrder.status || localOrder.status,
              total: serverOrder.total !== undefined ? serverOrder.total : localOrder.total,
              deliveryFee: serverOrder.deliveryFee !== undefined ? serverOrder.deliveryFee : localOrder.deliveryFee,
              subtotal: serverOrder.subtotal !== undefined ? serverOrder.subtotal : localOrder.subtotal,
              items: serverOrder.items && serverOrder.items.length > 0 ? serverOrder.items : localOrder.items,
              riderId: serverOrder.riderId !== undefined ? serverOrder.riderId : localOrder.riderId,
              riderName: serverOrder.riderName !== undefined ? serverOrder.riderName : localOrder.riderName,
              riderPhone: serverOrder.riderPhone !== undefined ? serverOrder.riderPhone : localOrder.riderPhone,
              updatedAt: serverOrder.updatedAt || new Date().toISOString()
            };
          }
        }
        return localOrder;
      });

      if (hasChanges) {
        setRecentOrders(updated);
        try {
          localStorage.setItem('salik_recent_orders', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      // Offline/network failure ignored
    }
  };

  // Sync recent orders periodically & on window focus/visibility/status events
  useEffect(() => {
    // Request notification permissions for Android Native & Web
    requestNotificationPermission().catch(() => {});

    syncRecentOrders();
    const interval = setInterval(syncRecentOrders, 1000);

    const onFocus = () => syncRecentOrders();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncRecentOrders();
      }
    };

    // Instant status change handler (0ms latency for active sliders)
    const onDirectStatusUpdate = (e) => {
      if (e?.detail?.id && e?.detail?.status) {
        const cleanTargetId = String(e.detail.id).replace(/^#/, '');
        setRecentOrders(prev => {
          return prev.map(o => {
            if (String(o.id).replace(/^#/, '') === cleanTargetId) {
              return { ...o, status: e.detail.status, updatedAt: new Date().toISOString() };
            }
            return o;
          });
        });
      }
      syncRecentOrders();
    };

    const onStorageSync = () => {
      try {
        const saved = localStorage.getItem('salik_recent_orders');
        if (saved) {
          setRecentOrders(JSON.parse(saved));
        }
      } catch (err) {
        console.error(err);
      }
      syncRecentOrders();
    };

    // Native Capacitor App Resume listener (wakes up sync immediately when app resumes from background)
    let appStateHandle = null;
    try {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          syncRecentOrders();
        }
      }).then(handle => {
        appStateHandle = handle;
      }).catch(() => {});
    } catch {}

    window.addEventListener('focus', onFocus);
    window.addEventListener('salik_sync_orders', onFocus);
    window.addEventListener('salik_order_status_updated', onDirectStatusUpdate);
    window.addEventListener('storage', onStorageSync);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      if (appStateHandle?.remove) {
        appStateHandle.remove();
      }
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('salik_sync_orders', onFocus);
      window.removeEventListener('salik_order_status_updated', onDirectStatusUpdate);
      window.removeEventListener('storage', onStorageSync);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const saveRecentOrder = (order) => {
    if (!order || !order.items) return;
    const cleanId = String(order.id).trim().replace(/^#/, '');
    // Mark initial Pending status as known so we don't duplicate notifications
    markStatusNotified(cleanId, order.status || 'Pending');
    setRecentOrders(prev => {
      const filtered = prev.filter(o => o.id !== order.id);
      const updated = [order, ...filtered].slice(0, 20);
      try {
        localStorage.setItem('salik_recent_orders', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const reorder = (order) => {
    if (!order || !order.items || order.items.length === 0) return;
    order.items.forEach(item => {
      addToCart(
        {
          id: item.id || item.cartKey || item.name,
          name: item.name,
          price: item.price,
          image: item.image,
          category: item.category || 'menu',
          inStock: true
        },
        item.size || null,
        item.quantity || 1
      );
    });
    setIsCartOpen(true);
  };

  const addToCart = (product, selectedSize = null, quantity = 1, options = null) => {
    if (!product || product.inStock === false) {
      return;
    }
    const sizeLabel = selectedSize?.label || (typeof selectedSize === 'string' ? selectedSize : null);
    const unitPrice = selectedSize?.price !== undefined ? selectedSize.price : product.price;
    const cartKey = `${product.id}-${sizeLabel || 'default'}`;

    setCartItems(prev => {
      const existing = prev.find(item => item.cartKey === cartKey);
      if (existing) {
        return prev.map(item =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      const cleanedIncludes = product.includes ? cleanDealInclusions(product.includes) : null;
      const rawDesc = product.description || (Array.isArray(product.includes) ? product.includes.join(' + ') : product.includes) || null;
      const cleanDesc = rawDesc ? cleanDealInclusions(rawDesc) : null;

      return [
        ...prev,
        {
          cartKey,
          id: product.id,
          name: product.name,
          category: product.category,
          size: sizeLabel,
          price: unitPrice,
          image: product.image,
          quantity: quantity,
          description: cleanDesc,
          includes: cleanedIncludes
        }
      ];
    });

    // Check if startElement is provided for fly-to-cart animation
    let startElement = null;
    let openDrawer = false;

    if (options) {
      if (options.nodeType || options.currentTarget || options.target) {
        startElement = options;
      } else if (typeof options === 'object') {
        startElement = options.startElement || null;
        openDrawer = Boolean(options.openDrawer);
      }
    }

    if (startElement) {
      flyItemToCart({
        startElement,
        image: product.image,
        name: product.name,
        quantity
      });
    }

    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  const updateQuantity = (cartKey, delta) => {
    setCartItems(prev => {
      return prev
        .map(item => {
          if (item.cartKey === cartKey) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (cartKey) => {
    setCartItems(prev => prev.filter(item => item.cartKey !== cartKey));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('salik_delivery_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      deliveryFee: 100,
      baseDeliveryEnabled: true,
      minOrder: 500,
      minOrderEnabled: true,
      freeDeliveryThreshold: 0,
      freeDeliveryEnabled: false,
      deliveryNotice: 'Delivery available in nearby areas (Wah Model Town, Wah Cantt)'
    };
  });

  const refreshSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/settings'));
      const data = await res.json();
      if (data && typeof data.deliveryFee === 'number') {
        setSettings(data);
        try {
          localStorage.setItem('salik_delivery_settings', JSON.stringify(data));
        } catch {}
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  useEffect(() => {
    refreshSettings();

    // 1. In-window custom event (fired right after admin saves settings)
    const handleSettingsUpdated = (e) => {
      if (e.detail) {
        setSettings(e.detail);
        try {
          localStorage.setItem('salik_delivery_settings', JSON.stringify(e.detail));
        } catch {}
      } else {
        refreshSettings();
      }
    };
    window.addEventListener('salik_settings_updated', handleSettingsUpdated);

    // 2. BroadcastChannel for instant cross-tab sync without page refresh
    let bc = null;
    try {
      bc = new BroadcastChannel('salik_settings_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'SETTINGS_UPDATED' && event.data?.settings) {
          setSettings(event.data.settings);
        } else {
          refreshSettings();
        }
      };
    } catch {}

    // 3. Storage event for cross-tab sync
    const handleStorage = (e) => {
      if (e.key === 'salik_delivery_settings' && e.newValue) {
        try {
          setSettings(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Refetch when window regains focus or visibility
    const handleFocus = () => refreshSettings();
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshSettings();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 5. Background polling every 10 seconds for multi-device live sync
    const pollInterval = setInterval(refreshSettings, 10000);

    return () => {
      window.removeEventListener('salik_settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (bc) bc.close();
      clearInterval(pollInterval);
    };
  }, []);

  // Refetch fresh settings whenever cart is opened
  useEffect(() => {
    if (isCartOpen) {
      refreshSettings();
    }
  }, [isCartOpen]);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // 1. Standard Base Delivery Fee Toggle & Amount
  const baseDeliveryEnabled = settings.baseDeliveryEnabled !== false;
  const rawBaseDeliveryFee = Number(settings.deliveryFee ?? 100);
  const baseDeliveryFee = baseDeliveryEnabled ? rawBaseDeliveryFee : 0;

  // 2. Free Delivery Above Subtotal Toggle & Threshold (Strictly 0 / disabled if toggled off)
  const freeDeliveryEnabled = settings.freeDeliveryEnabled === true && Number(settings.freeDeliveryThreshold || 0) > 0;
  const freeDeliveryThreshold = freeDeliveryEnabled ? Number(settings.freeDeliveryThreshold) : 0;

  // Delivery is free if base fee is disabled (free for everyone) OR free delivery threshold is reached
  const isFreeDelivery = (!baseDeliveryEnabled) || (freeDeliveryEnabled && subtotal >= freeDeliveryThreshold);
  const deliveryFee = subtotal > 0 ? (isFreeDelivery ? 0 : baseDeliveryFee) : 0;
  const total = subtotal + deliveryFee;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // 3. Minimum Order Toggle & Amount
  const minOrderEnabled = settings.minOrderEnabled !== false && Number(settings.minOrder || 0) > 0;
  const minOrder = minOrderEnabled ? Number(settings.minOrder) : 0;
  const isMinOrderMet = (!minOrderEnabled) || (subtotal >= minOrder);

  // Amount needed for free delivery (0 if free delivery feature is toggled off or cart already qualifies)
  const amountForFreeDelivery = (freeDeliveryEnabled && !isFreeDelivery)
    ? Math.max(0, freeDeliveryThreshold - subtotal)
    : 0;

  // Format WhatsApp message with order details
  const getWhatsAppMessage = (customerInfo = {}) => {
    const dateStr = new Date().toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const itemsList = cartItems.map(item => 
      `• ${item.quantity}x ${item.name}${item.size ? ` (${item.size})` : ''} — Rs. ${item.price * item.quantity}`
    ).join('\n');

    return encodeURIComponent(
`*New Order — Salik Fast Food Wah Cantt*
Order time: ${dateStr}

${itemsList || '(No items selected)'}

-------------------------
Subtotal: Rs. ${formatPrice(subtotal)}
Delivery Fee: ${isFreeDelivery ? 'FREE (Special Promo)' : `Rs. ${formatPrice(deliveryFee)}`}
*Total: Rs. ${formatPrice(total)}*
Payment Method: ${customerInfo.paymentMethod || 'Cash on Delivery'}

Name: ${customerInfo.name || '-'}
Phone: ${customerInfo.phone || '-'}
Delivery address: ${customerInfo.address || '-'}
Notes: ${customerInfo.notes || 'None'}`
    );
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        subtotal,
        deliveryFee,
        baseDeliveryFee,
        baseDeliveryEnabled,
        total,
        itemCount,
        totalItems: itemCount,
        totalPrice: total,
        minOrder,
        minOrderEnabled,
        isMinOrderMet,
        freeDeliveryThreshold,
        freeDeliveryEnabled,
        isFreeDelivery,
        amountForFreeDelivery,
        settings,
        refreshSettings,
        getWhatsAppMessage,
        orderModalOpen,
        setOrderModalOpen,
        lastOrder,
        setLastOrder,
        recentOrders,
        saveRecentOrder,
        syncRecentOrders,
        activeOrderNotification,
        dismissOrderNotification,
        reorder,
        isProfileOpen,
        setIsProfileOpen,
        profileTab,
        setProfileTab,
        openProfileModal,
        closeProfileModal,
        userProfile,
        saveUserProfile: saveStoredUserProfile,
        theme,
        isDark,
        toggleTheme,
        setTheme
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
