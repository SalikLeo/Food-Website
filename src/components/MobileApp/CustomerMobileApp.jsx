import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, ArrowLeft, Plus, Minus, Flame, 
  MessageCircle, Menu, X, ShoppingBag, 
  Clock, MapPin, ChevronRight, ChevronDown, Check, Sparkles, Phone,
  Sun, Moon, RotateCcw, PackageCheck, ReceiptText, AlertCircle, Ban,
  User, CheckCircle2, Send, Star, MessageSquareHeart
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { apiUrl } from '../../config/api';
import WhatsAppIcon from '../WhatsAppIcon';
import CartDrawer from '../CartDrawer';
import OrderSuccessModal from '../OrderSuccessModal';
import CustomerReceiptModal from '../CustomerReceiptModal';
import CustomerNotificationBanner from '../CustomerNotificationBanner';
import { formatPrice, cleanDealInclusions } from '../../utils/formatters';
import { App as CapApp } from '@capacitor/app';
import { notifyCustomerReviewSubmitted } from '../../services/notificationService';
import { 
  getStoredCustomerUser, 
  setStoredCustomerUser, 
  clearStoredCustomerUser, 
  triggerGoogleLogin,
  getGoogleClientId 
} from '../../services/googleAuth';

// High quality category dish image mapping
const categoryImages = {
  pizza: '/assets/images/cat-pizza-BmV7hCev.jpg',
  burgers: '/assets/images/cat-burgers-CfWIZ4YN.jpg',
  shawarma: '/assets/images/cat-shawarma-D-OpXs-U.jpg',
  sandwiches: '/assets/images/cat-sandwiches-bOG3zufR.jpg',
  fries: '/assets/images/cat-fries-DyVY4OBM.jpg',
  wings: '/assets/images/cat-wings-Di7o4fqc.jpg',
  nuggets: '/assets/images/cat-nuggets-DjOT58nG.jpg',
  special: '/assets/images/cat-special-CdXGKIOV.jpg'
};

const categoryEmojis = {
  pizza: '🍕',
  burgers: '🍔',
  shawarma: '🌯',
  sandwiches: '🥪',
  fries: '🍟',
  wings: '🍗',
  nuggets: '🍗',
  special: '⭐'
};

