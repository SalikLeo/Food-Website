import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../config/api';
import { flyItemToCart } from '../utils/flyToCart';

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

  useEffect(() => {
    try {
      localStorage.setItem('salik_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error(e);
    }
  }, [cartItems]);

  const saveRecentOrder = (order) => {
    if (!order || !order.items) return;
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

  const [settings, setSettings] = useState({
    deliveryFee: 100,
    minOrder: 500,
    freeDeliveryThreshold: 0,
    deliveryNotice: 'Delivery available in nearby areas'
  });

  const refreshSettings = async () => {
    try {
      const res = await fetch(apiUrl('/api/settings'));
      const data = await res.json();
      if (data && typeof data.deliveryFee === 'number') {
        setSettings(data);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const baseDeliveryFee = Number(settings.deliveryFee ?? 100);
  const freeDeliveryThreshold = Number(settings.freeDeliveryThreshold ?? 0) > 0 
    ? Number(settings.freeDeliveryThreshold) 
    : 1500;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const deliveryFee = subtotal > 0 ? (isFreeDelivery ? 0 : baseDeliveryFee) : 0;
  const total = subtotal + deliveryFee;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const minOrder = Number(settings.minOrder ?? 500);
  const isMinOrderMet = subtotal >= minOrder;
  const amountForFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);

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
Subtotal: Rs. ${subtotal.toLocaleString()}
Delivery Fee: ${isFreeDelivery ? 'FREE (Special Promo)' : `Rs. ${deliveryFee.toLocaleString()}`}
*Total: Rs. ${total.toLocaleString()}*
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
        total,
        itemCount,
        minOrder,
        isMinOrderMet,
        freeDeliveryThreshold,
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
        reorder
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
