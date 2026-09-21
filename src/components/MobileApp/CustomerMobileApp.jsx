import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, ArrowLeft, Plus, Minus, Flame, 
  MessageCircle, Menu, X, ShoppingBag, 
  Clock, MapPin, ChevronRight, ChevronDown, Check, Sparkles, Phone,
  Sun, Moon, RotateCcw, PackageCheck, Receipt, AlertCircle, Ban
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { apiUrl } from '../../config/api';
import WhatsAppIcon from '../WhatsAppIcon';
import CartDrawer from '../CartDrawer';
import OrderSuccessModal from '../OrderSuccessModal';

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
    setIsCartOpen,
    recentOrders = [],
    saveRecentOrder,
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
    setOrderModalOpen
  } = useCart();

  const totalItems = rawTotalItems || itemCount || (cartItems || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
  const totalPrice = rawTotalPrice || total || subtotal;

  // Theme state: 'dark' | 'light' (persisted in localStorage)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_app_theme');
      return saved === 'light' || saved === 'dark' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('salik_app_theme', theme);
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  const isDark = theme === 'dark';
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Navigation states: 'home' | 'category' | 'deals' | 'orders' | 'checkout'
  const [currentView, setCurrentView] = useState('home');
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

  // Listen for checkout click from CartDrawer
  useEffect(() => {
    const handleOpenCheckout = () => {
      switchView('checkout');
    };
    window.addEventListener('salik_open_checkout', handleOpenCheckout);
    return () => window.removeEventListener('salik_open_checkout', handleOpenCheckout);
  }, []);

  // Lock background scroll and handle ESC key when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

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
    addToCart({
      id: deal.id,
      name: deal.name,
      price: deal.price,
      image: deal.image || '/assets/images/deal-1.png',
      category: 'deals',
      description: (deal.includes || []).join(' + ')
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

  // Mobile Checkout Submit
  const handleMobileOnlineOrder = async (e) => {
    e.preventDefault();
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
      setCheckoutError('Please fill in Name, Phone, and Delivery Address');
      return;
    }
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
        if (typeof setLastOrder === 'function') setLastOrder(data.order);
        if (typeof saveRecentOrder === 'function') saveRecentOrder(data.order);
        if (typeof setOrderModalOpen === 'function') setOrderModalOpen(true);
        if (typeof clearCart === 'function') clearCart();
        setCheckoutForm({ name: '', phone: '', address: '', notes: '', paymentMethod: 'Cash on Delivery' });
        switchView('orders');
      } else {
        setCheckoutError(data.error || 'Failed to place order. Try again or use WhatsApp.');
      }
    } catch (err) {
      console.error(err);
      setCheckoutError('Network error. Please try WhatsApp ordering.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // Mobile WhatsApp Checkout Submit
  const handleMobileWhatsAppOrder = () => {
    if (!checkoutForm.name || !checkoutForm.phone) {
      setCheckoutError('Please provide your Name and Phone Number');
      return;
    }
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
          address: checkoutForm.address,
          notes: checkoutForm.notes,
          paymentMethod: `${checkoutForm.paymentMethod} (WhatsApp)`,
          items: cartItems,
          subtotal,
          deliveryFee,
          total
        })
      });
    } catch {}

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
      price: familyDeal?.price ? `Rs. ${familyDeal.price.toLocaleString()}` : 'Rs. 1,999',
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
    <div className={`min-h-screen transition-colors duration-200 pb-28 ${
      isDark 
        ? 'bg-[#0e0e11] text-white selection:bg-orange-500 selection:text-white' 
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
      <header className={`sticky top-0 left-0 right-0 z-40 backdrop-blur-md border-b pt-[max(env(safe-area-inset-top,0px),0.75rem)] pb-3 px-4 transition-colors duration-200 ${
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
              <span className={`font-montserrat tracking-tight text-lg font-black leading-tight flex items-center gap-1.5 ${
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

          {/* Right Action Icons: Quick Theme Toggle, WhatsApp & Side Drawer */}
          <div className="flex items-center gap-2">
            
            {/* Quick Light/Dark Toggle in Header */}
            <button
              onClick={toggleTheme}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isDark 
                  ? 'bg-zinc-800/80 hover:bg-zinc-700/80 border-white/10 text-amber-400' 
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700 shadow-2xs'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* WhatsApp Direct Chat */}
            <a
              href="https://wa.me/923095369472"
              target="_blank"
              rel="noopener noreferrer"
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 shadow-2xs ${
                isDark 
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400' 
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600'
              }`}
              title="Chat on WhatsApp"
            >
              <WhatsAppIcon className="w-5 h-5 fill-current" />
            </a>

            {/* Side Drawer Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isDark 
                  ? 'bg-zinc-800/80 hover:bg-zinc-700/80 border-white/10 text-white' 
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800 shadow-2xs'
              }`}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

          </div>

        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN APP CONTENT CONTAINER */}
      {/* ============================================================== */}
      <main className="px-4 pt-3.5 space-y-5">
        
        {/* VIEW A: HOME DASHBOARD (Hero Promo + 2-Column Categories Grid) */}
        {currentView === 'home' && (
          <div className="space-y-6 animate-tab-fade">
            
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
                    className="w-full flex-shrink-0 p-5 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
                        isDark 
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' 
                          : 'bg-white/20 text-white border-white/30 backdrop-blur-xs'
                      }`}>
                        <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                        <span>{banner.badge}</span>
                      </span>
                      
                      <h3 className="text-xl sm:text-2xl font-montserrat uppercase tracking-tight text-white leading-tight font-bold truncate">
                        {banner.title}
                      </h3>

                      <p className="text-xs text-white/90 font-medium line-clamp-1">
                        {banner.tagline}
                      </p>

                      <div className="pt-2 flex items-center gap-3">
                        <span className="text-amber-300 font-sans font-extrabold text-base flex-shrink-0">
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
                          className={`px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer ${
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
                    <div className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 relative pointer-events-none select-none">
                      <img
                        src={banner.image}
                        alt={banner.title}
                        draggable="false"
                        className="w-full h-full object-contain drop-shadow-2xl"
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
                <span>🍕 Explore Menu</span>
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
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Tap any category to explore menu and order
                  </p>
                </div>

                <button
                  onClick={() => switchView('category', 'all')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-500 uppercase tracking-wider flex items-center gap-0.5 active:scale-95 transition-all cursor-pointer"
                >
                  <span>VIEW ALL</span>
                  <ChevronRight className="w-4 h-4" />
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
                      className={`group rounded-2xl p-3.5 sm:p-4 text-center cursor-pointer transition-all duration-200 active:scale-[0.97] flex flex-col items-center justify-between ${
                        isDark 
                          ? 'bg-[#18181f] border border-white/10 shadow-md hover:border-orange-500/50 hover:shadow-xl' 
                          : 'bg-white border border-zinc-200/90 shadow-xs hover:border-orange-400 hover:shadow-md'
                      }`}
                    >
                      {/* Appetizing Centered Food Photo on Clean Plate */}
                      <div className={`w-full aspect-[4/3] rounded-2xl overflow-hidden flex items-center justify-center p-1.5 mb-2 relative ${
                        isDark ? 'bg-black/30' : 'bg-zinc-50'
                      }`}>
                        <img
                          src={catImg}
                          alt={cat.label}
                          className="w-full h-full object-contain rounded-xl overflow-hidden transform group-hover:scale-110 transition-transform duration-300 drop-shadow-sm"
                          onError={(e) => {
                            e.target.src = '/assets/images/cat-burgers-CfWIZ4YN.jpg';
                          }}
                        />
                      </div>

                      {/* Title & Count */}
                      <div className="w-full text-center">
                        <h4 className={`font-bold text-sm sm:text-base leading-tight truncate transition-colors ${
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
                    className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>ALL DEALS</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none category-scroll">
                  {deals.slice(0, 4).map((deal) => (
                    <div
                      key={deal.id}
                      className={`min-w-[240px] max-w-[240px] rounded-2xl p-3.5 flex flex-col justify-between flex-shrink-0 transition-all ${
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
                        {(deal.includes || []).join(' + ')}
                      </p>

                      <button
                        onClick={(e) => handleAddDeal(deal, e)}
                        className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
            
            {/* Category Navigation Header */}
            <div className={`rounded-2xl p-4 border space-y-3 transition-colors ${
              isDark 
                ? 'bg-[#141418] border-white/10' 
                : 'bg-white border-zinc-200 shadow-2xs'
            }`}>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => switchView('home')}
                  className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider active:opacity-75 transition-opacity cursor-pointer ${
                    isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4 text-orange-500" />
                  <span>Back to Categories</span>
                </button>

                <span className="text-xs font-semibold text-orange-500">
                  {searchQuery.trim() ? `${categoryProducts.length} Results` : `${categoryProducts.length} Available`}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <h2 className={`text-xl sm:text-2xl font-montserrat uppercase tracking-tight font-black flex items-center gap-2 ${
                    isDark ? 'text-white' : 'text-zinc-900'
                  }`}>
                    <span>{searchQuery.trim() ? '🔍' : (categoryEmojis[activeCategory.id] || '🍽️')}</span>
                    <span>{searchQuery.trim() ? 'Global Search' : activeCategory.label}</span>
                  </h2>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {searchQuery.trim() 
                      ? `Searching all categories for "${searchQuery}"`
                      : (activeCategory.blurb || 'Browse delicious items below')
                    }
                  </p>
                </div>
              </div>

              {/* Global Search Bar */}
              <div className="relative w-full pt-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search food across all categories (Pizza, Burgers, Shawarma...)..."
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
            <div className="flex items-center gap-2 overflow-x-auto pb-1 category-scroll scrollbar-none">
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
                      className={`rounded-2xl p-3.5 border transition-all ${
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
                                }`}>
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
                              Rs. {displayPrice?.toLocaleString()}
                            </span>
                            {hasSizes && (
                              <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                ({size?.label || 'Regular'})
                              </span>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Sizes Chips (if applicable) */}
                      {hasSizes && !isOutOfStock && (
                        <div className={`mt-3 pt-2.5 border-t flex items-center gap-1.5 overflow-x-auto pb-0.5 ${
                          isDark ? 'border-white/5' : 'border-zinc-100'
                        }`}>
                          <span className={`text-[10px] uppercase font-bold mr-1 flex-shrink-0 ${
                            isDark ? 'text-zinc-500' : 'text-zinc-400'
                          }`}>
                            Size:
                          </span>
                          {product.sizes.map((s, idx) => {
                            const isSelected = (size?.label || '').toLowerCase() === s.label.toLowerCase();
                            return (
                              <button
                                key={idx}
                                onClick={() => handleSelectSize(product.id, s)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-orange-600 text-white shadow-xs'
                                    : isDark
                                      ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                                      : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                                }`}
                              >
                                {s.label} · Rs. {s.price}
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
            
            <div className={`rounded-2xl p-4 border flex items-center justify-between transition-colors ${
              isDark ? 'bg-[#141418] border-white/10' : 'bg-white border-zinc-200 shadow-2xs'
            }`}>
              <button
                onClick={() => switchView('home')}
                className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider active:opacity-75 transition-opacity cursor-pointer ${
                  isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <ArrowLeft className="w-4 h-4 text-orange-500" />
                <span>Back to Menu</span>
              </button>

              <span className="text-xs font-semibold text-orange-500">
                {deals.length + (familyDeal ? 1 : 0)} Combo Deals
              </span>
            </div>

            {/* Family Feast Highlight Card */}
            {familyDeal && (
              <div className={`rounded-3xl p-4 border shadow-xl space-y-3 ${
                isDark 
                  ? 'bg-gradient-to-br from-amber-950/60 via-zinc-900 to-black border-amber-500/30' 
                  : 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 border-amber-400 text-white'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isDark 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                      : 'bg-white/20 text-white border-white/40 backdrop-blur-xs'
                  }`}>
                    👑 MEGA FAMILY SAVER
                  </span>
                  <span className={`text-lg font-extrabold font-sans ${isDark ? 'text-amber-400' : 'text-white'}`}>
                    Rs. {familyDeal.price?.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-24 h-24 flex-shrink-0">
                    <img
                      src={familyDeal.image || '/assets/images/deal-family.png'}
                      alt={familyDeal.name}
                      className="w-full h-full object-contain drop-shadow-md"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white">
                      {familyDeal.name}
                    </h3>
                    <p className={`text-xs mt-1 leading-snug ${isDark ? 'text-zinc-300' : 'text-white/90'}`}>
                      {(familyDeal.includes || []).join(' • ')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => handleAddDeal(familyDeal, e)}
                  className={`w-full py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isDark 
                      ? 'bg-amber-500 hover:bg-amber-400 text-black' 
                      : 'bg-white hover:bg-amber-50 text-orange-800'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Family Deal</span>
                </button>
              </div>
            )}

            {/* Numbered Deals Grid */}
            <div className="space-y-3">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className={`rounded-2xl p-4 border shadow-md space-y-3 transition-colors ${
                    isDark ? 'bg-[#15151a] border-white/10' : 'bg-white border-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      isDark 
                        ? 'bg-orange-600/20 text-orange-400 border-orange-500/30' 
                        : 'bg-orange-100 text-orange-700 border-orange-200'
                    }`}>
                      {deal.name}
                    </span>
                    <span className={`text-base font-extrabold font-sans ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Rs. {deal.price}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 flex-shrink-0">
                      <img
                        src={deal.image || '/assets/images/deal-1.png'}
                        alt={deal.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.src = '/assets/images/deal-1.png';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs leading-relaxed font-medium ${
                        isDark ? 'text-zinc-300' : 'text-zinc-600'
                      }`}>
                        {(deal.includes || []).join(' + ')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleAddDeal(deal, e)}
                    className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
            <div className={`rounded-2xl p-4 border flex items-center justify-between transition-colors ${
              isDark ? 'bg-[#141418] border-white/10' : 'bg-white border-zinc-200 shadow-2xs'
            }`}>
              <button
                onClick={() => switchView('home')}
                className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider active:opacity-75 transition-opacity cursor-pointer ${
                  isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <ArrowLeft className="w-4 h-4 text-orange-500" />
                <span>Back to Menu</span>
              </button>

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
              <div className="space-y-3.5">
                {recentOrders.map((order, idx) => {
                  const itemsList = order.items || [];
                  const orderDate = order.createdAt 
                    ? new Date(order.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })
                    : 'Recent Order';

                  return (
                    <div
                      key={order.id || idx}
                      className={`rounded-2xl p-4 border transition-all ${
                        isDark 
                          ? 'bg-[#15151a] border-white/10 shadow-lg' 
                          : 'bg-white border-zinc-200 shadow-xs'
                      }`}
                    >
                      {/* Top Order Meta */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-orange-500" />
                          <span className={`font-montserrat text-xs font-extrabold tracking-tight ${
                            isDark ? 'text-white' : 'text-zinc-900'
                          }`}>
                            #{order.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            order.status?.toLowerCase().includes('whatsapp')
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {order.status || 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* Date & Address */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 pb-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>{orderDate}</span>
                        </span>
                        {order.address && (
                          <span className="truncate max-w-[150px]">
                            📍 {order.address}
                          </span>
                        )}
                      </div>

                      {/* Items Summary Collapsible Dropdown */}
                      {itemsList.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleOrderExpanded(order.id || idx)}
                            className={`w-full my-2.5 px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-all active:scale-[0.99] cursor-pointer ${
                              isDark 
                                ? 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5' 
                                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 font-montserrat">
                              <span className="text-xs">🛍️</span>
                              <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                {itemsList.length} {itemsList.length === 1 ? 'Item' : 'Items'}
                              </span>
                              <span className="text-[11px] text-zinc-400 font-normal">
                                ({expandedOrders[order.id || idx] ? 'Hide Details' : 'View Details'})
                              </span>
                            </span>
                            <ChevronDown className={`w-4 h-4 text-orange-500 transition-transform duration-300 ease-in-out ${
                              expandedOrders[order.id || idx] ? 'rotate-180' : 'rotate-0'
                            }`} />
                          </button>

                          {/* Smooth Collapsible Container */}
                          <div
                            className={`grid transition-all duration-300 ease-in-out ${
                              expandedOrders[order.id || idx] 
                                ? 'grid-rows-[1fr] opacity-100 mb-3' 
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
                                      Rs. {(item.price * item.quantity).toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Order Footer: Total & REORDER Button */}
                      <div className="flex items-center justify-between pt-1 gap-3">
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                            Total Paid
                          </span>
                          <span className="font-montserrat text-base font-extrabold text-orange-600 leading-tight">
                            Rs. {order.total?.toLocaleString()}
                          </span>
                        </div>

                        {/* REORDER BUTTON */}
                        <button
                          onClick={() => handleReorderOrder(order)}
                          className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>⚡ Reorder</span>
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
        {/* VIEW E: MOBILE CHECKOUT VIEW */}
        {/* ============================================================== */}
        {currentView === 'checkout' && (
          <div className="space-y-4 animate-tab-fade">
            
            <div className={`rounded-2xl p-4 border flex items-center justify-between transition-colors ${
              isDark ? 'bg-[#141418] border-white/10' : 'bg-white border-zinc-200 shadow-2xs'
            }`}>
              <button
                onClick={() => {
                  switchView('home');
                  setIsCartOpen(true);
                }}
                className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider active:opacity-75 transition-opacity cursor-pointer ${
                  isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <ArrowLeft className="w-4 h-4 text-orange-500" />
                <span>Back to Cart</span>
              </button>

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
                  required
                  value={checkoutForm.phone}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })}
                  placeholder="0309-xxxxxxx"
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

              {/* Order Bill Summary */}
              <div className={`p-3.5 rounded-xl space-y-1.5 text-xs ${
                isDark ? 'bg-black/40 border border-white/5' : 'bg-zinc-50 border border-zinc-200'
              }`}>
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Delivery Fee</span>
                  <span className={`font-semibold ${(deliveryFee === 0 || isFreeDelivery) ? 'text-emerald-500 font-bold' : (isDark ? 'text-white' : 'text-zinc-900')}`}>
                    {(deliveryFee === 0 || isFreeDelivery) ? 'FREE' : `Rs. ${deliveryFee.toLocaleString()}`}
                  </span>
                </div>
                <div className={`flex justify-between items-baseline pt-2 border-t ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
                  <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>Total Amount</span>
                  <span className="font-montserrat text-xl font-extrabold text-orange-500">
                    Rs. {total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                
                {/* 1. WhatsApp Instant Checkout */}
                <button
                  type="button"
                  onClick={handleMobileWhatsAppOrder}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-white" />
                  <span>Send Order via WhatsApp</span>
                </button>

                {/* 2. Direct Online Order */}
                <button
                  type="submit"
                  disabled={checkoutSubmitting}
                  className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
      <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-40">
        <button
          id="floating-cart-btn"
          onClick={() => setIsCartOpen(true)}
          className={`relative w-14 h-14 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 text-white shadow-2xl border-2 border-white/30 flex items-center justify-center active:scale-90 transition-all duration-200 cursor-pointer group ${
            totalItems > 0 
              ? 'animate-reminder-bounce shadow-[0_10px_28px_rgba(234,88,12,0.65)]' 
              : 'shadow-[0_8px_20px_rgba(0,0,0,0.3)]'
          }`}
          aria-label={`Cart with ${totalItems} items`}
          title={`Cart: ${totalItems} items (Rs. ${totalPrice.toLocaleString()})`}
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
            
            {/* Cart item count badge */}
            {totalItems > 0 && (
              <span className="absolute -top-3.5 -right-3.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-zinc-950 text-white font-black text-[11px] flex items-center justify-center shadow-lg border-2 border-white animate-scale-in">
                {totalItems}
              </span>
            )}
          </div>
        </button>
      </div>

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
        
        <div className={`relative ml-auto w-4/5 max-w-sm h-full border-l p-6 flex flex-col justify-between shadow-2xl z-10 transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
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
                    <h3 className={`font-montserrat tracking-tight font-black leading-tight ${
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

              {/* Theme Mode Toggle Card in Menu */}
              <div className={`p-3.5 rounded-2xl border transition-all ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200 shadow-2xs'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-orange-600 text-white shadow-xs'
                    }`}>
                      {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-wider block ${
                        isDark ? 'text-white' : 'text-zinc-900'
                      }`}>
                        {isDark ? 'Dark Mode' : 'Light Mode'}
                      </span>
                      <span className={`text-[10px] block ${
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      }`}>
                        {isDark ? 'Tap switch for Light Mode' : 'Tap switch for Dark Mode'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isDark ? 'bg-zinc-700' : 'bg-orange-600'
                    }`}
                    aria-label="Toggle theme mode"
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center text-xs ${
                        isDark ? 'translate-x-0' : 'translate-x-5'
                      }`}
                    >
                      {isDark ? '🌙' : '☀️'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Navigation Links: Home, Deals, Menu, RECENT ORDERS */}
              <nav className="space-y-2">
                <button
                  onClick={() => {
                    switchView('home');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors active:scale-[0.98] cursor-pointer ${
                    currentView === 'home'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                  }`}
                >
                  <span>🏠 Home & Categories</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                <button
                  onClick={() => {
                    switchView('deals');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between border active:scale-[0.98] transition-all cursor-pointer ${
                    currentView === 'deals'
                      ? 'bg-orange-600 text-white shadow-sm border-orange-500'
                      : isDark 
                        ? 'bg-orange-600/15 text-orange-400 border-orange-500/30' 
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 fill-orange-500" />
                    <span>Saver Deals</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-orange-500" />
                </button>

                <button
                  onClick={() => {
                    switchView('category', 'all');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors active:scale-[0.98] cursor-pointer ${
                    currentView === 'category'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                  }`}
                >
                  <span>🍽️ Explore Menu</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                {/* RECENT ORDERS (Added here replacing the old store details!) */}
                <button
                  onClick={() => {
                    switchView('orders');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between border transition-all active:scale-[0.98] cursor-pointer ${
                    currentView === 'orders'
                      ? 'bg-orange-600 text-white shadow-sm border-orange-500'
                      : isDark 
                        ? 'bg-white/5 hover:bg-white/10 text-white border-white/5' 
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-orange-500" />
                    <span>Recent Orders</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {recentOrders.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-600 text-white font-bold">
                        {recentOrders.length}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                </button>
              </nav>

            </div>

            {/* Bottom Quick Contact Buttons */}
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
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Call Now</span>
              </a>
            </div>

          </div>
        </div>

      {/* Cart & Modals */}
      <CartDrawer />
      <OrderSuccessModal />

    </div>
  );
}