export default function CustomerMobileApp({ 
  categories = [], 
  products = [], 
  deals = [], 
  familyDeal = null,
  settings = null 
}) {
  const { 
    addToCart, 
    itemCount = 0,
    totalItems: rawTotalItems, 
    totalPrice: rawTotalPrice, 
    isCartOpen = false,
    setIsCartOpen,
    recentOrders = [],
    saveRecentOrder,
    syncRecentOrders,
    reorder,
    cartItems = [],
    subtotal = 0,
    deliveryFee = 100,
    total = 0,
    isFreeDelivery = false,
    isMinOrderMet = true,
    minOrder = 500,
    getWhatsAppMessage,
    clearCart,
    setLastOrder,
    orderModalOpen = false,
    setOrderModalOpen
  } = useCart();

  const totalItems = rawTotalItems || itemCount || (cartItems || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
  const totalPrice = rawTotalPrice || total || subtotal;

  // Theme state: 'light' | 'dark' (persisted in localStorage, default 'light')
  const [theme, setTheme] = useState(() => {
    try {
      const savedV2 = localStorage.getItem('salik_app_theme_v2');
      if (savedV2 === 'light' || savedV2 === 'dark') return savedV2;
      return 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('salik_app_theme_v2', theme);
      localStorage.setItem('salik_app_theme', theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  const isDark = theme === 'dark';
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Navigation states: 'home' | 'category' | 'deals' | 'orders' | 'checkout' | 'add-review'
  const [currentView, setCurrentView] = useState('home');
  const [previousView, setPreviousView] = useState('orders');

  // Trigger instant live order sync whenever user visits recent orders view
  useEffect(() => {
    if (currentView === 'orders' && typeof syncRecentOrders === 'function') {
      syncRecentOrders();
    }
  }, [currentView, syncRecentOrders]);
  const [selectedCatId, setSelectedCatId] = useState('pizza');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Promo Hero Banner Slider state & drag tracking
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const isPointerDown = useRef(false);
  const hasDragged = useRef(false);
  const [reorderToast, setReorderToast] = useState('');

  // Selected sizes and quantities per product
  const [selectedSizes, setSelectedSizes] = useState({});
  const [quantities, setQuantities] = useState({});

  // Accordion state for order items dropdown in Recent Orders
  const [expandedOrders, setExpandedOrders] = useState({});
  const toggleOrderExpanded = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Checkout form state
  const [checkoutForm, setCheckoutForm] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    paymentMethod: 'Cash on Delivery'
  });
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmType, setConfirmType] = useState('online'); // 'online' | 'whatsapp'
  
  // Google Customer User authentication state
  const [customerUser, setCustomerUser] = useState(() => getStoredCustomerUser());
  const [showGoogleSetupModal, setShowGoogleSetupModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState(null);

  // Customer order reviews persistence & state
  const [reviewedOrderIds, setReviewedOrderIds] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_reviewed_order_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('salik_reviewed_order_ids', JSON.stringify(reviewedOrderIds));
    } catch (e) {
      console.error(e);
    }
  }, [reviewedOrderIds]);

  // Only show orders that are delivered and pending review
  const pendingReviewOrders = useMemo(() => {
    return (recentOrders || []).filter(o => 
      o && o.id && 
      String(o.status || '').toLowerCase() === 'delivered' &&
      !reviewedOrderIds.includes(String(o.id))
    );
  }, [recentOrders, reviewedOrderIds]);

  const pendingReviewsCount = pendingReviewOrders.length;

  const [reviewRatings, setReviewRatings] = useState({});
  const [reviewComments, setReviewComments] = useState({});
  const [reviewToConfirm, setReviewToConfirm] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessData, setReviewSuccessData] = useState(null);

  const getOrderRating = (orderId) => {
    return reviewRatings[orderId] !== undefined ? reviewRatings[orderId] : 5;
  };

  const setOrderRating = (orderId, rating) => {
    setReviewRatings(prev => ({ ...prev, [orderId]: rating }));
  };

  const getOrderComment = (orderId) => {
    return reviewComments[orderId] !== undefined ? reviewComments[orderId] : '';
  };

  const setOrderComment = (orderId, comment) => {
    setReviewComments(prev => ({ ...prev, [orderId]: comment }));
  };

  const handleInitiateReviewSubmit = (order) => {
    const rating = getOrderRating(order.id);
    const comment = getOrderComment(order.id);
    setReviewToConfirm({ order, rating, comment });
  };

  const handleConfirmReviewSubmit = async () => {
    if (!reviewToConfirm) return;
    setSubmittingReview(true);
    const { order, rating, comment } = reviewToConfirm;
    const finalComment = (comment || '').trim() || '-';
    const customerName = (order.customerName || customerUser?.name || 'Customer').trim();
    const itemOrdered = (order.items || []).map(i => `${i.quantity || 1}x ${i.name}`).join(', ') || `Order #${order.id}`;

    const payload = {
      name: customerName,
      location: order.address || 'Wah Cantt',
      rating: Number(rating) || 5,
      platform: 'In-App Order Review',
      itemOrdered: itemOrdered,
      comment: finalComment,
      orderId: String(order.id)
    };

    try {
      await fetch(apiUrl('/api/reviews'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Network issue saving review to server, saved locally:', err);
    }

    const updated = Array.from(new Set([...reviewedOrderIds, String(order.id)]));
    setReviewedOrderIds(updated);
    try {
      localStorage.setItem('salik_reviewed_order_ids', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setReviewRatings(prev => {
      const copy = { ...prev };
      delete copy[order.id];
      return copy;
    });
    setReviewComments(prev => {
      const copy = { ...prev };
      delete copy[order.id];
      return copy;
    });

    setReviewToConfirm(null);
    setSubmittingReview(false);

    setReviewSuccessData({
      orderId: order.id,
      name: customerName,
      rating: Number(rating) || 5
    });

    notifyCustomerReviewSubmitted({
      orderId: order.id,
      author: customerName,
      rating: Number(rating) || 5,
      text: finalComment
    });
  };

  useEffect(() => {
    if (reviewSuccessData) {
      const timer = setTimeout(() => {
        setReviewSuccessData(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [reviewSuccessData]);

  // Sync customer user name to checkout form if empty
  useEffect(() => {
    if (customerUser?.name && !checkoutForm.name) {
      setCheckoutForm(prev => ({
        ...prev,
        name: customerUser.name
      }));
    }
  }, [customerUser]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await triggerGoogleLogin({
        onSuccess: (user) => {
          setCustomerUser(user);
          setGoogleLoading(false);
          setReorderToast(`Signed in as ${user.name}`);
          setCheckoutForm(prev => ({
            ...prev,
            name: prev.name || user.name
          }));
        },
        onError: (err) => {
          setGoogleLoading(false);
          console.warn('Google sign-in:', err);
          if (err && typeof err === 'string' && !err.includes('popup_closed_by_user')) {
            setReorderToast(err);
          }
        },
        onConfigRequired: () => {
          setGoogleLoading(false);
          setShowGoogleSetupModal(true);
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
    setReorderToast('Logged out of Google');
  };

  const handleSetDemoUser = () => {
    const demoUser = {
      name: 'M. Salik Leo',
      email: 'salik.fastfood@gmail.com',
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      loginMethod: 'google_demo'
    };
    setStoredCustomerUser(demoUser);
    setCustomerUser(demoUser);
    setShowGoogleSetupModal(false);
    setReorderToast('Demo Google Login active!');
    setCheckoutForm(prev => ({
      ...prev,
      name: prev.name || demoUser.name
    }));
  };

  // Listen for checkout click from CartDrawer
  useEffect(() => {
    const handleOpenCheckout = () => {
      switchView('checkout');
    };
    window.addEventListener('salik_open_checkout', handleOpenCheckout);
    return () => window.removeEventListener('salik_open_checkout', handleOpenCheckout);
  }, []);

  // Lock background scroll and handle ESC key when mobile menu or confirmation modal is open
  useEffect(() => {
    if (mobileMenuOpen || showConfirmModal || viewingReceiptOrder || reviewToConfirm || reviewSuccessData) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (reviewSuccessData) {
          setReviewSuccessData(null);
        } else if (reviewToConfirm) {
          setReviewToConfirm(null);
        } else if (viewingReceiptOrder) {
          setViewingReceiptOrder(null);
        } else if (showConfirmModal) {
          setShowConfirmModal(false);
        } else if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen, showConfirmModal, viewingReceiptOrder, reviewToConfirm, reviewSuccessData]);

  // Group and resolve featured deal for Deals tab
  const allDealsList = useMemo(() => {
    let list = [...(deals || [])];
    if (familyDeal && !list.some((d) => d.id === familyDeal.id)) {
      list.unshift(familyDeal);
    }
    const featuredId = list.find((d) => d.featured === true || d.featured === 'true')?.id;
    return list.map((d) => ({
      ...d,
      featured: featuredId ? d.id === featuredId : false
    }));
  }, [deals, familyDeal]);

  const featuredDeal = useMemo(() => {
    if (!allDealsList.length) return null;
    const explicit = allDealsList.find((d) => d.featured === true || d.featured === 'true');
    if (explicit) return explicit;
    if (familyDeal) return familyDeal;
    return allDealsList[0] || null;
  }, [allDealsList, familyDeal]);

  const remainingDeals = useMemo(() => {
    if (!featuredDeal) return allDealsList;
    return allDealsList.filter((d) => d.id !== featuredDeal.id);
  }, [allDealsList, featuredDeal]);

  // Handle native Android hardware back button
  useEffect(() => {
    let backHandle = null;
    const setupBack = async () => {
      try {
        backHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
          if (reviewSuccessData) {
            setReviewSuccessData(null);
            return;
          }
          if (reviewToConfirm) {
            setReviewToConfirm(null);
            return;
          }
          if (viewingReceiptOrder) {
            setViewingReceiptOrder(null);
            return;
          }
          if (showGoogleSetupModal) {
            setShowGoogleSetupModal(false);
            return;
          }
          if (showConfirmModal) {
            setShowConfirmModal(false);
            return;
          }
          if (orderModalOpen) {
            if (typeof setOrderModalOpen === 'function') setOrderModalOpen(false);
            return;
          }
          if (isCartOpen) {
            if (typeof setIsCartOpen === 'function') setIsCartOpen(false);
            return;
          }
          if (mobileMenuOpen) {
            setMobileMenuOpen(false);
            return;
          }
          if (searchQuery.trim()) {
            setSearchQuery('');
            return;
          }
          if (currentView === 'add-review') {
            const target = previousView && previousView !== 'add-review' ? previousView : 'orders';
            setCurrentView(target);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          if (currentView !== 'home') {
            setCurrentView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          if (canGoBack) {
            window.history.back();
          } else {
            CapApp.exitApp();
          }
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
  }, [viewingReceiptOrder, showGoogleSetupModal, showConfirmModal, reviewToConfirm, reviewSuccessData, orderModalOpen, isCartOpen, mobileMenuOpen, searchQuery, currentView, previousView, setIsCartOpen, setOrderModalOpen]);


  // Auto-rotate promo banners (pauses while dragging)
  useEffect(() => {
    if (currentView !== 'home' || isDragging) return;
    const interval = setInterval(() => {
      setActiveBannerIndex(prev => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, [currentView, isDragging, activeBannerIndex]);

  // Banner click-to-drag handlers for Next/Previous slide
  const handleBannerPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    isPointerDown.current = true;
    hasDragged.current = false;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
  };

  const handleBannerPointerMove = (e) => {
    if (!isPointerDown.current) return;
    const deltaX = e.clientX - dragStartX.current;
    const deltaY = e.clientY - dragStartY.current;

    // Check if user is attempting vertical page scroll
    if (!hasDragged.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        isPointerDown.current = false;
        return;
      }
      if (Math.abs(deltaX) > 8) {
        hasDragged.current = true;
        setIsDragging(true);
      }
    }

    if (hasDragged.current) {
      setDragOffset(deltaX);
    }
  };

  const handleBannerPointerUp = () => {
    if (!isPointerDown.current && !hasDragged.current) return;
    isPointerDown.current = false;

    if (hasDragged.current) {
      setIsDragging(false);
      const threshold = 40;
      if (dragOffset < -threshold) {
        // Dragged left -> next slide
        setActiveBannerIndex(prev => (prev + 1) % 3);
      } else if (dragOffset > threshold) {
        // Dragged right -> prev slide
        setActiveBannerIndex(prev => (prev - 1 + 3) % 3);
      }
      setDragOffset(0);
      setTimeout(() => {
        hasDragged.current = false;
      }, 60);
    }
  };

  const handleBannerPointerCancel = () => {
    isPointerDown.current = false;
    setIsDragging(false);
    setDragOffset(0);
    setTimeout(() => {
      hasDragged.current = false;
    }, 60);
  };

  // Scroll to top on view changes
  const switchView = (view, catId = null) => {
    if (view !== currentView) {
      setPreviousView(currentView);
    }
    if (catId) setSelectedCatId(catId);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper for size selection
  const getSelectedSize = (product) => {
    if (!product.sizes || product.sizes.length === 0) return null;
    const current = selectedSizes[product.id];
    if (current) return current;
    const med = product.sizes.find(s => s.label.toLowerCase() === 'medium');
    return med || product.sizes[0];
  };

  const handleSelectSize = (productId, sizeObj) => {
    setSelectedSizes(prev => ({
      ...prev,
      [productId]: sizeObj
    }));
  };

  const getQty = (productId) => quantities[productId] || 1;
  const setQty = (productId, delta) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + delta)
    }));
  };

  const handleAddProduct = (product, e = null) => {
    if (product.inStock === false) return;
    const size = getSelectedSize(product);
    const qty = getQty(product.id);
    addToCart(product, size, qty, e?.currentTarget);
  };

  const handleAddDeal = (deal, e = null) => {
    const cleanedIncludes = cleanDealInclusions(deal.includes || []);
    const cleanDesc = cleanDealInclusions(deal.description || (Array.isArray(cleanedIncludes) ? cleanedIncludes.join(' + ') : cleanedIncludes) || '');
    addToCart({
      id: deal.id,
      name: deal.name,
      price: deal.price,
      image: deal.image || '/assets/images/deal-1.png',
      category: 'deals',
      description: cleanDesc,
      includes: cleanedIncludes
    }, null, 1, e?.currentTarget);
  };

  // Reorder entire past order
  const handleReorderOrder = (order) => {
    if (typeof reorder === 'function') {
      reorder(order);
    } else {
      (order.items || []).forEach(item => {
        addToCart({
          id: item.id || item.cartKey || item.name,
          name: item.name,
          price: item.price,
          image: item.image,
          category: item.category || 'menu',
          inStock: true
        }, item.size || null, item.quantity || 1);
      });
      setIsCartOpen(true);
    }
    setReorderToast(`Items from Order #${order.id || 'recent'} added to cart!`);
    setTimeout(() => setReorderToast(''), 4000);
  };

  // Create sample order if none exists so user can test immediately
  const handleLoadSampleOrder = () => {
    const sample = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      status: 'Delivered',
      total: 1050,
      deliveryFee: 100,
      subtotal: 950,
      items: [
        {
          id: 'burger-zinger',
          name: 'Zinger Burger',
          price: 320,
          quantity: 2,
          size: null,
          image: '/assets/images/cat-burgers-CfWIZ4YN.jpg'
        },
        {
          id: 'fries-regular',
          name: 'Crispy Fries',
          price: 180,
          quantity: 1,
          size: null,
          image: '/assets/images/cat-fries-DyVY4OBM.jpg'
        },
        {
          id: 'drink-500ml',
          name: 'Coke 500ml',
          price: 130,
          quantity: 1,
          size: null,
          image: '/assets/images/coke-500ml.png'
        }
      ]
    };
    if (typeof saveRecentOrder === 'function') {
      saveRecentOrder(sample);
    }
  };

  // Mobile Checkout - Validate & Open Confirmation Modal
  const handleMobileOnlineOrder = (e) => {
    if (e) e.preventDefault();
    if (!checkoutForm.name?.trim()) {
      setCheckoutError('Please enter your Name');
      return;
    }
    const cleanPhone = (checkoutForm.phone || '').replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      setCheckoutError('Please enter a valid 11-digit phone number (e.g. 03001234567)');
      return;
    }
    if (!checkoutForm.address?.trim()) {
      setCheckoutError('Please enter your Delivery Address');
      return;
    }
    setCheckoutError('');
    setConfirmType('online');
    setShowConfirmModal(true);
  };

  // Mobile WhatsApp Checkout - Validate & Open Confirmation Modal
  const handleMobileWhatsAppOrder = () => {
    if (!checkoutForm.name?.trim()) {
      setCheckoutError('Please enter your Name');
      return;
    }
    const cleanPhone = (checkoutForm.phone || '').replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
      setCheckoutError('Please enter a valid 11-digit phone number (e.g. 03001234567)');
      return;
    }
    setCheckoutError('');
    setConfirmType('whatsapp');
    setShowConfirmModal(true);
  };

  // Execute Direct Online Order after user confirmation
  const executeMobileOnlineOrder = async () => {
    setCheckoutSubmitting(true);
    setCheckoutError('');

    try {
      const payload = {
        customerName: checkoutForm.name,
        phone: checkoutForm.phone,
        address: checkoutForm.address,
        notes: checkoutForm.notes,
        paymentMethod: checkoutForm.paymentMethod,
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
        if (typeof setLastOrder === 'function') setLastOrder(data.order);
        if (typeof saveRecentOrder === 'function') saveRecentOrder(data.order);
        if (typeof setOrderModalOpen === 'function') setOrderModalOpen(true);
        if (typeof clearCart === 'function') clearCart();
        setCheckoutForm({ name: '', phone: '', address: '', notes: '', paymentMethod: 'Cash on Delivery' });
        switchView('orders');
      } else {
        setShowConfirmModal(false);
        setCheckoutError(data.error || 'Failed to place order. Try again or use WhatsApp.');
      }
    } catch (err) {
      console.error(err);
      setShowConfirmModal(false);
      setCheckoutError('Network error. Please try WhatsApp ordering.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // Execute WhatsApp Checkout after user confirmation
  const executeMobileWhatsAppOrder = () => {
    const waOrder = {
      id: `WA-${Date.now().toString().slice(-4)}`,
      customerName: checkoutForm.name,
      phone: checkoutForm.phone,
      address: checkoutForm.address || 'Wah Cantt',
      notes: checkoutForm.notes || '',
      paymentMethod: `${checkoutForm.paymentMethod} (WhatsApp)`,
      items: [...cartItems],
      subtotal,
      deliveryFee,
      total,
      createdAt: new Date().toISOString(),
      status: 'WhatsApp Order'
    };

    if (typeof saveRecentOrder === 'function') saveRecentOrder(waOrder);
    if (typeof setLastOrder === 'function') setLastOrder(waOrder);

    // Save to server in background
    try {
      fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: checkoutForm.name,
          phone: checkoutForm.phone,
          address: checkoutForm.address || 'Wah Cantt',
          notes: checkoutForm.notes,
          paymentMethod: `${checkoutForm.paymentMethod} (WhatsApp)`,
          items: cartItems,
          subtotal,
          deliveryFee,
          total
        })
      });
    } catch {}

    setShowConfirmModal(false);
    const msg = getWhatsAppMessage ? getWhatsAppMessage(checkoutForm) : `Order from ${checkoutForm.name}`;
    window.open(`https://wa.me/923095369472?text=${msg}`, '_blank');
    if (typeof clearCart === 'function') clearCart();
    switchView('orders');
  };

  // Filter products for category view (with Global Search across all categories)
  const categoryProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = products || [];
    if (q) {
      // Global search across ALL categories
      list = list.filter(p => {
        const nameMatch = p.name && p.name.toLowerCase().includes(q);
        const descMatch = p.description && p.description.toLowerCase().includes(q);
        const catMatch = p.category && p.category.toLowerCase().includes(q);
        return nameMatch || descMatch || catMatch;
      });
    } else if (selectedCatId && selectedCatId !== 'all') {
      list = list.filter(p => p.category === selectedCatId);
    }

    // Move sold out items (inStock === false) to the bottom of the list
    return [...list].sort((a, b) => {
      const aSoldOut = a.inStock === false ? 1 : 0;
      const bSoldOut = b.inStock === false ? 1 : 0;
      return aSoldOut - bSoldOut;
    });
  }, [products, selectedCatId, searchQuery]);

  // Current active category object
  const activeCategory = selectedCatId === 'all'
    ? { id: 'all', label: 'All Items', blurb: 'Explore our complete food menu' }
    : (categories.find(c => c.id === selectedCatId) || categories[0] || {
        id: 'pizza',
        label: 'Pizza'
      });

  // Promo Banners data
  const promoBanners = [
    {
      id: 'family',
      badge: 'POPULAR FEAST',
      title: 'Family Feast Combo',
      price: familyDeal?.price ? `Rs. ${formatPrice(familyDeal.price)}` : 'Rs. 1999',
      tagline: 'Pizza, Burgers & 1.5L Drink',
      image: familyDeal?.image || '/assets/images/deal-family.png',
      action: () => switchView('deals'),
      actionText: 'View Deal'
    },
    {
      id: 'deals',
      badge: 'COMBO OFFERS',
      title: 'Deals From Rs. 600',
      price: '11 Great Combos',
      tagline: 'Zinger, Fries & Ice-Cold Drink',
      image: '/assets/images/deal-1.png',
      action: () => switchView('deals'),
      actionText: 'Explore Deals'
    },
    {
      id: 'burgers',
      badge: 'HOT & CRISPY',
      title: 'Tower Zinger Burgers',
      price: 'From Rs. 280',
      tagline: 'Freshly fried with secret spices',
      image: '/assets/images/cat-burgers-CfWIZ4YN.jpg',
      action: () => switchView('category', 'burgers'),
      actionText: 'Order Burgers'
    }
  ];

  return (
    <div className={`min-h-screen mobile-app-container is-mobile-app ${
      isDark 
        ? 'dark bg-[#0e0e11] text-white selection:bg-orange-500 selection:text-white' 
        : 'bg-[#f4f5f8] text-zinc-900 selection:bg-orange-500 selection:text-white'
    }`}>

      {/* Reorder Notification Toast */}
      {reorderToast && (
        <div className="fixed top-16 left-4 right-4 z-50 animate-slide-down flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-orange-600 text-white shadow-2xl border border-orange-400">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <Check className="w-4 h-4 text-white flex-shrink-0" />
            <span>{reorderToast}</span>
          </div>
          <button 
            onClick={() => setReorderToast('')}
            className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      
      {/* ============================================================== */}
      {/* 1. TOP APP BAR (Native Mobile App Header with Safe-Area Inset) */}
      {/* ============================================================== */}
      <header className={`sticky top-0 left-0 right-0 z-40 backdrop-blur-md border-b mobile-app-header px-4 ${
        isDark 
          ? 'bg-[#121216]/95 border-white/10 shadow-lg' 
          : 'bg-white/95 border-zinc-200/90 shadow-xs'
      }`}>
        <div className="flex items-center justify-between">
          
          {/* Brand Info */}
          <div 
            onClick={() => switchView('home')} 
            className="flex items-center gap-2.5 cursor-pointer active:opacity-80 transition-opacity"
          >
            <div className={`relative w-10 h-10 rounded-full overflow-hidden border-2 shadow-md flex-shrink-0 flex items-center justify-center ${
              isDark ? 'bg-black/40 border-orange-500/80' : 'bg-orange-50 border-orange-500'
            }`}>
              <img
                src="/assets/salik-logo.png"
                alt="Salik Fast Food"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = '/assets/salik-logo.svg';
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className={`font-montserrat tracking-tight text-lg font-bold leading-tight flex items-center gap-1.5 ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                SALIK <span className="text-orange-500">FAST FOOD</span>
              </span>
              <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                <span>Wah Model Town • Open Now</span>
              </span>
            </div>
          </div>

          {/* Right Action Icons: WhatsApp & Side Drawer */}
          <div className="flex items-center gap-2.5">

            {/* WhatsApp Direct Chat */}
            <a
              href="https://wa.me/923095369472"
              target="_blank"
              rel="noopener noreferrer"
              className={`w-10 h-10 rounded-xl border flex items-center justify-center active:scale-95 shadow-2xs transition-transform ${
                isDark 
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400' 
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600'
              }`}
              aria-label="WhatsApp Support"
            >
              <WhatsAppIcon className="w-6 h-6 fill-emerald-500" />
            </a>

            {/* Side Drawer Menu Trigger Button */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(true)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center active:scale-95 cursor-pointer transition-transform ${
                isDark 
                  ? 'bg-zinc-800/80 hover:bg-zinc-700/80 border-white/10 text-white' 
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800 shadow-2xs'
              }`}
              aria-label="Open menu"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
          </div>

        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN APP CONTENT CONTAINER */}
      {/* ============================================================== */}
      <main className="px-4 pt-4 sm:pt-4.5 space-y-4">
        
        {/* VIEW A: HOME DASHBOARD (Hero Promo + 2-Column Categories Grid) */}
        {currentView === 'home' && (
          <div className="space-y-4 animate-tab-fade">
            
            {/* Promo Hero Banner Slider with Click-to-Drag */}
            <div 
              className={`relative rounded-3xl overflow-hidden shadow-xl border select-none cursor-grab active:cursor-grabbing touch-pan-y ${
                isDark 
                  ? 'border-white/10 bg-gradient-to-br from-orange-950/70 via-zinc-900 to-[#160d0d]' 
                  : 'border-orange-500/30 bg-gradient-to-br from-orange-600 via-amber-600 to-red-600 shadow-lg text-white'
              }`}
              onPointerDown={handleBannerPointerDown}
              onPointerMove={handleBannerPointerMove}
              onPointerUp={handleBannerPointerUp}
              onPointerCancel={handleBannerPointerCancel}
            >
              
              {/* Background Glow */}
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-orange-600/30 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-red-600/25 blur-3xl rounded-full pointer-events-none" />

              {/* Sliding Carousel Track */}
              <div 
                className="flex items-stretch w-full relative z-10"
                style={{
                  transform: `translateX(calc(-${activeBannerIndex * 100}% + ${dragOffset}px))`,
                  transition: isDragging ? 'none' : 'transform 350ms cubic-bezier(0.2, 0.9, 0.3, 1)'
                }}
              >
                {promoBanners.map((banner, idx) => (
                  <div 
                    key={banner.id || idx}
                    className="w-full flex-shrink-0 p-4 sm:p-5 flex items-center justify-between gap-3 overflow-hidden"
                  >
                    <div className="flex-1 space-y-1.5 min-w-0 pr-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
                        isDark 
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' 
                          : 'bg-white/20 text-white border-white/30 backdrop-blur-xs'
                      }`}>
                        <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                        <span>{banner.badge}</span>
                      </span>
                      
                      <h3 className="text-base sm:text-xl font-montserrat uppercase tracking-tight text-white leading-tight font-extrabold break-words line-clamp-2">
                        {banner.title}
                      </h3>

                      <p className="text-[11px] sm:text-xs text-white/90 font-medium line-clamp-2">
                        {banner.tagline}
                      </p>

                      <div className="pt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-amber-300 font-sans font-extrabold text-xs sm:text-sm whitespace-nowrap">
                          {banner.price}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            if (hasDragged.current) {
                              e.preventDefault();
                              e.stopPropagation();
                              return;
                            }
                            banner.action();
                          }}
                          className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full font-bold text-[11px] sm:text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap ${
                            isDark 
                              ? 'bg-orange-600 hover:bg-orange-500 text-white' 
                              : 'bg-white hover:bg-zinc-100 text-orange-700 shadow-sm'
                          }`}
                        >
                          {banner.actionText}
                        </button>
                      </div>
                    </div>

                    {/* Banner Thumbnail */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 flex items-center justify-center relative pointer-events-none select-none">
                      <img
                        src={banner.image}
                        alt={banner.title}
                        draggable="false"
                        className="max-w-full max-h-full object-contain drop-shadow-xl"
                        onError={(e) => {
                          e.target.src = '/assets/images/cat-burgers-CfWIZ4YN.jpg';
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Slider Dots */}
              <div className="relative z-20 flex items-center justify-center gap-1.5 pb-2.5">
                {promoBanners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBannerIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      activeBannerIndex === idx 
                        ? (isDark ? 'w-6 bg-orange-500' : 'w-6 bg-white') 
                        : (isDark ? 'w-2 bg-white/20' : 'w-2 bg-white/40')
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Quick Action Navigation Bar */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => switchView('category', 'all')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                  isDark 
                    ? 'bg-zinc-900/90 border border-white/10 text-zinc-200 hover:bg-zinc-800' 
                    : 'bg-white border border-zinc-200 text-zinc-800 shadow-2xs hover:bg-zinc-50'
                }`}
              >
                <span>🍕 Menu</span>
              </button>

              <button
                onClick={() => switchView('deals')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                  isDark 
                    ? 'bg-orange-600/20 border border-orange-500/40 text-orange-400 hover:bg-orange-600/30' 
                    : 'bg-orange-50 border border-orange-200 text-orange-700 shadow-2xs hover:bg-orange-100'
                }`}
              >
                <Flame className="w-3.5 h-3.5 fill-orange-500" />
                <span>Deals</span>
              </button>

              <button
                onClick={() => switchView('orders')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                  isDark 
                    ? 'bg-zinc-900/90 border border-white/10 text-zinc-200 hover:bg-zinc-800' 
                    : 'bg-white border border-zinc-200 text-zinc-800 shadow-2xs hover:bg-zinc-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span>Orders</span>
              </button>
            </div>

            {/* Global Search Bar on Home Screen */}
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search food across all categories..."
                value={searchQuery}
                onFocus={() => switchView('category', 'all')}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  switchView('category', 'all');
                }}
                className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all ${
                  isDark 
                    ? 'bg-[#141418] border-white/10 text-white placeholder-zinc-500 shadow-sm' 
                    : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 shadow-2xs'
                }`}
              />
            </div>

            {/* ============================================================== */}
            {/* 3. EXPLORE MENU (2-Column Category Grid Matching User Image) */}
            {/* ============================================================== */}
            <section className="space-y-3 pt-1">
              
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-lg font-montserrat uppercase tracking-tight font-extrabold ${
                    isDark ? 'text-white' : 'text-zinc-900'
                  }`}>
                    Explore Menu
                  </h2>
                </div>

                <button
                  onClick={() => switchView('category', 'all')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 ${
                    isDark
                      ? 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30'
                      : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/90'
                  }`}
                >
                  <span>VIEW ALL</span>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* 2-COLUMN CATEGORIES GRID (Like Reference Image media_1789982646283.png) */}
              <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                {categories.map((cat) => {
                  const catImg = categoryImages[cat.id] || '/assets/images/cat-pizza-BmV7hCev.jpg';
                  const itemCount = (products || []).filter(p => p.category === cat.id).length;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => switchView('category', cat.id)}
                      className={`group rounded-2xl p-3.5 sm:p-4 text-center cursor-pointer active:scale-[0.97] transition-transform flex flex-col items-center justify-between ${
                        isDark 
                          ? 'bg-[#18181f] border border-white/10 shadow-md hover:border-orange-500/50 hover:shadow-xl' 
                          : 'bg-white border border-zinc-200/90 shadow-xs hover:border-orange-400 hover:shadow-md'
                      }`}
                    >
                      {/* Appetizing Centered Food Photo on Card */}
                      <div className="w-full aspect-[4/3] flex items-center justify-center p-1 mb-2 relative">
                        <img
                          src={catImg}
                          alt={cat.label}
                          className="w-full h-full object-contain rounded-xl transform group-hover:scale-110 transition-transform duration-300 drop-shadow-sm"
                          onError={(e) => {
                            e.target.src = '/assets/images/cat-burgers-CfWIZ4YN.jpg';
                          }}
                        />
                      </div>

                      {/* Title & Count */}
                      <div className="w-full text-center">
                        <h4 className={`font-bold text-sm sm:text-base leading-tight truncate ${
                          isDark 
                            ? 'text-white group-hover:text-orange-400' 
                            : 'text-zinc-900 group-hover:text-orange-600'
                        }`}>
                          {cat.label}
                        </h4>
                        <span className={`text-[11px] font-medium block mt-0.5 ${
                          isDark ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>
                          {itemCount > 0 ? `${itemCount} Items` : 'Fresh & Hot'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </section>

            {/* Featured Deals Carousel Snippet */}
            {deals.length > 0 && (
              <section className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`text-lg font-montserrat uppercase tracking-tight font-extrabold flex items-center gap-1.5 ${
                      isDark ? 'text-white' : 'text-zinc-900'
                    }`}>
                      <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                      <span>Hot Combo Deals</span>
                    </h2>
                    <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Saver deals with burgers, pizza, fries & drinks
                    </p>
                  </div>
                  <button
                    onClick={() => switchView('deals')}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 ${
                      isDark
                        ? 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30'
                        : 'bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200/90'
                    }`}
                  >
                    <span>ALL DEALS</span>
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                <div className="flex gap-3.5 overflow-x-auto pb-3.5 category-scroll">
                  {deals.slice(0, 4).map((deal) => (
                    <div
                      key={deal.id}
                      className={`min-w-[240px] max-w-[240px] rounded-2xl p-3.5 flex flex-col justify-between flex-shrink-0 ${
                        isDark 
                          ? 'bg-[#16161b] border border-white/10 shadow-lg' 
                          : 'bg-white border border-zinc-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isDark 
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                            : 'bg-orange-100 text-orange-700 border border-orange-200'
                        }`}>
                          {deal.name}
                        </span>
                        <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                          Rs. {deal.price}
                        </span>
                      </div>

                      <div className="h-24 w-full flex items-center justify-center my-1">
                        <img
                          src={deal.image || '/assets/images/deal-1.png'}
                          alt={deal.name}
                          className="h-full object-contain drop-shadow-md"
                          onError={(e) => {
                            e.target.src = '/assets/images/deal-1.png';
                          }}
                        />
                      </div>

                      <p className={`text-[11px] line-clamp-2 my-2 min-h-[32px] ${
                        isDark ? 'text-zinc-300' : 'text-zinc-600'
                      }`}>
                        {cleanDealInclusions((deal.includes || []).join(' + '))}
                      </p>

                      <button
                        onClick={(e) => handleAddDeal(deal, e)}
                        className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Deal</span>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

        {/* VIEW B: DEDICATED CATEGORY ITEMS VIEW */}
        {currentView === 'category' && (
          <div className="space-y-4 animate-tab-fade">
            
            {/* Dedicated Back to Main Page Header Card */}
            <div 
              role="button"
              tabIndex={0}
              onClick={() => switchView('home')}
              className={`rounded-2xl p-4 border flex items-center justify-between cursor-pointer select-none active:scale-[0.99] active:opacity-85 transition-all ${
                isDark ? 'bg-[#141418] hover:bg-zinc-800/80 border-white/10' : 'bg-white hover:bg-zinc-50 border-zinc-200 shadow-2xs'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-zinc-300' : 'text-zinc-600'
                }`}
              >
                <ArrowLeft className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>Back to Main Page</span>
              </div>

              <span className="text-xs font-semibold text-orange-500">
                {searchQuery.trim() ? `${categoryProducts.length} Items Found` : `${categoryProducts.length} Items Available`}
              </span>
            </div>

            {/* Category Search Header Card */}
            <div className={`rounded-2xl p-3 sm:p-4 border ${
              isDark 
                ? 'bg-[#141418] border-white/10' 
                : 'bg-white border-zinc-200 shadow-2xs'
            }`}>
              {/* Global Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search food across all categories (Pizza, Burgers...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-16 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all ${
                    isDark 
                      ? 'bg-black/40 border-white/10 text-white placeholder-zinc-500' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                      isDark ? 'bg-zinc-800 text-zinc-300 hover:text-white' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                    }`}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal Category Switcher Bar (Pills) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-0.5 category-scroll">
              <button
                onClick={() => {
                  setSelectedCatId('all');
                  setSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                  selectedCatId === 'all' && !searchQuery.trim()
                    ? 'bg-orange-600 text-white shadow-md'
                    : isDark
                      ? 'bg-[#18181e] text-zinc-400 border border-white/5 hover:text-white'
                      : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 shadow-2xs'
                }`}
              >
                <span>🍽️</span>
                <span>ALL</span>
              </button>
              {categories.map((c) => {
                const isActive = selectedCatId === c.id && !searchQuery.trim();
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCatId(c.id);
                      setSearchQuery('');
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                      isActive
                        ? 'bg-orange-600 text-white shadow-md'
                        : isDark
                          ? 'bg-[#18181e] text-zinc-400 border border-white/5 hover:text-white'
                          : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 shadow-2xs'
                    }`}
                  >
                    <span>{categoryEmojis[c.id]}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Product Cards List */}
            {categoryProducts.length === 0 ? (
              <div className={`rounded-2xl p-8 border text-center space-y-3 ${
                isDark ? 'bg-[#141418] border-white/10' : 'bg-white border-zinc-200 shadow-2xs'
              }`}>
                <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
                  isDark ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-600'
                }`}>
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <h3 className={`text-base font-bold font-montserrat uppercase tracking-tight ${
                    isDark ? 'text-white' : 'text-zinc-900'
                  }`}>
                    No Food Items Found
                  </h3>
                  <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {searchQuery.trim()
                      ? `No dishes found matching "${searchQuery}" across any category.`
                      : 'No items available in this category yet.'}
                  </p>
                </div>
                {searchQuery.trim() && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-md cursor-pointer active:scale-95 transition-all"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {categoryProducts.map((product) => {
                  const size = getSelectedSize(product);
                  const displayPrice = size?.price !== undefined ? size.price : product.price;
                  const qty = getQty(product.id);
                  const hasSizes = product.sizes && product.sizes.length > 0;
                  const isOutOfStock = product.inStock === false;

                  return (
                    <div
                      key={product.id}
                      className={`rounded-2xl p-3.5 border ${
                        isOutOfStock 
                          ? (isDark ? 'bg-[#15151a] border-red-900/30 opacity-75' : 'bg-zinc-50 border-zinc-200 opacity-75')
                          : isDark 
                            ? 'bg-[#15151a] border-white/10 shadow-md hover:border-white/20' 
                            : 'bg-white border-zinc-200/90 shadow-xs hover:shadow-md hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex gap-3.5">
                        
                        {/* Food Image */}
                        <div className={`w-24 h-24 rounded-2xl overflow-hidden border flex-shrink-0 relative ${
                          isDark ? 'bg-black/40 border-white/5' : 'bg-zinc-50 border-zinc-200'
                        }`}>
                          <img
                            src={product.image || '/assets/images/cat-pizza-BmV7hCev.jpg'}
                            alt={product.name}
                            className={`w-full h-full object-cover rounded-xl ${isOutOfStock ? 'grayscale' : ''}`}
                            onError={(e) => {
                              e.target.src = '/assets/images/cat-pizza-BmV7hCev.jpg';
                            }}
                          />
                          {isOutOfStock && (
                            <span className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] font-bold text-red-400 uppercase tracking-wider">
                              Sold Out
                            </span>
                          )}
                          {product.tag && !isOutOfStock && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-orange-600 text-white font-bold text-[9px] uppercase tracking-wider">
                              {product.tag}
                            </span>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <h4 className={`font-bold text-base leading-tight truncate ${
                                isDark ? 'text-white' : 'text-zinc-900'
                              }`}>
                                {product.name}
                              </h4>
                              {(searchQuery.trim() || selectedCatId === 'all') && product.category && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  isDark 
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                                }}`}>
                                  {categoryEmojis[product.category] || '🍽️'} {product.category}
                                </span>
                              )}
                            </div>
                            {product.description && (
                              <p className={`text-[11px] line-clamp-2 mt-1 leading-snug ${
                                isDark ? 'text-zinc-400' : 'text-zinc-600'
                              }`}>
                                {product.description}
                              </p>
                            )}
                          </div>

                          {/* Price */}
                          <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-orange-600 font-sans font-extrabold text-base leading-none">
                              Rs. {formatPrice(displayPrice)}
                            </span>
                            {hasSizes && (
                              <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                ({size?.label || 'Regular'})
                              </span>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Sizes Selector Capsule Track (Website Design) */}
                      {hasSizes && !isOutOfStock && (
                        <div className={`mt-3 p-1 rounded-full flex items-center justify-between gap-1 border ${
                          isDark ? 'bg-zinc-800/80 border-white/10' : 'bg-[#f5f1eb] border-[#eee8df]/80'
                        }`}>
                          {product.sizes.map((s, idx) => {
                            const isSelected = (size?.label || '').toLowerCase() === s.label.toLowerCase();
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectSize(product.id, s)}
                                className={`flex-1 py-1.5 px-3 rounded-full text-[11px] font-bold uppercase tracking-wider text-center transition-all duration-200 cursor-pointer ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-[#d93409] to-[#ea580c] text-white shadow-xs'
                                    : isDark
                                      ? 'text-zinc-400 hover:text-white bg-transparent'
                                      : 'text-[#635d56] hover:text-zinc-900 bg-transparent'
                                }`}
                              >
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Bottom Add Actions */}
                      <div className={`mt-3 pt-2.5 border-t flex items-center justify-between gap-3 ${
                        isDark ? 'border-white/5' : 'border-zinc-100'
                      }`}>
                        
                        {/* Quantity Counter */}
                        {!isOutOfStock && (
                          <div className={`flex items-center gap-1.5 border rounded-xl p-0.5 ${
                            isDark ? 'bg-black/40 border-white/10' : 'bg-zinc-100 border-zinc-200'
                          }`}>
                            <button
                              onClick={() => setQty(product.id, -1)}
                              disabled={qty <= 1}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all cursor-pointer ${
                                isDark ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-800 shadow-2xs'
                              }`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className={`w-6 text-center text-xs font-bold ${
                              isDark ? 'text-white' : 'text-zinc-900'
                            }`}>
                              {qty}
                            </span>
                            <button
                              onClick={() => setQty(product.id, 1)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all cursor-pointer ${
                                isDark ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-800 shadow-2xs'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Add to Cart Button */}
                        <button
                          disabled={isOutOfStock}
                          onClick={(e) => handleAddProduct(product, e)}
                          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isOutOfStock
                              ? (isDark ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed')
                              : 'bg-orange-600 hover:bg-orange-500 text-white shadow-md active:scale-95'
                          }`}
                        >
                          {isOutOfStock ? (
                            <Ban className="w-3.5 h-3.5" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          <span>{isOutOfStock ? 'Sold Out' : `Add ${qty > 1 ? `(${qty})` : ''}`}</span>
                        </button>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* VIEW C: DEALS VIEW */}
        {currentView === 'deals' && (
          <div className="space-y-4 animate-tab-fade">
            
            <div 
              role="button"
              tabIndex={0}
              onClick={() => switchView('home')}
              className={`rounded-2xl p-4 border flex items-center justify-between cursor-pointer select-none active:scale-[0.99] active:opacity-85 transition-all ${
                isDark ? 'bg-[#141418] hover:bg-zinc-800/80 border-white/10' : 'bg-white hover:bg-zinc-50 border-zinc-200 shadow-2xs'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-zinc-300' : 'text-zinc-600'
                }`}
              >
                <ArrowLeft className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>Back to Menu</span>
              </div>

              <span className="text-xs font-semibold text-orange-500">
                {allDealsList.length} Combo Deals
              </span>
            </div>

            {/* Top Featured Deal Highlight Card */}
            {featuredDeal && (
              <div className={`rounded-3xl p-4 border shadow-xl space-y-3.5 ${
                isDark 
                  ? 'bg-gradient-to-br from-amber-950/60 via-zinc-900 to-black border-amber-500/30' 
                  : 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 border-amber-400 text-white'
              }`}>
                {/* Heading on Top */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isDark 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                      : 'bg-white/20 text-white border-white/40 backdrop-blur-xs'
                  }`}>
                    {featuredDeal.dealType === 'family' || featuredDeal.id === 'family-deal' || (featuredDeal.name && featuredDeal.name.toLowerCase().includes('family'))
                      ? '👑 MEGA FAMILY SAVER'
                      : (featuredDeal.name ? `👑 ${featuredDeal.name.toUpperCase()}` : '🔥 SPECIAL DEAL')}
                  </span>
                  <span className={`text-lg font-bold font-sans ${isDark ? 'text-amber-400' : 'text-white'}`}>
                    Rs. {formatPrice(featuredDeal.price)}
                  </span>
                </div>

                {/* Body: Items List on Left, Image on Right */}
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-white mb-2">
                      {featuredDeal.name}
                    </h3>
                    <ul className={`space-y-1.5 text-xs ${isDark ? 'text-zinc-200' : 'text-white/95'}`}>
                      {(featuredDeal.includes || []).map((itemStr, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-snug">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${isDark ? 'bg-amber-400' : 'bg-white'}`} />
                          <span className="font-medium">{cleanDealInclusions(itemStr)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center">
                    <img
                      src={featuredDeal.image || (featuredDeal.dealType === 'family' ? '/assets/deal-family.png' : '/assets/deal-1.png')}
                      alt={featuredDeal.name}
                      className="w-full h-full object-contain drop-shadow-md"
                      onError={(e) => {
                        e.target.src = featuredDeal.dealType === 'family' ? '/assets/deal-family.png' : '/assets/deal-1.png';
                      }}
                    />
                  </div>
                </div>

                {/* Add Button at Bottom */}
                <button
                  onClick={(e) => handleAddDeal(featuredDeal, e)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isDark 
                      ? 'bg-amber-500 hover:bg-amber-400 text-black' 
                      : 'bg-white hover:bg-amber-50 text-orange-800'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add {featuredDeal.name}</span>
                </button>
              </div>
            )}

            {/* Remaining Deals Grid */}
            <div className="space-y-3">
              {remainingDeals.map((deal) => (
                <div
                  key={deal.id}
                  className={`rounded-2xl p-4 border shadow-md space-y-3 ${
                    isDark ? 'bg-[#15151a] border-white/10' : 'bg-white border-zinc-200'
                  }`}
                >
                  {/* Heading on Top */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      isDark 
                        ? 'bg-orange-600/20 text-orange-400 border-orange-500/30' 
                        : 'bg-orange-100 text-orange-700 border-orange-200'
                    }`}>
                      {deal.name}
                    </span>
                    <span className={`text-base font-bold font-sans ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Rs. {formatPrice(deal.price)}
                    </span>
                  </div>

                  {/* Body: Items List on Left, Image on Right */}
                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <ul className={`flex-1 min-w-0 space-y-1.5 text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {(deal.includes || []).map((itemStr, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-snug">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                          <span className="font-medium">{cleanDealInclusions(itemStr)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center">
                      <img
                        src={deal.image || '/assets/deal-1.png'}
                        alt={deal.name}
                        className="w-full h-full object-contain drop-shadow-sm"
                        onError={(e) => {
                          e.target.src = '/assets/deal-1.png';
                        }}
                      />
                    </div>
                  </div>

                  {/* Add Button at Bottom */}
                  <button
                    onClick={(e) => handleAddDeal(deal, e)}
                    className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add {deal.name}</span>
                  </button>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW D: RECENT ORDERS & HISTORY (WITH ONE-TAP REORDER) */}
        {/* ============================================================== */}
        {currentView === 'orders' && (
          <div className="space-y-4 animate-tab-fade">
            
            {/* Header */}
            <div 
              role="button"
              tabIndex={0}
              onClick={() => switchView('home')}
              className={`rounded-2xl p-4 border flex items-center justify-between cursor-pointer select-none active:scale-[0.99] active:opacity-85 transition-all ${
                isDark ? 'bg-[#141418] hover:bg-zinc-800/80 border-white/10' : 'bg-white hover:bg-zinc-50 border-zinc-200 shadow-2xs'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-zinc-300' : 'text-zinc-600'
                }`}
              >
                <ArrowLeft className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>Back to Menu</span>
              </div>

              <span className="text-xs font-semibold text-orange-500">
                {recentOrders.length} {recentOrders.length === 1 ? 'Order' : 'Orders'}
              </span>
            </div>

            {/* Empty State */}
            {recentOrders.length === 0 ? (
              <div className={`rounded-3xl p-8 border text-center space-y-4 ${
                isDark ? 'bg-[#141418] border-white/10' : 'bg-white border-zinc-200 shadow-sm'
              }`}>
                <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center ${
                  isDark ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-600'
                }`}>
                  <PackageCheck className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className={`text-base font-bold font-montserrat uppercase tracking-tight ${
                    isDark ? 'text-white' : 'text-zinc-900'
                  }`}>
                    No Past Orders Yet
                  </h3>
                  <p className={`text-xs max-w-xs mx-auto leading-relaxed ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    Orders placed on the app will appear here with a 1-tap <strong>Reorder</strong> button to order your favorites again quickly!
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    onClick={() => switchView('home')}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    Browse Menu
                  </button>
                  <button
                    onClick={handleLoadSampleOrder}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border active:scale-95 transition-all cursor-pointer ${
                      isDark 
                        ? 'bg-zinc-800 border-white/10 text-zinc-300 hover:text-white' 
                        : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    Load Sample Order
                  </button>
                </div>
              </div>
            ) : (
              /* Recent Orders List */
              <div className="space-y-2.5 sm:space-y-3.5">
                {recentOrders.map((order, idx) => {
                  const itemsList = order.items || [];
                  const orderDate = order.createdAt 
                    ? new Date(order.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })
                    : 'Recent Order';

                  const orderItemsSubtotal = order.subtotal !== undefined
                    ? Number(order.subtotal)
                    : itemsList.reduce((sum, it) => sum + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);

                  const orderDeliveryFee = order.deliveryFee !== undefined
                    ? Number(order.deliveryFee)
                    : Math.max(0, (Number(order.total) || 0) - orderItemsSubtotal);

                  return (
                    <div
                      key={order.id || idx}
                      className={`rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3.5 border ${
                        isDark 
                          ? 'bg-[#15151a] border-white/10 shadow-lg' 
                          : 'bg-white border-zinc-200 shadow-xs'
                      }`}
                    >
                      {/* Top Order Meta */}
                      <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span className={`font-sans text-xs sm:text-sm font-semibold tracking-normal ${
                            isDark ? 'text-zinc-200' : 'text-zinc-800'
                          }`}>
                            #{order.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingReceiptOrder(order)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border active:scale-95 transition-all cursor-pointer ${
                              isDark
                                ? 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border-white/10 shadow-xs'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200 shadow-xs'
                            }`}
                          >
                            <ReceiptText className="w-3 h-3 text-orange-500" />
                            <span>Receipt</span>
                          </button>

                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${(() => {
                            const st = (order.status || 'Pending').toLowerCase();
                            if (st.includes('deliver') || st.includes('complete')) {
                              return isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            }
                            if (st.includes('out') || st.includes('way') || st.includes('ship')) {
                              return isDark ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-sky-50 text-sky-700 border-sky-200';
                            }
                            if (st.includes('prepar') || st.includes('progress') || st.includes('accept')) {
                              return isDark ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200';
                            }
                            if (st.includes('cancel') || st.includes('reject')) {
                              return isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200';
                            }
                            return isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200';
                          })()}`}>
                            {order.status || 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* Items Summary Collapsible Dropdown (with Date & View Details) */}
                      {itemsList.length > 0 ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleOrderExpanded(order.id || idx)}
                            className={`w-full my-1.5 px-3 py-1.5 sm:py-2 rounded-xl flex items-center justify-between text-xs active:scale-[0.99] transition-transform cursor-pointer ${
                              isDark 
                                ? 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5' 
                                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 min-w-0 pr-1">
                              <span className={`font-sans text-xs sm:text-sm font-semibold tracking-normal ${
                                isDark ? 'text-zinc-200' : 'text-zinc-800'
                              }`}>
                                {orderDate}
                              </span>
                              <span className={`text-[11px] font-normal truncate ${
                                isDark ? 'text-zinc-400' : 'text-zinc-500'
                              }`}>
                                • {itemsList.length} {itemsList.length === 1 ? 'Item' : 'Items'} ({expandedOrders[order.id || idx] ? 'Hide Details' : 'View Details'})
                              </span>
                            </span>
                            <ChevronDown className={`w-4 h-4 text-orange-500 shrink-0 transition-transform duration-300 ease-in-out ${
                              expandedOrders[order.id || idx] ? 'rotate-180' : 'rotate-0'
                            }`} />
                          </button>

                          {/* Smooth Collapsible Container */}
                          <div
                            className={`grid transition-all duration-300 ease-in-out ${
                              expandedOrders[order.id || idx] 
                                ? 'grid-rows-[1fr] opacity-100 mb-2' 
                                : 'grid-rows-[0fr] opacity-0 mb-0 pointer-events-none'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className={`p-3 rounded-xl space-y-2 border ${
                                isDark ? 'bg-black/40 border-white/5' : 'bg-zinc-50 border-zinc-200/60'
                              }`}>
                                {itemsList.map((item, itemIdx) => (
                                  <div key={itemIdx} className="flex items-center justify-between py-0.5 text-xs">
                                    <span className={`truncate mr-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                      <strong className="text-orange-500 font-montserrat font-bold mr-1.5">{item.quantity}x</strong>
                                      <span className="font-medium">{item.name}</span>
                                      {item.size && (
                                        <span className="text-[10px] text-zinc-400 ml-1">
                                          ({typeof item.size === 'string' ? item.size : item.size?.label})
                                        </span>
                                      )}
                                    </span>
                                    <span className={`font-montserrat font-bold text-xs flex-shrink-0 ${
                                      isDark ? 'text-zinc-300' : 'text-zinc-800'
                                    }`}>
                                      Rs. {formatPrice(item.price * item.quantity)}
                                    </span>
                                  </div>
                                ))}

                                {/* Subtotal & Delivery Charges Breakdown */}
                                <div className={`pt-2 mt-1 border-t space-y-1 text-xs ${
                                  isDark ? 'border-white/10' : 'border-zinc-200'
                                }`}>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Items Subtotal</span>
                                    <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                      Rs. {formatPrice(orderItemsSubtotal)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Delivery Charges</span>
                                    <span className={`font-semibold ${
                                      orderDeliveryFee === 0 
                                        ? 'text-emerald-500 font-bold' 
                                        : (isDark ? 'text-zinc-300' : 'text-zinc-700')
                                    }`}>
                                      {orderDeliveryFee === 0 ? 'FREE' : `Rs. ${formatPrice(orderDeliveryFee)}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="py-1">
                          <span className={`font-sans text-xs sm:text-sm font-semibold tracking-normal ${
                            isDark ? 'text-zinc-200' : 'text-zinc-800'
                          }`}>
                            {orderDate}
                          </span>
                        </div>
                      )}

                      {/* Order Footer: Total & REORDER Button */}
                      <div className="flex items-center justify-between pt-1 gap-3">
                        <div>
                          <span className="font-sans text-base sm:text-lg font-extrabold text-orange-600 leading-tight">
                            Rs. {formatPrice(order.total)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {String(order.status || '').toLowerCase() === 'delivered' && (
                            <>
                              {!reviewedOrderIds.includes(String(order.id)) && (
                                <button
                                  type="button"
                                  onClick={() => switchView('add-review')}
                                  className="px-2.5 py-1.5 sm:py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold text-xs uppercase tracking-wider flex items-center gap-1 border border-amber-500/25 active:scale-95 transition-all cursor-pointer"
                                >
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  <span>Add Review</span>
                                </button>
                              )}

                              {/* REORDER BUTTON */}
                              <button
                                type="button"
                                onClick={() => handleReorderOrder(order)}
                                className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform flex items-center gap-1.5 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Reorder</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW E: ADD REVIEW / ORDER FEEDBACK */}
        {/* ============================================================== */}
        {currentView === 'add-review' && (
          <div className="space-y-4 animate-tab-fade">
            
            {/* Header: Back to Previous View & Pending Count */}
            <div 
              role="button"
              tabIndex={0}
              onClick={() => switchView(previousView && previousView !== 'add-review' ? previousView : 'orders')}
              className={`rounded-2xl p-4 border flex items-center justify-between cursor-pointer select-none active:scale-[0.99] active:opacity-85 transition-all ${
                isDark ? 'bg-[#141418] hover:bg-zinc-800/80 border-white/10' : 'bg-white hover:bg-zinc-50 border-zinc-200 shadow-2xs'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-zinc-300' : 'text-zinc-600'
                }`}
              >
                <ArrowLeft className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>{previousView === 'home' ? 'Back to Menu' : previousView === 'orders' ? 'Back to Recent Orders' : 'Back to Orders'}</span>
              </div>

              <span className="text-xs font-semibold text-orange-500">
                {pendingReviewsCount} {pendingReviewsCount === 1 ? 'Pending Review' : 'Pending Reviews'}
              </span>
            </div>

            {/* Intro Hero Banner */}
            <div className={`rounded-3xl p-5 border relative overflow-hidden ${
              isDark 
                ? 'bg-gradient-to-r from-orange-950/40 via-[#181820] to-amber-950/30 border-white/10' 
                : 'bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/50 border-orange-200/70 shadow-xs'
            }`}>
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                </div>
                <div className="space-y-1">
                  <h3 className={`text-base font-extrabold uppercase tracking-tight ${
                    isDark ? 'text-white' : 'text-zinc-900'
                  }`}>
                    Order Feedback & Reviews
                  </h3>
                  <p className={`text-xs leading-relaxed ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    Share your experience for your recent orders. Each order can be reviewed once and helps us serve you better!
                  </p>
                </div>
              </div>
            </div>

            {/* Empty State when no pending reviews */}
            {pendingReviewsCount === 0 ? (
              <div className={`rounded-3xl p-8 border text-center space-y-4 ${
                isDark ? 'bg-[#141418] border-white/10' : 'bg-white border-zinc-200 shadow-sm'
              }`}>
                <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center ${
                  isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className={`text-base font-bold font-montserrat uppercase tracking-tight ${
                    isDark ? 'text-white' : 'text-zinc-900'
                  }`}>
                    All Caught Up!
                  </h3>
                  <p className={`text-xs max-w-xs mx-auto leading-relaxed ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    {recentOrders.length === 0 
                      ? 'You have no past orders yet. Place an order to submit reviews!'
                      : 'You have reviewed all your recent orders. Thank you for your valuable feedback!'}
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    onClick={() => switchView('home')}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    Browse Menu
                  </button>
                  <button
                    onClick={() => switchView('orders')}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border active:scale-95 transition-all cursor-pointer ${
                      isDark 
                        ? 'bg-zinc-800 border-white/10 text-zinc-300 hover:text-white' 
                        : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    View Past Orders
                  </button>
                </div>
              </div>
            ) : (
              /* Pending Review Orders List */
              <div className="space-y-3.5">
                {pendingReviewOrders.map((order, idx) => {
                  const itemsList = order.items || [];
                  const orderDate = order.createdAt 
                    ? new Date(order.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })
                    : 'Recent Order';

                  const rating = getOrderRating(order.id);
                  const comment = getOrderComment(order.id);

                  const ratingDescriptions = {
                    5: 'Outstanding! Highly Recommended',
                    4: 'Very Good! Loved the food',
                    3: 'Average / Okay experience',
                    2: 'Below Average, needs work',
                    1: 'Not Satisfied'
                  };

                  return (
                    <div
                      key={order.id || idx}
                      className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                        isDark 
                          ? 'bg-[#15151a] border-white/10 shadow-lg' 
                          : 'bg-white border-zinc-200 shadow-xs'
                      }`}
                    >
                      {/* Top Order Information */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span className={`font-sans font-bold text-xs sm:text-sm ${
                            isDark ? 'text-white' : 'text-zinc-900'
                          }`}>
                            #{order.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`font-sans text-[11px] sm:text-xs font-medium ${
                            isDark ? 'text-zinc-400' : 'text-zinc-500'
                          }`}>
                            {orderDate}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold text-[10px] uppercase tracking-wider border border-amber-500/20">
                            Pending Review
                          </span>
                        </div>
                      </div>

                      {/* Items Ordered Pill Summary */}
                      <div className="py-3 border-b border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            Items Ordered:
                          </span>
                          <span className="font-extrabold text-orange-500">
                            Rs. {formatPrice(order.total || 0)}
                          </span>
                        </div>
                        <p className={`text-xs line-clamp-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          {itemsList.map(it => `${it.quantity || 1}x ${it.name}`).join(' • ') || 'Order items'}
                        </p>
                      </div>

                      {/* Interactive Rating Selection */}
                      <div className="pt-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold uppercase tracking-wider ${
                            isDark ? 'text-zinc-300' : 'text-zinc-700'
                          }`}>
                            Your Rating:
                          </span>
                          <span className="text-xs font-semibold text-amber-400">
                            {ratingDescriptions[rating] || `${rating} Stars`}
                          </span>
                        </div>

                        {/* Star Buttons */}
                        <div className="flex items-center gap-2 py-1">
                          {[1, 2, 3, 4, 5].map((starNum) => {
                            const isFilled = starNum <= rating;
                            return (
                              <button
                                key={starNum}
                                type="button"
                                onClick={() => setOrderRating(order.id, starNum)}
                                className="p-1 sm:p-1.5 rounded-xl hover:bg-amber-500/10 active:scale-90 transition-transform cursor-pointer"
                                aria-label={`Rate ${starNum} stars`}
                              >
                                <Star
                                  className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                                    isFilled 
                                      ? 'text-amber-400 fill-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]' 
                                      : isDark ? 'text-zinc-700' : 'text-zinc-300'
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Feedback Comment Textarea */}
                      <div className="pt-3 space-y-1.5">
                        <label className={`text-[11px] font-bold uppercase tracking-wider block ${
                          isDark ? 'text-zinc-400' : 'text-zinc-600'
                        }`}>
                          Write Feedback (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={comment}
                          onChange={(e) => setOrderComment(order.id, e.target.value)}
                          placeholder="Tell us about the taste, packaging, and delivery speed..."
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs resize-none transition-all outline-none border focus:border-orange-500 focus:ring-1 focus:ring-orange-500 ${
                            isDark 
                              ? 'bg-[#1b1b22] border-white/10 text-white placeholder-zinc-500' 
                              : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                          }`}
                        />
                      </div>

                      {/* Submit Action */}
                      <div className="pt-3.5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleInitiateReviewSubmit(order)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Review</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW F: MOBILE CHECKOUT VIEW */}
        {/* ============================================================== */}
        {currentView === 'checkout' && (
          <div className="space-y-4 animate-tab-fade">
            
            <div 
              role="button"
              tabIndex={0}
              onClick={() => {
                switchView('home');
                setIsCartOpen(true);
              }}
              className={`rounded-2xl p-4 border flex items-center justify-between cursor-pointer select-none active:scale-[0.99] active:opacity-85 transition-all ${
                isDark ? 'bg-[#141418] hover:bg-zinc-800/80 border-white/10' : 'bg-white hover:bg-zinc-50 border-zinc-200 shadow-2xs'
              }`}
            >
              <div
                className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                  isDark ? 'text-zinc-300' : 'text-zinc-600'
                }`}
              >
                <ArrowLeft className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>Back to Cart</span>
              </div>

              <span className="text-xs font-bold text-orange-500">
                Checkout ({totalItems} items)
              </span>
            </div>

            {/* Error Alert */}
            {checkoutError && (
              <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Delivery Form */}
            <form onSubmit={handleMobileOnlineOrder} className={`rounded-2xl p-4 sm:p-5 border space-y-4 ${
              isDark ? 'bg-[#15151a] border-white/10 shadow-lg' : 'bg-white border-zinc-200 shadow-sm'
            }`}>
              <h3 className={`font-montserrat text-base uppercase tracking-tight font-extrabold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                Delivery Details
              </h3>

              {customerUser && (
                <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                  isDark ? 'bg-orange-950/20 border-orange-500/30 text-zinc-300' : 'bg-orange-50 border-orange-200 text-zinc-800'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {customerUser.picture ? (
                      <img src={customerUser.picture} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <User className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    )}
                    <span className="truncate">Ordering as <strong>{customerUser.name}</strong></span>
                  </div>
                  <span className="text-[10px] text-orange-500 font-bold uppercase flex-shrink-0">Google Verified</span>
                </div>
              )}

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={checkoutForm.name}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })}
                  placeholder="e.g. M. Salik"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    isDark 
                      ? 'bg-black/40 border-white/10 text-white placeholder-zinc-500' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  required
                  value={checkoutForm.phone}
                  onChange={(e) => setCheckoutForm({ 
                    ...checkoutForm, 
                    phone: e.target.value.replace(/\D/g, '').slice(0, 11) 
                  })}
                  placeholder="03001234567"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 font-montserrat tracking-wide ${
                    isDark 
                      ? 'bg-black/40 border-white/10 text-white placeholder-zinc-500' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Delivery Address *
                </label>
                <input
                  type="text"
                  required
                  value={checkoutForm.address}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                  placeholder="House #, Street, Area in Wah Cantt"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    isDark 
                      ? 'bg-black/40 border-white/10 text-white placeholder-zinc-500' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Special Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={checkoutForm.notes}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })}
                  placeholder="Extra spicy, less sauce, ring bell twice..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    isDark 
                      ? 'bg-black/40 border-white/10 text-white placeholder-zinc-500' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutForm(prev => ({ ...prev, paymentMethod: 'Cash on Delivery' }))}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer ${
                      checkoutForm.paymentMethod === 'Cash on Delivery'
                        ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                        : isDark
                          ? 'bg-black/40 border-white/10 text-zinc-300 hover:bg-white/5'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      checkoutForm.paymentMethod === 'Cash on Delivery' ? 'border-white bg-white' : 'border-zinc-400'
                    }`}>
                      {checkoutForm.paymentMethod === 'Cash on Delivery' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                      )}
                    </span>
                    <span>Cash on Delivery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCheckoutForm(prev => ({ ...prev, paymentMethod: 'Easypaisa' }))}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer ${
                      checkoutForm.paymentMethod === 'Easypaisa'
                        ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                        : isDark
                          ? 'bg-black/40 border-white/10 text-zinc-300 hover:bg-white/5'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      checkoutForm.paymentMethod === 'Easypaisa' ? 'border-white bg-white' : 'border-zinc-400'
                    }`}>
                      {checkoutForm.paymentMethod === 'Easypaisa' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                      )}
                    </span>
                    <span>Easypaisa</span>
                  </button>
                </div>
              </div>

              {/* Order Bill Summary */}
              <div className={`p-3.5 rounded-xl space-y-1.5 text-xs ${
                isDark ? 'bg-black/40 border border-white/5' : 'bg-zinc-50 border border-zinc-200'
              }`}>
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Rs. {formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Delivery Fee</span>
                  <span className={`font-semibold ${(deliveryFee === 0 || isFreeDelivery) ? 'text-emerald-500 font-bold' : (isDark ? 'text-white' : 'text-zinc-900')}`}>
                    {(deliveryFee === 0 || isFreeDelivery) ? 'FREE' : `Rs. ${formatPrice(deliveryFee)}`}
                  </span>
                </div>
                <div className={`flex justify-between items-baseline pt-2 border-t ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
                  <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>Total Amount</span>
                  <span className="font-montserrat text-xl font-bold text-orange-500">
                    Rs. {formatPrice(total)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={checkoutSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{checkoutSubmitting ? 'Placing Order...' : 'Confirm & Place Order'}</span>
                </button>
              </div>
            </form>

          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* 4. FLOATING CART ACTION BUTTON (Bottom-Right FAB) */}
      {/* ============================================================== */}
      {currentView !== 'checkout' && (
        <div className="fixed right-4 z-40 mobile-floating-cart">
          <button
            id="floating-cart-btn"
            onClick={() => setIsCartOpen(true)}
            className={`relative w-14 h-14 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 text-white shadow-2xl border-2 border-white/30 flex items-center justify-center active:scale-90 transition-all duration-200 cursor-pointer group ${
              totalItems > 0 
                ? 'animate-reminder-bounce shadow-[0_10px_28px_rgba(234,88,12,0.65)]' 
                : 'shadow-[0_8px_20px_rgba(0,0,0,0.3)]'
            }`}
            aria-label={`Cart with ${totalItems} items`}
            title={`Cart: ${totalItems} items (Rs. ${formatPrice(totalPrice)})`}
          >
            {/* Subtle pulsating radar ripple ring when cart has items */}
            {totalItems > 0 && (
              <span 
                className="absolute inset-0 rounded-full bg-orange-500 opacity-40 animate-ping pointer-events-none" 
                style={{ animationDuration: '2.8s' }} 
              />
            )}

            <div className="relative flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white drop-shadow-sm group-hover:scale-105 transition-transform" strokeWidth={2.3} />
              
              {/* Badge count */}
              {totalItems > 0 && (
                <span className="absolute -top-3 -right-3.5 bg-black text-white text-[11px] font-bold font-montserrat min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-scale-in">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. SIDE DRAWER MENU (Smooth Slide-In & Slide-Out Animation) */}
      {/* ============================================================== */}
      <div 
        className={`fixed inset-0 z-50 flex transition-all duration-300 ease-in-out ${
          mobileMenuOpen 
            ? 'opacity-100 pointer-events-auto visible' 
            : 'opacity-0 pointer-events-none invisible'
        }`}
      >
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className={`fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`} 
        />
        
        <div className={`relative ml-auto w-4/5 max-w-sm h-full border-l px-6 flex flex-col justify-between shadow-2xl z-10 transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] mobile-side-drawer-top mobile-side-drawer-bottom ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        } ${
          isDark ? 'bg-[#121216] border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'
        }`}>
            <div className="space-y-5">
              
              {/* Drawer Top Header */}
              <div className={`flex items-center justify-between pb-4 border-b ${
                isDark ? 'border-white/10' : 'border-zinc-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/salik-logo.png"
                    alt="Salik Fast Food"
                    className="w-10 h-10 object-contain rounded-full border border-orange-500/50"
                  />
                  <div>
                    <h3 className={`font-montserrat tracking-tight font-bold leading-tight ${
                      isDark ? 'text-white' : 'text-zinc-900'
                    }`}>
                      SALIK FAST FOOD
                    </h3>
                    <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Wah Cantt
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-90 ${
                    isDark ? 'bg-white/10 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Links: Home, Deals, Menu, RECENT ORDERS */}
              <nav className="space-y-2.5">
                <button
                  onClick={() => {
                    switchView('home');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl font-bold text-[13px] uppercase tracking-wide flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer ${
                    currentView === 'home'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 whitespace-nowrap">
                    <span className="text-base shrink-0">🏠</span>
                    <span className="truncate">Home & Categories</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 ml-1" />
                </button>

                <button
                  onClick={() => {
                    switchView('deals');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl font-bold text-[13px] uppercase tracking-wide flex items-center justify-between border active:scale-[0.98] transition-transform cursor-pointer ${
                    currentView === 'deals'
                      ? 'bg-orange-600 text-white shadow-sm border-orange-500'
                      : isDark 
                        ? 'bg-orange-600/15 text-orange-400 border-orange-500/30' 
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 whitespace-nowrap">
                    <Flame className="w-4.5 h-4.5 fill-orange-500 text-orange-500 shrink-0" />
                    <span className="truncate">Saver Deals</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-orange-500 shrink-0 ml-1" />
                </button>

                <button
                  onClick={() => {
                    switchView('category', 'all');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl font-bold text-[13px] uppercase tracking-wide flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer ${
                    currentView === 'category'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 whitespace-nowrap">
                    <span className="text-base shrink-0">🍽️</span>
                    <span className="truncate">Explore Menu</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 ml-1" />
                </button>

                {/* RECENT ORDERS */}
                <button
                  onClick={() => {
                    switchView('orders');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl font-bold text-[13px] uppercase tracking-wide flex items-center justify-between border active:scale-[0.98] transition-transform cursor-pointer ${
                    currentView === 'orders'
                      ? 'bg-orange-600 text-white shadow-sm border-orange-500'
                      : isDark 
                        ? 'bg-white/5 hover:bg-white/10 text-white border-white/5' 
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 whitespace-nowrap">
                    <RotateCcw className="w-4.5 h-4.5 text-orange-500 shrink-0" />
                    <span className="truncate">Recent Orders</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    {recentOrders.length > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-600 text-white font-bold">
                        {recentOrders.length}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                </button>

                {/* ADD REVIEW */}
                <button
                  onClick={() => {
                    switchView('add-review');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl font-bold text-[13px] uppercase tracking-wide flex items-center justify-between border active:scale-[0.98] transition-transform cursor-pointer ${
                    currentView === 'add-review'
                      ? 'bg-orange-600 text-white shadow-sm border-orange-500'
                      : isDark 
                        ? 'bg-white/5 hover:bg-white/10 text-white border-white/5' 
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0 whitespace-nowrap">
                    <Star className="w-4.5 h-4.5 text-amber-400 fill-amber-400 shrink-0" />
                    <span className="truncate">Add Review</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    {pendingReviewsCount > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-600 text-white font-bold">
                        {pendingReviewsCount}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                </button>
              </nav>

            </div>

            {/* Bottom Quick Contact & Account Actions */}
            <div className={`space-y-2 pt-4 border-t ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
              <a
                href="https://wa.me/923095369472"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-transform cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white" />
                <span>WhatsApp Order</span>
              </a>
              <a
                href="tel:03095369472"
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all border shadow-xs ${
                  isDark
                    ? 'bg-zinc-800/90 hover:bg-zinc-700 text-white border-zinc-700/80 shadow-black/40'
                    : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-300/90 shadow-zinc-200'
                }`}
              >
                <Phone className="w-4 h-4 text-orange-600 stroke-[2.2]" />
                <span>Call Now</span>
              </a>

              {/* Google Login / Authenticated User Profile */}
              {customerUser ? (
                <div className={`p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between gap-2.5 ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    {customerUser.picture ? (
                      <img
                        src={customerUser.picture}
                        alt={customerUser.name}
                        className="w-9 h-9 rounded-full object-cover border border-orange-500/60 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white font-bold flex items-center justify-center text-sm flex-shrink-0 shadow-xs">
                        {customerUser.name?.[0] || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                          {customerUser.name}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="Active" />
                      </div>
                      <div className={`text-[10px] truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        {customerUser.email || 'Logged in with Google'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCustomerLogout}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer active:scale-95 flex-shrink-0 ${
                      isDark 
                        ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' 
                        : 'border-red-200 text-red-600 hover:bg-red-50'
                    }`}
                    title="Sign Out"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xs active:scale-98 transition-transform cursor-pointer ${
                    isDark 
                      ? 'bg-white hover:bg-zinc-100 text-zinc-900' 
                      : 'bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300'
                  }`}
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
                  <span>{googleLoading ? 'Connecting...' : 'Login with Google'}</span>
                </button>
              )}

              {/* Neumorphic Theme Mode Toggle (below Login with Google) */}
              <div className="pt-2">
                <div 
                  onClick={toggleTheme}
                  role="button"
                  tabIndex={0}
                  aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-between cursor-pointer select-none transition-all duration-300 active:scale-[0.98] ${
                    isDark 
                      ? 'bg-[#1e232d] border border-white/5 shadow-inner' 
                      : 'bg-[#edf0f5] border border-zinc-200/90 shadow-2xs'
                  }`}
                >
                  {/* Sun Icon (Left Side) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDark) toggleTheme();
                    }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                      !isDark 
                        ? 'bg-amber-400/20 text-amber-500 shadow-2xs scale-105' 
                        : 'text-zinc-500/50 hover:text-zinc-400 hover:bg-white/5'
                    }`}
                    title="Light Mode"
                    aria-label="Light Mode"
                  >
                    <Sun className={`w-5 h-5 transition-transform duration-300 ${!isDark ? 'text-amber-500 fill-amber-400 rotate-0' : 'text-zinc-500/60 -rotate-45'}`} />
                  </button>

                  {/* Inset Neumorphic Track (Center) */}
                  <div 
                    className={`relative w-20 h-10 rounded-full p-1 transition-all duration-300 flex items-center shrink-0 ${
                      isDark 
                        ? 'bg-[#141720] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_3px_rgba(255,255,255,0.06)]' 
                        : 'bg-[#d5dae3] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.18),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]'
                    }`}
                  >
                    {/* Floating Sliding Knob */}
                    <div 
                      className={`w-8 h-8 rounded-full transition-transform duration-300 ease-out transform ${
                        isDark 
                          ? 'translate-x-10 bg-[#4f5768] shadow-[2px_3px_8px_rgba(0,0,0,0.6),-1px_-1px_3px_rgba(255,255,255,0.08)]' 
                          : 'translate-x-0 bg-[#ffffff] shadow-[2px_3px_6px_rgba(0,0,0,0.18),-1px_-1px_2px_rgba(255,255,255,0.9)]'
                      }`}
                    />
                  </div>

                  {/* Crescent Moon Icon (Right Side) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDark) toggleTheme();
                    }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                      isDark 
                        ? 'bg-amber-400/15 text-amber-300 shadow-2xs scale-105' 
                        : 'text-zinc-400/50 hover:text-zinc-600 hover:bg-black/5'
                    }`}
                    title="Dark Mode"
                    aria-label="Dark Mode"
                  >
                    <svg className={`w-5 h-5 transition-transform duration-300 ${isDark ? 'text-amber-300 fill-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.4)] rotate-0' : 'text-zinc-400/60 fill-zinc-400/60 rotate-12'}`} viewBox="0 0 24 24">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      {/* Cart & Modals */}
      <CartDrawer isDark={isDark} />
      <OrderSuccessModal />

      {/* ============================================================== */}
      {/* 6. GOOGLE SIGN-IN SETUP & DEMO MODAL */}
      {/* ============================================================== */}
      {showGoogleSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
            onClick={() => setShowGoogleSetupModal(false)}
          />

          <div className={`relative w-full max-w-sm rounded-3xl p-5 sm:p-6 border shadow-2xl z-10 space-y-4 animate-scale-in ${
            isDark ? 'bg-[#15151a] border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white p-1.5 flex items-center justify-center shadow-xs">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-montserrat font-bold text-sm leading-tight">Google Sign-In</h3>
                  <span className="text-[10px] text-orange-500 font-semibold uppercase">Configuration Ready</span>
                </div>
              </div>
              <button
                onClick={() => setShowGoogleSetupModal(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer ${
                  isDark ? 'bg-white/10 text-zinc-300 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:text-black'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`p-3.5 rounded-2xl text-xs space-y-2 leading-relaxed ${
              isDark ? 'bg-white/5 border border-white/5 text-zinc-300' : 'bg-zinc-50 border border-zinc-200 text-zinc-700'
            }`}>
              <p className="font-semibold text-orange-500">
                To connect your Google account:
              </p>
              <p>
                Provide your <strong>Google OAuth Web Client ID</strong> in your <code className="bg-orange-500/20 px-1 py-0.5 rounded text-[11px] text-orange-400">.env</code> file:
              </p>
              <div className="p-2 rounded-xl bg-black/50 border border-white/10 font-mono text-[10px] text-amber-300 break-all select-all">
                VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
              </div>
              <p className="text-[11px] text-zinc-400">
                You can get this free from Google Cloud Console &gt; APIs &amp; Services &gt; Credentials &gt; OAuth 2.0 Client IDs.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSetDemoUser}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Try Demo Account Login</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGoogleSetupModal(false)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border cursor-pointer active:scale-95 transition-transform ${
                  isDark ? 'border-white/10 hover:bg-white/5 text-zinc-400' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-600'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. ORDER CONFIRMATION MODAL */}
      {/* ============================================================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <div
            onClick={() => !checkoutSubmitting && setShowConfirmModal(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity duration-200 animate-tab-fade"
          />

          {/* Modal Card */}
          <div className={`relative w-full max-w-sm rounded-3xl p-5 sm:p-6 border shadow-2xl z-10 animate-scale-in max-h-[90vh] overflow-y-auto modal-items-scroll ${
            isDark ? 'bg-[#15151a] border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'
          }`}>
            {/* Close Button */}
            <button
              type="button"
              onClick={() => !checkoutSubmitting && setShowConfirmModal(false)}
              disabled={checkoutSubmitting}
              className={`absolute top-4 right-4 p-2 rounded-xl transition-colors disabled:opacity-40 cursor-pointer ${
                isDark ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              aria-label="Close confirmation modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2.5 bg-orange-500/15 border border-orange-500/30 text-orange-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <h3 className={`font-montserrat font-extrabold text-lg uppercase tracking-tight ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                Review Your Order
              </h3>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Please verify your details before placing the order.
              </p>
            </div>

            {/* Customer & Address Review Box */}
            <div className={`rounded-2xl p-3.5 border text-xs space-y-2 mb-3.5 ${
              isDark ? 'bg-black/40 border-white/10' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div className={`flex items-center justify-between pb-1.5 border-b ${
                isDark ? 'border-white/5' : 'border-zinc-200'
              }`}>
                <span className={`flex items-center gap-1.5 text-[11px] ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                  <User className="w-3.5 h-3.5 text-orange-500" /> Customer
                </span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {checkoutForm.name}
                </span>
              </div>

              <div className={`flex items-center justify-between pb-1.5 border-b ${
                isDark ? 'border-white/5' : 'border-zinc-200'
              }`}>
                <span className={`flex items-center gap-1.5 text-[11px] ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                  <Phone className="w-3.5 h-3.5 text-orange-500" /> Phone
                </span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {checkoutForm.phone}
                </span>
              </div>

              <div className={`flex items-start justify-between pb-1.5 border-b ${
                isDark ? 'border-white/5' : 'border-zinc-200'
              }`}>
                <span className={`flex items-center gap-1.5 text-[11px] flex-shrink-0 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}>
                  <MapPin className="w-3.5 h-3.5 text-orange-500" /> Address
                </span>
                <span className={`font-semibold text-right max-w-[180px] leading-tight text-[11px] ${
                  isDark ? 'text-zinc-200' : 'text-zinc-700'
                }`}>
                  {checkoutForm.address || 'Wah Cantt'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Payment</span>
                <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {checkoutForm.paymentMethod}
                </span>
              </div>

              {checkoutForm.notes && (
                <div className={`pt-1.5 border-t text-[11px] italic ${
                  isDark ? 'border-white/5 text-zinc-400' : 'border-zinc-200 text-zinc-500'
                }`}>
                  <strong className={`not-italic font-semibold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Note: </strong>
                  {checkoutForm.notes}
                </div>
              )}
            </div>

            {/* Items Summary & Total Box */}
            <div className={`rounded-2xl p-3.5 border text-xs space-y-2 mb-4 ${
              isDark ? 'bg-black/40 border-white/10' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-wider pb-1 border-b ${
                isDark ? 'text-zinc-400 border-white/5' : 'text-zinc-500 border-zinc-200'
              }`}>
                <span>Selected Items ({cartItems.reduce((s, i) => s + (i.quantity || 1), 0)})</span>
                <span>Price</span>
              </div>

              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 py-0.5 modal-items-scroll">
                {cartItems.map((item, idx) => (
                  <div key={item.cartKey || item.id || idx} className="flex justify-between items-start text-[11px]">
                    <div className="truncate max-w-[190px]">
                      <div>
                        <strong className={isDark ? 'text-white' : 'text-zinc-900'}>{item.quantity || 1}×</strong>{' '}
                        <span className={isDark ? 'text-zinc-300' : 'text-zinc-800'}>{item.name}</span>
                        {item.size && (
                          <span className="text-orange-500 text-[10px] ml-1">({typeof item.size === 'object' ? item.size.label : item.size})</span>
                        )}
                      </div>
                      {Boolean(item.description || item.includes) && (
                        <div className={`text-[9.5px] line-clamp-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {cleanDealInclusions(item.description || (Array.isArray(item.includes) ? item.includes.join(' + ') : item.includes))}
                        </div>
                      )}
                    </div>
                    <span className={`font-semibold flex-shrink-0 ml-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                      Rs. {formatPrice((item.price || 0) * (item.quantity || 1))}
                    </span>
                  </div>
                ))}
              </div>

              <div className={`pt-2 border-t space-y-1 text-[11px] ${
                isDark ? 'border-white/5 text-zinc-400' : 'border-zinc-200 text-zinc-500'
              }`}>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-800'}`}>Rs. {formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className={(deliveryFee === 0 || isFreeDelivery) ? 'text-emerald-500 font-bold' : (isDark ? 'text-white' : 'text-zinc-800 font-semibold')}>
                    {(deliveryFee === 0 || isFreeDelivery) ? 'FREE' : `Rs. ${formatPrice(deliveryFee)}`}
                  </span>
                </div>
              </div>

              <div className={`pt-2 border-t flex justify-between items-baseline font-montserrat ${
                isDark ? 'border-white/10' : 'border-zinc-200'
              }`}>
                <span className={`text-xs uppercase tracking-wider font-semibold ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  TOTAL TO PAY
                </span>
                <span className="text-lg font-extrabold text-orange-500">
                  Rs. {formatPrice(total)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={executeMobileOnlineOrder}
                disabled={checkoutSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{checkoutSubmitting ? 'Placing Order...' : 'Yes, Confirm & Place Order'}</span>
              </button>

              <button
                type="button"
                onClick={() => !checkoutSubmitting && setShowConfirmModal(false)}
                disabled={checkoutSubmitting}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer ${
                  isDark 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white' 
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900'
                }`}
              >
                Change / Edit Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Receipt Modal */}
      {viewingReceiptOrder && (
        <CustomerReceiptModal
          order={viewingReceiptOrder}
          onClose={() => setViewingReceiptOrder(null)}
        />
      )}

      {/* ============================================================== */}
      {/* 8. REVIEW CONFIRMATION MODAL */}
      {/* ============================================================== */}
      {reviewToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={() => !submittingReview && setReviewToConfirm(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity duration-200 animate-tab-fade"
          />

          {/* Modal Card */}
          <div className={`relative w-full max-w-sm rounded-3xl p-5 sm:p-6 border shadow-2xl z-10 animate-scale-in ${
            isDark ? 'bg-[#15151a] border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'
          }`}>
            <button
              type="button"
              onClick={() => !submittingReview && setReviewToConfirm(null)}
              disabled={submittingReview}
              className={`absolute top-4 right-4 p-2 rounded-xl transition-colors disabled:opacity-40 cursor-pointer ${
                isDark ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
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
              <h3 className={`font-montserrat font-extrabold text-lg uppercase tracking-tight ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                Confirm Review Submission
              </h3>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Are you sure you want to submit this feedback for Order #{reviewToConfirm.order.id}?
              </p>
            </div>

            {/* Review Summary Box */}
            <div className={`rounded-2xl p-3.5 border text-xs space-y-2 mb-4 ${
              isDark ? 'bg-black/40 border-white/10' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Rating
                </span>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < reviewToConfirm.rating 
                          ? 'fill-amber-400 text-amber-400' 
                          : isDark ? 'text-zinc-700' : 'text-zinc-300'
                      }`}
                    />
                  ))}
                  <span className="font-bold ml-1 text-amber-500">
                    ({reviewToConfirm.rating}/5)
                  </span>
                </div>
              </div>

              <div className="flex items-start justify-between pb-1.5 border-b border-white/5 gap-2">
                <span className={`text-[11px] flex-shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Items
                </span>
                <span className={`font-semibold text-right text-[11px] line-clamp-1 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {reviewToConfirm.order.items?.map(it => `${it.quantity || 1}x ${it.name}`).join(', ') || `Order #${reviewToConfirm.order.id}`}
                </span>
              </div>

              <div>
                <span className={`text-[10px] block mb-1 uppercase font-bold tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Comment
                </span>
                <p className={`text-[11px] italic p-2 rounded-lg border ${
                  isDark ? 'bg-zinc-900 border-white/5 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700'
                }`}>
                  {reviewToConfirm.comment.trim() ? `"${reviewToConfirm.comment.trim()}"` : '-'}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setReviewToConfirm(null)}
                disabled={submittingReview}
                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider border active:scale-95 transition-all cursor-pointer ${
                  isDark 
                    ? 'bg-zinc-800 border-white/10 text-zinc-300 hover:text-white' 
                    : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReviewSubmit}
                disabled={submittingReview}
                className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {submittingReview ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

      {/* ============================================================== */}
      {/* 9. ANIMATED THANK YOU SUCCESS POPUP */}
      {/* ============================================================== */}
      {reviewSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with fade-in */}
          <div
            onClick={() => setReviewSuccessData(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity duration-300 animate-tab-fade"
          />

          {/* Celebration Card with smooth scale-in */}
          <div className={`relative w-full max-w-sm rounded-3xl p-6 sm:p-7 border shadow-2xl z-10 text-center space-y-4 animate-scale-in ${
            isDark 
              ? 'bg-[#15151a] border-white/15 text-white' 
              : 'bg-white border-zinc-200 text-zinc-900 shadow-2xl'
          }`}>
            {/* Glowing animated badge */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                <span>Feedback Received</span>
              </div>
              <h3 className={`font-montserrat font-extrabold text-lg uppercase tracking-tight ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                Thank You for Your Review!
              </h3>
              <p className={`text-xs max-w-xs mx-auto leading-relaxed ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}>
                Your feedback for Order #{reviewSuccessData.orderId} has been successfully submitted to Salik Fast Food. We truly appreciate your support!
              </p>
            </div>

            {/* Stars summary */}
            <div className="flex items-center justify-center gap-1 text-amber-400 py-1">
              {[...Array(reviewSuccessData.rating || 5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400 animate-scale-in" />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setReviewSuccessData(null)}
              className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Real-time Order Status Notification Banner */}
      <CustomerNotificationBanner onTrackOrder={() => switchView('orders')} />

    </div>
  );
}
