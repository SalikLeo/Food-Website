import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Plus, Minus, Flame, Ban } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { apiUrl } from '../config/api';
import { formatPrice } from '../utils/formatters';

export default function BestSellersSection({ products = [], categories = [], settings = null }) {
  const { addToCart, isDark } = useCart();
  const [bestSellers, setBestSellers] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState({});
  const [quantities, setQuantities] = useState({});
  const [addedItemMap, setAddedItemMap] = useState({});

  // Allowed categories from settings (default: pizza, burgers)
  const allowedCategories = useMemo(() => {
    if (
      settings?.bestSellerCategories &&
      Array.isArray(settings.bestSellerCategories) &&
      settings.bestSellerCategories.length > 0
    ) {
      return settings.bestSellerCategories.map((c) => String(c).toLowerCase());
    }
    return ['pizza', 'burgers'];
  }, [settings?.bestSellerCategories]);

  // Fetch real-time best sellers from backend API
  useEffect(() => {
    let isMounted = true;
    const fetchBestSellers = async () => {
      try {
        const res = await fetch(apiUrl('/api/best-sellers'));
        const data = await res.json();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setBestSellers(data);
        }
      } catch (err) {
        console.error('Failed to fetch best sellers:', err);
      }
    };

    fetchBestSellers();
    return () => {
      isMounted = false;
    };
  }, [settings?.bestSellerCategories]);

  // Fallback if API hasn't returned yet: filter products by allowed categories
  const displayItems = useMemo(() => {
    let items = [];
    if (bestSellers && bestSellers.length > 0) {
      items = bestSellers;
    } else {
      items = (products || []).filter((p) => {
        const cat = (p.category || '').toLowerCase();
        return allowedCategories.includes(cat);
      });
    }
    // Move sold out items (inStock === false) to the bottom
    return [...items].sort((a, b) => {
      const aSold = a.inStock === false ? 1 : 0;
      const bSold = b.inStock === false ? 1 : 0;
      return aSold - bSold;
    }).slice(0, 4);
  }, [bestSellers, products, allowedCategories]);

  // Size helper - defaults to smallest size
  const getSelectedSize = (product) => {
    if (!product.sizes || product.sizes.length === 0) return null;
    const current = selectedSizes[product.id];
    if (current) return current;
    // Default to Small / smallest size (by price ascending or first size)
    const small = product.sizes.find((s) => s.label.toLowerCase() === 'small');
    if (small) return small;
    const sorted = [...product.sizes].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    return sorted[0] || product.sizes[0];
  };

  const handleSelectSize = (productId, sizeObj) => {
    setSelectedSizes((prev) => ({
      ...prev,
      [productId]: sizeObj
    }));
  };

  // Quantity helpers
  const getQty = (productId) => quantities[productId] || 1;
  const setQty = (productId, delta) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + delta)
    }));
  };

  const handleAddToCart = (product, e = null) => {
    if (product.inStock === false) return;
    const size = getSelectedSize(product);
    const qty = getQty(product.id);
    addToCart(product, size, qty, e?.currentTarget);

    // Visual feedback
    setAddedItemMap((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  if (!displayItems || displayItems.length === 0) {
    return null;
  }

  return (
    <section
      id="best-sellers"
      className={`relative py-14 sm:py-20 ${
        isDark
          ? 'bg-[#0c0c0e] border-zinc-800/80'
          : 'bg-gradient-to-b from-[#fbf8f3] via-[#f7f2ea] to-[#f4eee4] border-zinc-200/90'
      } border-t border-b overflow-hidden transition-colors duration-300`}
    >
      {/* Background ambient glow */}
      <div className={`absolute top-1/3 left-10 w-[450px] h-[450px] ${isDark ? 'bg-orange-600/10' : 'bg-orange-500/8'} blur-[160px] rounded-full pointer-events-none`} />
      <div className={`absolute bottom-10 right-10 w-[400px] h-[400px] ${isDark ? 'bg-red-500/10' : 'bg-amber-400/8'} blur-[150px] rounded-full pointer-events-none`} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-orange-500 animate-ping" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-orange-500 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                <span>Wah Cantt's Most Ordered</span>
              </span>
            </div>

            <div className="relative inline-block">
              <h2 className={`text-3xl sm:text-4xl lg:text-5xl font-display uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'} leading-none`}>
                BEST <span className="text-orange-500">SELLERS</span>
              </h2>
              <div className="h-1.5 w-20 bg-orange-500 rounded-full mt-2" />
            </div>

            <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-600'} text-xs sm:text-sm mt-2.5 max-w-xl leading-relaxed`}>
              Top trending meals chosen by food lovers across Wah Model Town. Freshly prepared, loaded with flavors, and always piping hot.
            </p>
          </div>
        </div>

        {/* 4 Cards Grid - 2 columns on mobile, 4 columns on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
          {displayItems.map((product, index) => {
            const selectedSize = getSelectedSize(product);
            const activePrice = selectedSize ? selectedSize.price : product.price;
            const qty = getQty(product.id);
            const isSoldOut = product.inStock === false;
            const isAdded = Boolean(addedItemMap[product.id]);

            return (
              <div
                key={product.id}
                className={`${
                  isDark
                    ? 'bg-[#141419] border-white/10 text-white shadow-card-dark hover:border-orange-500/40'
                    : 'bg-white border-zinc-200/80 text-zinc-900 shadow-sm hover:shadow-xl'
                } rounded-xl sm:rounded-2xl border overflow-hidden transition-all duration-300 flex flex-col justify-between group ${
                  isSoldOut ? 'opacity-90' : ''
                }`}
              >
                {/* Card Media Top */}
                <div className={`relative w-full aspect-[4/3] ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'} overflow-hidden`}>
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

                  {/* Top Badges */}
                  {(isSoldOut || product.tag) && (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 z-10">
                      {isSoldOut ? (
                        <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded sm:rounded-md bg-zinc-900/95 text-amber-300 border border-amber-400/40 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1 sm:gap-1.5 backdrop-blur-xs">
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span className="hidden xs:inline">Sold Out Today</span>
                          <span className="xs:hidden">Sold Out</span>
                        </span>
                      ) : (
                        product.tag && (
                          <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded sm:rounded-md bg-orange-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow">
                            {product.tag}
                          </span>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-2.5 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Name & Price */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-0.5 sm:gap-2 mb-1 sm:mb-1.5">
                      <h4 className={`font-bold text-[15px] sm:text-base ${isDark ? 'text-white' : 'text-zinc-900'} line-clamp-1 sm:line-clamp-2 leading-tight`}>
                        {product.name}
                      </h4>
                      <span className="font-extrabold text-[15px] sm:text-base text-orange-500 flex-shrink-0 tracking-tight">
                        Rs. {formatPrice(activePrice)}
                      </span>
                    </div>

                    {/* Description */}
                    <p className={`${isDark ? 'text-zinc-400' : 'text-[#78716c]'} text-[10px] sm:text-xs line-clamp-2 leading-tight sm:leading-relaxed mb-2 sm:mb-3`}>
                      {product.description}
                    </p>

                    {/* Sizes Selector Capsule Track */}
                    {product.sizes && product.sizes.length > 0 && (
                      <div className={`${isDark ? 'bg-zinc-800/80 border-zinc-700/80' : 'bg-[#f5f1eb] border-[#eee8df]/80'} rounded-full p-0.5 sm:p-1 flex items-center justify-between gap-0.5 sm:gap-1 mb-2.5 sm:mb-4 border`}>
                        {product.sizes.map((s) => {
                          const isSizeActive = selectedSize?.label === s.label;
                          return (
                            <button
                              key={s.label}
                              type="button"
                              disabled={isSoldOut}
                              onClick={() => handleSelectSize(product.id, s)}
                              className={`flex-1 py-0.5 sm:py-1 px-1 sm:px-3 rounded-full text-[9px] sm:text-xs font-bold uppercase tracking-wider text-center transition-all duration-200 cursor-pointer ${
                                isSizeActive
                                  ? 'bg-orange-500 text-white shadow-sm'
                                  : isDark ? 'text-zinc-400 hover:text-white bg-transparent' : 'text-[#635d56] hover:text-zinc-900 bg-transparent'
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
                  <div className={`space-y-1.5 sm:space-y-2 pt-1.5 sm:pt-2 border-t ${isDark ? 'border-zinc-800/80' : 'border-zinc-100'}`}>
                    {isSoldOut ? (
                      <div className="space-y-1 sm:space-y-1.5">
                        <button
                          type="button"
                          disabled
                          className={`w-full h-8 sm:h-10 flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl ${
                            isDark ? 'bg-zinc-800/60 border-zinc-700 text-zinc-500' : 'bg-zinc-100 border border-zinc-200 text-zinc-400'
                          } text-[10px] sm:text-xs font-bold cursor-not-allowed uppercase tracking-wider`}
                        >
                          <Ban className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500 shrink-0" />
                          <span className="truncate">Sold Out</span>
                        </button>
                        <p className={`text-[9px] sm:text-[11px] text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'} font-medium italic truncate`}>
                          Unavailable today
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {/* Sleek Stepper */}
                          <div className={`flex items-center h-9 sm:h-10 rounded-lg sm:rounded-xl ${isDark ? 'bg-zinc-800/90 border-zinc-700/80' : 'bg-zinc-100/90 border-zinc-200/80'} border p-0.5 shadow-2xs`}>
                            <button
                              type="button"
                              onClick={() => setQty(product.id, -1)}
                              className={`w-6 sm:w-8 h-full rounded-md sm:rounded-lg flex items-center justify-center ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-700' : 'text-zinc-600 hover:text-zinc-950 hover:bg-white'} active:scale-90 transition-all cursor-pointer`}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                            <span className={`w-5 sm:w-7 text-center font-bold text-xs sm:text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(product.id, 1)}
                              className={`w-6 sm:w-8 h-full rounded-md sm:rounded-lg flex items-center justify-center ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-700' : 'text-zinc-600 hover:text-zinc-950 hover:bg-white'} active:scale-90 transition-all cursor-pointer`}
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>

                          {/* Add to Cart */}
                          <button
                            type="button"
                            onClick={(e) => handleAddToCart(product, e)}
                            className={`flex-1 h-9 sm:h-10 px-2 sm:px-3 flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl active:scale-[0.98] font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600 text-white'
                                : isDark
                                  ? 'bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white'
                                  : 'bg-zinc-100 hover:bg-zinc-200/90 border border-zinc-300 text-zinc-900'
                            }`}
                          >
                            <ShoppingBag className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isAdded ? 'text-white' : 'text-orange-500'} shrink-0`} />
                            <span className="truncate">{isAdded ? 'Added!' : 'Add to Cart'}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
