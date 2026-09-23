import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ShoppingBag, Plus, Minus, Tag, Check, Ban, Zap, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/formatters';

export default function MenuSection({ categories = [], products = [] }) {
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('pizza');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSizes, setSelectedSizes] = useState({});
  const [quantities, setQuantities] = useState({});

  // Click-and-drag to scroll categories
  const categoryScrollRef = useRef(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only primary left-click
    const slider = categoryScrollRef.current;
    if (!slider) return;

    isDownRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - slider.offsetLeft;
    scrollLeftRef.current = slider.scrollLeft;
    setIsGrabbing(true);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!isDownRef.current) return;
      const slider = categoryScrollRef.current;
      if (!slider) return;

      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startXRef.current) * 1.5;
      if (Math.abs(walk) > 4) {
        hasMovedRef.current = true;
      }
      slider.scrollLeft = scrollLeftRef.current - walk;
    };

    const handleGlobalMouseUp = () => {
      if (isDownRef.current) {
        isDownRef.current = false;
        setIsGrabbing(false);
        setTimeout(() => {
          hasMovedRef.current = false;
        }, 50);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleWheel = (e) => {
    const slider = categoryScrollRef.current;
    if (slider && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      slider.scrollLeft += e.deltaY;
    }
  };

  const handleCategorySelect = (catId) => {
    if (hasMovedRef.current) return;
    setSelectedCategory(catId);
  };

  // Active category blurb
  const activeCat = categories.find(c => c.id === selectedCategory) || categories[0];

  // Filter products by category and search (includes sold out items with sold-out badges)
  const filteredProducts = useMemo(() => {
    let list = products || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (selectedCategory && selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }

    // Move sold out items (inStock === false) to the bottom of the list
    return [...list].sort((a, b) => {
      const aSold = a.inStock === false ? 1 : 0;
      const bSold = b.inStock === false ? 1 : 0;
      return aSold - bSold;
    });
  }, [products, selectedCategory, searchQuery]);

  // Size helper
  const getSelectedSize = (product) => {
    if (!product.sizes || product.sizes.length === 0) return null;
    const current = selectedSizes[product.id];
    if (current) return current;
    // Default to Medium if available, else first size
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

  const handleAddToCart = (product, e = null) => {
    if (product.inStock === false) return;
    const size = getSelectedSize(product);
    const qty = getQty(product.id);
    addToCart(product, size, qty, e?.currentTarget);
  };

  const handleOrderNow = (product) => {
    if (product.inStock === false) return;
    handleAddToCart(product);
    const orderSec = document.getElementById('order');
    if (orderSec) {
      orderSec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="menu" className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-600 text-xs font-bold tracking-widest uppercase mb-3">
              <Tag className="w-3.5 h-3.5 fill-orange-600" />
              <span>OUR MENU</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-display uppercase tracking-tight text-zinc-900 leading-tight">
              PICK A CATEGORY, <span className="text-orange-600">ORDER IN SECONDS</span>
            </h2>
            <p className="text-zinc-600 text-sm sm:text-base mt-2 max-w-xl">
              Every item and price straight from our menu card. Tap a card for details, sizes and customization.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-full bg-white border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Navigation with Click-to-Drag & Wheel Scroll */}
        {!searchQuery && (
          <div
            ref={categoryScrollRef}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            className={`flex items-center gap-2.5 overflow-x-auto pb-4 mb-8 category-scroll select-none ${
              isGrabbing ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const itemCount = (products || []).filter(p => p.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onDragStart={(e) => e.preventDefault()}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all select-none ${
                    isActive
                      ? 'bg-zinc-900 text-white shadow-md scale-105'
                      : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200/80'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {itemCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Category Active Heading */}
        {!searchQuery && activeCat && (
          <div className="flex items-baseline gap-3 mb-8">
            <h3 className="font-display text-3xl uppercase tracking-wide text-zinc-900">
              {activeCat.label}
            </h3>
            <span className="text-zinc-500 text-xs sm:text-sm italic">
              {activeCat.blurb}
            </span>
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-zinc-200">
            <p className="text-zinc-500 font-medium">No menu items found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const selectedSize = getSelectedSize(product);
              const activePrice = selectedSize ? selectedSize.price : product.price;
              const qty = getQty(product.id);
              const isSoldOut = product.inStock === false;

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group ${
                    isSoldOut ? 'opacity-90' : ''
                  }`}
                >
                  {/* Card Media Top */}
                  <div className="relative w-full aspect-[4/3] bg-zinc-100 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className={`w-full h-full object-cover transition-transform duration-500 ${
                        isSoldOut ? 'grayscale contrast-75 opacity-75' : 'group-hover:scale-105'
                      }`}
                      onError={(e) => {
                        e.target.src = '/assets/images/cat-special-CdXGKIOV.jpg';
                      }}
                    />

                    {/* Tag / Sold Out Badge */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                      {isSoldOut ? (
                        <span className="px-2.5 py-1 rounded-md bg-zinc-900/95 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1.5 backdrop-blur-xs">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          Sold Out Today
                        </span>
                      ) : (
                        product.tag && (
                          <span className="px-2.5 py-1 rounded-md bg-orange-600 text-white text-[10px] font-bold uppercase tracking-wider shadow">
                            {product.tag}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Name & Price */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-bold text-sm sm:text-base text-zinc-900">
                          {product.name}
                        </h4>
                        <span className="font-bold text-sm sm:text-base text-red-600 flex-shrink-0 tracking-tight">
                          Rs. {formatPrice(activePrice)}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-[#78716c] text-xs line-clamp-2 leading-relaxed mb-3">
                        {product.description}
                      </p>

                      {/* Sizes Selector Capsule Track */}
                      {product.sizes && product.sizes.length > 0 && (
                        <div className="bg-[#f5f1eb] rounded-full p-1 flex items-center justify-between gap-1 mb-4 border border-[#eee8df]/80">
                          {product.sizes.map((s) => {
                            const isSizeActive = selectedSize?.label === s.label;
                            return (
                              <button
                                key={s.label}
                                type="button"
                                disabled={isSoldOut}
                                onClick={() => handleSelectSize(product.id, s)}
                                className={`flex-1 py-1 px-3 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider text-center transition-all duration-200 ${
                                  isSizeActive
                                    ? 'bg-gradient-to-r from-[#d93409] to-[#ea580c] text-white shadow-sm'
                                    : 'text-[#635d56] hover:text-zinc-900 bg-transparent'
                                } ${isSoldOut ? 'opacity-70 cursor-not-allowed' : ''}`}
                              >
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quantity & Actions */}
                    <div className="space-y-2 pt-2 border-t border-zinc-100">
                      {isSoldOut ? (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            disabled
                            className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-400 text-xs font-bold cursor-not-allowed uppercase tracking-wider"
                          >
                            <Ban className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Sold Out Today</span>
                          </button>
                          <p className="text-[11px] text-center text-zinc-400 font-medium italic">
                            Temporarily unavailable today
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            {/* Sleek, Modern Stepper */}
                            <div className="flex items-center h-10 rounded-xl bg-zinc-100/90 border border-zinc-200/80 p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => setQty(product.id, -1)}
                                className="w-8 h-full rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-950 hover:bg-white active:scale-90 transition-all cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-7 text-center font-bold text-xs sm:text-sm text-zinc-900">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQty(product.id, 1)}
                                className="w-8 h-full rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-950 hover:bg-white active:scale-90 transition-all cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Add to Cart */}
                            <button
                              type="button"
                              onClick={(e) => handleAddToCart(product, e)}
                              className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                              <span>Add to Cart</span>
                            </button>
                          </div>

                          {/* Order Now */}
                          <button
                            type="button"
                            onClick={() => handleOrderNow(product)}
                            className="w-full h-10 rounded-xl bg-gradient-to-r from-[#e53e10] to-[#f56505] hover:from-[#d1350a] hover:to-[#e05703] active:scale-[0.98] text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 fill-white" />
                            <span>Order Now</span>
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
    </section>
  );
}
