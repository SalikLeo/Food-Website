import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ArrowLeft, Plus, Minus, Flame, 
  MessageCircle, Menu, X, ShoppingBag, 
  Clock, MapPin, ChevronRight, Check, Sparkles, Phone,
  Sun, Moon, User, Repeat
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { apiUrl } from '../../config/api';
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
  const { addToCart, totalItems, totalPrice, setIsCartOpen } = useCart();
  const { 
    user, 
    isLoggedIn, 
    setAuthModalOpen, 
    setProfileModalOpen, 
    setOrdersModalOpen, 
    orders 
  } = useCustomerAuth();

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

  // Navigation states: 'home' | 'category' | 'deals'
  const [currentView, setCurrentView] = useState('home');
  const [selectedCatId, setSelectedCatId] = useState('pizza');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  // Selected sizes and quantities per product
  const [selectedSizes, setSelectedSizes] = useState({});
  const [quantities, setQuantities] = useState({});

  // Auto-rotate promo banners
  useEffect(() => {
    if (currentView !== 'home') return;
    const interval = setInterval(() => {
      setActiveBannerIndex(prev => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(interval);
  }, [currentView]);

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

  // Filter products for category view
  const categoryProducts = useMemo(() => {
    let list = products || [];
    if (selectedCatId && selectedCatId !== 'all') {
      list = list.filter(p => p.category === selectedCatId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, selectedCatId, searchQuery]);

  // Current active category object
  const activeCategory = categories.find(c => c.id === selectedCatId) || categories[0] || {
    id: 'pizza',
    label: 'Pizza'
  };

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
              <span className={`font-display tracking-wider text-lg font-bold leading-tight flex items-center gap-1.5 ${
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
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
              }`}
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-5 h-5 fill-emerald-400/20" />
            </a>

            {/* Profile / Sign In Quick Button */}
            <button
              onClick={() => isLoggedIn ? setProfileModalOpen(true) : setAuthModalOpen(true)}
              className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isLoggedIn
                  ? 'bg-orange-600/20 border-orange-500/40 text-orange-400'
                  : isDark 
                    ? 'bg-zinc-800/80 hover:bg-zinc-700/80 border-white/10 text-zinc-300' 
                    : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700 shadow-2xs'
              }`}
              title={isLoggedIn ? 'View Profile' : 'Sign In'}
              aria-label="User Account"
            >
              <User className="w-4 h-4" />
              {isLoggedIn && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#121216]" />
              )}
            </button>

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
          <div className="space-y-6 animate-fade-in">
            
            {/* Promo Hero Banner Slider */}
            <div className={`relative rounded-3xl overflow-hidden shadow-xl border ${
              isDark 
                ? 'border-white/10 bg-gradient-to-br from-orange-950/70 via-zinc-900 to-[#160d0d]' 
                : 'border-orange-500/30 bg-gradient-to-br from-orange-600 via-amber-600 to-red-600 shadow-lg text-white'
            }`}>
              
              {/* Background Glow */}
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-orange-600/30 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-red-600/25 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10 p-5 flex items-center justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${
                    isDark 
                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' 
                      : 'bg-white/20 text-white border-white/30 backdrop-blur-xs'
                  }`}>
                    <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                    <span>{promoBanners[activeBannerIndex].badge}</span>
                  </span>
                  
                  <h3 className="text-xl sm:text-2xl font-display uppercase tracking-wide text-white leading-tight font-bold">
                    {promoBanners[activeBannerIndex].title}
                  </h3>

                  <p className="text-xs text-white/90 font-medium line-clamp-1">
                    {promoBanners[activeBannerIndex].tagline}
                  </p>

                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-amber-300 font-sans font-extrabold text-base">
                      {promoBanners[activeBannerIndex].price}
                    </span>
                    <button
                      onClick={promoBanners[activeBannerIndex].action}
                      className={`px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer ${
                        isDark 
                          ? 'bg-orange-600 hover:bg-orange-500 text-white' 
                          : 'bg-white hover:bg-zinc-100 text-orange-700 shadow-sm'
                      }`}
                    >
                      {promoBanners[activeBannerIndex].actionText}
                    </button>
                  </div>
                </div>

                {/* Banner Thumbnail */}
                <div className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 relative">
                  <img
                    src={promoBanners[activeBannerIndex].image}
                    alt={promoBanners[activeBannerIndex].title}
                    className="w-full h-full object-contain drop-shadow-2xl transform hover:scale-105 transition-transform"
                    onError={(e) => {
                      e.target.src = '/assets/images/cat-burgers-CfWIZ4YN.jpg';
                    }}
                  />
                </div>
              </div>

              {/* Slider Dots */}
              <div className="flex items-center justify-center gap-1.5 pb-2.5">
                {promoBanners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveBannerIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      activeBannerIndex === idx 
                        ? (isDark ? 'w-6 bg-orange-500' : 'w-6 bg-white') 
                        : (isDark ? 'w-2 bg-white/20' : 'w-2 bg-white/40')
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Quick Action Navigation Bar (Menu / Deals / WhatsApp) */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => switchView('category', 'pizza')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                  isDark 
                    ? 'bg-zinc-900/90 border border-white/10 text-zinc-200 hover:bg-zinc-800' 
                    : 'bg-white border border-zinc-200 text-zinc-800 shadow-2xs hover:bg-zinc-50'
                }`}
              >
                <span>🍕 All Menu</span>
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

              <a
                href="tel:03095369472"
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                  isDark 
                    ? 'bg-zinc-900/90 border border-white/10 text-zinc-200 hover:bg-zinc-800' 
                    : 'bg-white border border-zinc-200 text-zinc-800 shadow-2xs hover:bg-zinc-50'
                }`}
              >
                <Phone className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                <span>Call Store</span>
              </a>
            </div>

            {/* ============================================================== */}
            {/* 3. EXPLORE MENU (2-Column Category Grid Matching User Image) */}
            {/* ============================================================== */}
            <section className="space-y-3 pt-1">
              
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-display uppercase tracking-wide font-bold ${
                    isDark ? 'text-white' : 'text-zinc-900'
                  }`}>
                    Explore Menu
                  </h2>
                  <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Tap any category to view full menu and order
                  </p>
                </div>

                <button
                  onClick={() => switchView('category', 'pizza')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-500 uppercase tracking-wider flex items-center gap-0.5 active:opacity-75 transition-opacity cursor-pointer"
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
                      <div className={`w-full aspect-[4/3] rounded-xl overflow-hidden flex items-center justify-center p-1.5 mb-2 relative ${
                        isDark ? 'bg-black/30' : 'bg-zinc-50'
                      }`}>
                        <img
                          src={catImg}
                          alt={cat.label}
                          className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-300 drop-shadow-sm"
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
                    <h2 className={`text-xl font-display uppercase tracking-wide font-bold flex items-center gap-1.5 ${
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
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
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
          <div className="space-y-4 animate-fade-in">
            
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
                  {categoryProducts.length} Available
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <h2 className={`text-2xl font-display uppercase tracking-wide font-bold flex items-center gap-2 ${
                    isDark ? 'text-white' : 'text-zinc-900'
                  }`}>
                    <span>{categoryEmojis[activeCategory.id] || '🍽️'}</span>
                    <span>{activeCategory.label}</span>
                  </h2>
                  {activeCategory.blurb && (
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {activeCategory.blurb}
                    </p>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full pt-1">
                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-400'
                }`} />
                <input
                  type="text"
                  placeholder={`Search ${activeCategory.label}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all ${
                    isDark 
                      ? 'bg-black/40 border-white/10 text-white placeholder-zinc-500' 
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                  }`}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs cursor-pointer ${
                      isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-400 hover:text-zinc-800'
                    }`}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal Category Switcher Bar (Pills) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 category-scroll scrollbar-none">
              {categories.map((c) => {
                const isActive = selectedCatId === c.id;
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
              <div className={`rounded-2xl p-8 border text-center space-y-2 ${
                isDark ? 'bg-[#141418] border-white/10' : 'bg-white border-zinc-200 shadow-2xs'
              }`}>
                <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  No items found matching your search.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-orange-600 font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Clear Search
                </button>
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
                        <div className={`w-24 h-24 rounded-xl overflow-hidden border flex-shrink-0 relative ${
                          isDark ? 'bg-black/40 border-white/5' : 'bg-zinc-50 border-zinc-200'
                        }`}>
                          <img
                            src={product.image || '/assets/images/cat-pizza-BmV7hCev.jpg'}
                            alt={product.name}
                            className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale' : ''}`}
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
                            <h4 className={`font-bold text-base leading-tight truncate ${
                              isDark ? 'text-white' : 'text-zinc-900'
                            }`}>
                              {product.name}
                            </h4>
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
                          <Plus className="w-4 h-4" />
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
          <div className="space-y-4 animate-fade-in">
            
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

      </main>

      {/* ============================================================== */}
      {/* 4. FLOATING CART ACTION BUTTON (Bottom-Right FAB) */}
      {/* ============================================================== */}
      <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-40">
        <button
          id="floating-cart-btn"
          onClick={() => setIsCartOpen(true)}
          className="relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-orange-600 hover:bg-orange-500 text-white shadow-2xl border border-orange-400/40 active:scale-95 transition-all cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 fill-white/20" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-orange-600 font-extrabold text-[10px] flex items-center justify-center shadow-md animate-scale-in">
                {totalItems}
              </span>
            )}
          </div>
          {totalPrice > 0 && (
            <span className="font-extrabold text-xs tracking-wider border-l border-white/20 pl-2">
              Rs. {totalPrice.toLocaleString()}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* 5. SIDE DRAWER MENU (Theme Toggle, Links, Restaurant Info) */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity" 
          />
          
          <div className={`relative ml-auto w-4/5 max-w-sm h-full border-l p-6 flex flex-col justify-between shadow-2xl z-10 animate-slide-left transition-colors ${
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
                    <h3 className={`font-display tracking-wider font-bold leading-tight ${
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    isDark ? 'bg-white/10 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User Profile / Sign-in Card */}
              {isLoggedIn ? (
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200 shadow-2xs'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div className="min-w-0">
                        <span className={`text-xs font-bold truncate block ${
                          isDark ? 'text-white' : 'text-zinc-900'
                        }`}>
                          {user?.name || 'Valued Customer'}
                        </span>
                        <span className={`text-[10px] block truncate ${
                          isDark ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>
                          {user?.email || user?.phone}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setProfileModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white text-[11px] font-bold tracking-wide transition-all border border-orange-500/30 flex-shrink-0 cursor-pointer"
                    >
                      Profile
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isDark ? 'bg-orange-600/10 border-orange-500/30 hover:bg-orange-600/15' : 'bg-orange-50 border-orange-200 hover:bg-orange-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className={`text-xs font-bold block ${
                          isDark ? 'text-white' : 'text-zinc-900'
                        }`}>
                          Sign In / Register
                        </span>
                        <span className="text-[10px] text-orange-400 block font-medium">
                          Email Verification Code
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-orange-500" />
                  </div>
                </div>
              )}

              {/* Theme Mode Toggle Card in Menu (As Requested!) */}
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

              {/* Navigation Links */}
              <nav className="space-y-2">
                {/* Recent Orders Item with Reorder badge */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setOrdersModalOpen(true);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between border cursor-pointer transition-all ${
                    isDark 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' 
                      : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>🕒 Recent Orders & Reorder</span>
                  </span>
                  {orders.length > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black">
                      {orders.length}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-amber-500" />
                  )}
                </button>

                <button
                  onClick={() => {
                    switchView('home');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors cursor-pointer ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
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
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between border cursor-pointer ${
                    isDark 
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
                    switchView('category', 'pizza');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors cursor-pointer ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
                  }`}
                >
                  <span>🍕 Full Menu</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              </nav>

            </div>

            {/* Bottom Actions in Drawer */}
            <div className={`space-y-2 pt-4 border-t ${isDark ? 'border-white/10' : 'border-zinc-200'}`}>
              <a
                href="https://wa.me/923095369472"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>WhatsApp Order</span>
              </a>
              <a
                href="tel:03095369472"
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Call Hotline</span>
              </a>
            </div>

          </div>
        </div>
      )}

      {/* Cart & Modals */}
      <CartDrawer />
      <OrderSuccessModal />

    </div>
  );
}
