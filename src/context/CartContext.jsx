import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiUrl } from '../config/api';
import { flyItemToCart } from '../utils/flyToCart';
import { formatPrice } from '../utils/formatters';
import { 
  requestNotificationPermission, 
  notifyCustomerOrderStatus, 
  getStatusNotificationDetails 
} from '../services/notificationService';

const CartContext = createContext();

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

  const syncRecentOrders = async () => {
    try {
      const saved = localStorage.getItem('salik_recent_orders');
      const localOrders = saved ? JSON.parse(saved) : [];
      if (!localOrders || !Array.isArray(localOrders) || localOrders.length === 0) return;

      const res = await fetch(apiUrl('/api/orders'));
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

      let hasChanges = false;
      const updated = localOrders.map(localOrder => {
        if (!localOrder || !localOrder.id) return localOrder;
        const rawId = String(localOrder.id).trim();
        const cleanId = rawId.replace(/^#/, '');
        const serverOrder = serverMap.get(rawId) || serverMap.get(cleanId);
        
        if (serverOrder) {
          const statusChanged = serverOrder.status && serverOrder.status !== localOrder.status;
          const totalChanged = serverOrder.total !== undefined && Number(serverOrder.total) !== Number(localOrder.total);
          const feeChanged = serverOrder.deliveryFee !== undefined && Number(serverOrder.deliveryFee) !== Number(localOrder.deliveryFee);
          const subtotalChanged = serverOrder.subtotal !== undefined && Number(serverOrder.subtotal) !== Number(localOrder.subtotal);

          const currentServerStatus = serverOrder.status || localOrder.status;
          const previousKnownStatus = knownStatusesRef.current.get(cleanId);

          // If the app has loaded before and the status has changed on the server
          if (initialSyncDoneRef.current && statusChanged && previousKnownStatus && previousKnownStatus !== currentServerStatus) {
            const details = getStatusNotificationDetails(currentServerStatus, cleanId);
            setActiveOrderNotification({
              order: { ...localOrder, ...serverOrder },
              oldStatus: previousKnownStatus,
              newStatus: currentServerStatus,
              details,
              receivedAt: new Date()
            });
            notifyCustomerOrderStatus(serverOrder, previousKnownStatus, currentServerStatus);
          }
          knownStatusesRef.current.set(cleanId, currentServerStatus);

          if (statusChanged || totalChanged || feeChanged || subtotalChanged) {
            hasChanges = true;
            return {
              ...localOrder,
              status: serverOrder.status || localOrder.status,
              total: serverOrder.total !== undefined ? serverOrder.total : localOrder.total,
              deliveryFee: serverOrder.deliveryFee !== undefined ? serverOrder.deliveryFee : localOrder.deliveryFee,
              subtotal: serverOrder.subtotal !== undefined ? serverOrder.subtotal : localOrder.subtotal,
              items: serverOrder.items && serverOrder.items.length > 0 ? serverOrder.items : localOrder.items,
              updatedAt: serverOrder.updatedAt || new Date().toISOString()
            };
          }
        } else {
          if (!knownStatusesRef.current.has(cleanId)) {
            knownStatusesRef.current.set(cleanId, localOrder.status || 'Pending');
          }
        }
        return localOrder;
      });

      initialSyncDoneRef.current = true;

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

  // Sync recent orders periodically & on window focus/visibility
  useEffect(() => {
    // Request notification permissions for Android Native & Web
    requestNotificationPermission().catch(() => {});

    syncRecentOrders();
    const interval = setInterval(syncRecentOrders, 2000);
    const onFocus = () => syncRecentOrders();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncRecentOrders();
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('salik_sync_orders', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('salik_sync_orders', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const saveRecentOrder = (order) => {
    if (!order || !order.items) return;
    const cleanId = String(order.id).trim().replace(/^#/, '');
    knownStatusesRef.current.set(cleanId, order.status || 'Pending');
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
          quantity: quantity
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
        reorder
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
