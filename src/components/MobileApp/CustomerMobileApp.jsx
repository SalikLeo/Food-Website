import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ArrowLeft, Plus, Minus, Flame, 
  MessageCircle, Menu, X, ShoppingBag, 
  Clock, MapPin, ChevronRight, Check, Sparkles, Phone
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
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
    <div className="min-h-screen bg-[#0e0e11] text-white selection:bg-orange-500 selection:text-white pb-28">
      
      {/* ============================================================== */}
      {/* 1. TOP APP BAR (Native Mobile App Header with Safe-Area Inset) */}
      {/* ============================================================== */}
      <header className="sticky top-0 left-0 right-0 z-40 bg-[#121216]/95 backdrop-blur-md border-b border-white/10 pt-[max(env(safe-area-inset-top,0px),0.75rem)] pb-3 px-4 shadow-lg">
        <div className="flex items-center justify-between">
          
          {/* Brand Info */}
          <div 
            onClick={() => switchView('home')} 
            className="flex items-center gap-2.5 cursor-pointer active:opacity-80 transition-opacity"
          >
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-black/40 border-2 border-orange-500/80 shadow-md flex-shrink-0 flex items-center justify-center">
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
              <span className="font-display tracking-wider text-lg font-bold leading-tight text-white flex items-center gap-1.5">
                SALIK <span className="text-orange-500">FAST FOOD</span>
              </span>
              <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                <span>Wah Model Town • Open Now</span>
              </span>
            </div>
          </div>

          {/* Right Action Icons: WhatsApp & Side Drawer */}
          <div className="flex items-center gap-2">
            <a
              href="https://wa.me/923095369472"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all active:scale-95 shadow-2xs"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-5 h-5 fill-emerald-400/20" />
            </a>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-9 h-9 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 text-white flex items-center justify-center transition-all active:scale-95"
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
            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-white/10 bg-gradient-to-br from-orange-950/70 via-zinc-900 to-[#160d0d]">
              
              {/* Background Glow */}
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-orange-600/30 blur-3xl rounded-full pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-red-600/25 blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10 p-5 flex items-center justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold tracking-widest uppercase border border-orange-500/30">
                    <Sparkles className="w-3 h-3 text-orange-400 fill-orange-400" />
                    <span>{promoBanners[activeBannerIndex].badge}</span>
                  </span>
                  
                  <h3 className="text-xl sm:text-2xl font-display uppercase tracking-wide text-white leading-tight font-bold">
                    {promoBanners[activeBannerIndex].title}
                  </h3>

                  <p className="text-xs text-zinc-300 font-medium line-clamp-1">
                    {promoBanners[activeBannerIndex].tagline}
                  </p>

                  <div className="pt-2 flex items-center gap-3">
                    <span className="text-orange-400 font-sans font-extrabold text-base">
                      {promoBanners[activeBannerIndex].price}
                    </span>
                    <button
                      onClick={promoBanners[activeBannerIndex].action}
                      className="px-4 py-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
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
                      activeBannerIndex === idx ? 'w-6 bg-orange-500' : 'w-2 bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Quick Action Navigation Bar (Menu / Deals / WhatsApp) */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => switchView('category', 'pizza')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-zinc-900/90 border border-white/10 text-xs font-bold uppercase tracking-wider text-zinc-200 hover:bg-zinc-800 active:scale-95 transition-all"
              >
                <span>🍕 All Menu</span>
              </button>
              <button
                onClick={() => switchView('deals')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-orange-600/20 border border-orange-500/40 text-xs font-bold uppercase tracking-wider text-orange-400 hover:bg-orange-600/30 active:scale-95 transition-all"
              >
                <Flame className="w-3.5 h-3.5 fill-orange-400" />
                <span>Deals</span>
              </button>
              <a
                href="tel:03095369472"
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-zinc-900/90 border border-white/10 text-xs font-bold uppercase tracking-wider text-zinc-200 hover:bg-zinc-800 active:scale-95 transition-all"
              >
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
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
                  <h2 className="text-xl font-display uppercase tracking-wide font-bold text-white">
                    Explore Menu
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Tap any category to view full menu and order
                  </p>
                </div>

                <button
                  onClick={() => switchView('category', 'pizza')}
                  className="text-xs font-bold text-orange-500 hover:text-orange-400 uppercase tracking-wider flex items-center gap-0.5 active:opacity-75 transition-opacity"
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
                      className="group bg-white rounded-2xl p-3.5 sm:p-4 text-center cursor-pointer transition-all duration-200 active:scale-[0.97] hover:shadow-xl border border-zinc-200 shadow-sm flex flex-col items-center justify-between"
                    >
                      {/* Appetizing Centered Food Photo on White Plate */}
                      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-zinc-50 flex items-center justify-center p-1.5 mb-2 relative">
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
                        <h4 className="font-bold text-zinc-900 text-sm sm:text-base leading-tight truncate group-hover:text-orange-600 transition-colors">
                          {cat.label}
                        </h4>
                        <span className="text-[11px] text-zinc-500 font-medium block mt-0.5">
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
                    <h2 className="text-xl font-display uppercase tracking-wide font-bold text-white flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                      <span>Hot Combo Deals</span>
                    </h2>
                    <p className="text-[11px] text-zinc-400">
                      Saver deals with burgers, pizza, fries & drinks
                    </p>
                  </div>
                  <button
                    onClick={() => switchView('deals')}
                    className="text-xs font-bold text-orange-500 uppercase tracking-wider flex items-center gap-0.5"
                  >
                    <span>ALL DEALS</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none category-scroll">
                  {deals.slice(0, 4).map((deal) => (
                    <div
                      key={deal.id}
                      className="min-w-[240px] max-w-[240px] bg-[#16161b] rounded-2xl p-3.5 border border-white/10 shadow-lg flex flex-col justify-between flex-shrink-0"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
                          {deal.name}
                        </span>
                        <span className="text-xs font-bold text-white">
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

                      <p className="text-[11px] text-zinc-400 line-clamp-2 my-2 min-h-[32px]">
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
            <div className="bg-[#141418] rounded-2xl p-4 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => switchView('home')}
                  className="flex items-center gap-1 text-xs font-bold text-zinc-300 hover:text-white uppercase tracking-wider active:opacity-75 transition-opacity"
                >
                  <ArrowLeft className="w-4 h-4 text-orange-500" />
                  <span>Back to Categories</span>
                </button>

                <span className="text-xs font-semibold text-orange-400">
                  {categoryProducts.length} Available
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <h2 className="text-2xl font-display uppercase tracking-wide font-bold text-white flex items-center gap-2">
                    <span>{categoryEmojis[activeCategory.id] || '🍽️'}</span>
                    <span>{activeCategory.label}</span>
                  </h2>
                  {activeCategory.blurb && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {activeCategory.blurb}
                    </p>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full pt-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeCategory.label}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
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
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 ${
                      isActive
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-[#18181e] text-zinc-400 border border-white/5 hover:text-white'
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
              <div className="bg-[#141418] rounded-2xl p-8 border border-white/10 text-center space-y-2">
                <p className="text-zinc-400 text-sm">No items found matching your search.</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-orange-500 font-bold text-xs uppercase tracking-wider"
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
                      className={`bg-[#15151a] rounded-2xl p-3.5 border transition-all ${
                        isOutOfStock 
                          ? 'border-red-900/30 opacity-75' 
                          : 'border-white/10 shadow-md hover:border-white/20'
                      }`}
                    >
                      <div className="flex gap-3.5">
                        
                        {/* Food Image */}
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-black/40 border border-white/5 flex-shrink-0 relative">
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
                            <h4 className="font-bold text-white text-base leading-tight truncate">
                              {product.name}
                            </h4>
                            {product.description && (
                              <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-snug">
                                {product.description}
                              </p>
                            )}
                          </div>

                          {/* Price */}
                          <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="text-orange-500 font-sans font-extrabold text-base leading-none">
                              Rs. {displayPrice?.toLocaleString()}
                            </span>
                            {hasSizes && (
                              <span className="text-[10px] text-zinc-400">
                                ({size?.label || 'Regular'})
                              </span>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Sizes Chips (if applicable) */}
                      {hasSizes && !isOutOfStock && (
                        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold mr-1 flex-shrink-0">
                            Size:
                          </span>
                          {product.sizes.map((s, idx) => {
                            const isSelected = (size?.label || '').toLowerCase() === s.label.toLowerCase();
                            return (
                              <button
                                key={idx}
                                onClick={() => handleSelectSize(product.id, s)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                                  isSelected
                                    ? 'bg-orange-600 text-white shadow-xs'
                                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {s.label} · Rs. {s.price}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Bottom Add Actions */}
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-3">
                        
                        {/* Quantity Counter */}
                        {!isOutOfStock && (
                          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl p-0.5">
                            <button
                              onClick={() => setQty(product.id, -1)}
                              disabled={qty <= 1}
                              className="w-7 h-7 rounded-lg bg-zinc-800 text-white flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-white">
                              {qty}
                            </span>
                            <button
                              onClick={() => setQty(product.id, 1)}
                              className="w-7 h-7 rounded-lg bg-zinc-800 text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer"
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
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
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
            
            <div className="bg-[#141418] rounded-2xl p-4 border border-white/10 flex items-center justify-between">
              <button
                onClick={() => switchView('home')}
                className="flex items-center gap-1 text-xs font-bold text-zinc-300 hover:text-white uppercase tracking-wider active:opacity-75 transition-opacity"
              >
                <ArrowLeft className="w-4 h-4 text-orange-500" />
                <span>Back to Menu</span>
              </button>

              <span className="text-xs font-semibold text-orange-400">
                {deals.length + (familyDeal ? 1 : 0)} Combo Deals
              </span>
            </div>

            {/* Family Feast Highlight Card */}
            {familyDeal && (
              <div className="bg-gradient-to-br from-amber-950/60 via-zinc-900 to-black rounded-3xl p-4 border border-amber-500/30 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                    👑 MEGA FAMILY SAVER
                  </span>
                  <span className="text-lg font-extrabold text-amber-400 font-sans">
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
                    <p className="text-xs text-zinc-300 mt-1 leading-snug">
                      {(familyDeal.includes || []).join(' • ')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => handleAddDeal(familyDeal, e)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                  className="bg-[#15151a] rounded-2xl p-4 border border-white/10 shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-600/20 text-orange-400 text-xs font-bold uppercase tracking-wider border border-orange-500/30">
                      {deal.name}
                    </span>
                    <span className="text-base font-extrabold text-white font-sans">
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
                      <p className="text-xs text-zinc-300 leading-relaxed font-medium">
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
      {/* 5. SIDE DRAWER MENU (Restaurant Info, Call, WhatsApp) */}
      {/* ============================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity" 
          />
          
          <div className="relative ml-auto w-4/5 max-w-sm h-full bg-[#121216] border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl z-10 animate-slide-left">
            <div className="space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/salik-logo.png"
                    alt="Salik Fast Food"
                    className="w-10 h-10 object-contain rounded-full border border-orange-500/50"
                  />
                  <div>
                    <h3 className="font-display tracking-wider font-bold text-white leading-tight">
                      SALIK FAST FOOD
                    </h3>
                    <span className="text-[10px] text-zinc-400">Wah Cantt</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-2">
                <button
                  onClick={() => {
                    switchView('home');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between"
                >
                  <span>🏠 Home & Categories</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>

                <button
                  onClick={() => {
                    switchView('deals');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl bg-orange-600/15 text-orange-400 font-bold text-xs uppercase tracking-wider flex items-center justify-between border border-orange-500/30"
                >
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 fill-orange-400" />
                    <span>Saver Deals</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-orange-400" />
                </button>

                <button
                  onClick={() => {
                    switchView('category', 'pizza');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between"
                >
                  <span>🍕 Full Menu</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
              </nav>

              {/* Store Details */}
              <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-2.5 text-xs text-zinc-400">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span>Wah Model Town, Wah Cantt</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span>12:00 PM – 2:00 AM (Daily)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <a href="tel:03095369472" className="text-white font-semibold">0309-5369472</a>
                </div>
              </div>

            </div>

            {/* Bottom Actions in Drawer */}
            <div className="space-y-2 pt-4 border-t border-white/10">
              <a
                href="https://wa.me/923095369472"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>WhatsApp Order</span>
              </a>
              <a
                href="tel:03095369472"
                className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
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
