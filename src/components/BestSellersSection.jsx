import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Plus, Minus, Zap, Flame, Ban } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { apiUrl } from '../config/api';

export default function BestSellersSection({ products = [], categories = [], settings = null }) {
  const { addToCart } = useCart();
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

  // Size helper
  const getSelectedSize = (product) => {
    if (!product.sizes || product.sizes.length === 0) return null;
    const current = selectedSizes[product.id];
    if (current) return current;
    // Default to Medium if available, else first size
    const med = product.sizes.find((s) => s.label.toLowerCase() === 'medium');
    return med || product.sizes[0];
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

  const handleOrderNow = (product) => {
    if (product.inStock === false) return;
    handleAddToCart(product);
    const orderSec = document.getElementById('order');
    if (orderSec) {
      orderSec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!displayItems || displayItems.length === 0) {
    return null;
  }

  return (
    <section
      id="best-sellers"
      className="relative py-14 sm:py-20 bg-[#0c0c0e] border-t border-b border-zinc-800/80 overflow-hidden"
    >
      {/* Background ambient glow */}
      <div className="absolute top-1/3 left-10 w-[450px] h-[450px] bg-orange-600/10 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-red-500/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-orange-600 animate-ping" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-orange-500 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                <span>Wah Cantt's Most Ordered</span>
              </span>
            </div>

            <div className="relative inline-block">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display uppercase tracking-tight text-white leading-none">
                BEST <span className="text-orange-500">SELLERS</span>
              </h2>
              <div className="h-1.5 w-20 bg-orange-600 rounded-full mt-2" />
            </div>

            <p className="text-zinc-400 text-xs sm:text-sm mt-2.5 max-w-xl leading-relaxed">
              Top trending meals chosen by food lovers across Wah Model Town. Freshly prepared, loaded with flavors, and always piping hot.
            </p>
          </div>
        </div>

        {/* 4 Cards Grid - Exact Same Design as Website Menu Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayItems.map((product, index) => {
            const selectedSize = getSelectedSize(product);
            const activePrice = selectedSize ? selectedSize.price : product.price;
            const qty = getQty(product.id);
            const isSoldOut = product.inStock === false;
            const isAdded = Boolean(addedItemMap[product.id]);

            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group ${
                  isSoldOut ? 'opacity-90' : ''
                }`}
              >
                {/* Card Media Top */}
                <div className="relative w-full h-48 bg-zinc-100 overflow-hidden">
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
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                    {isSoldOut ? (
                      <span className="px-2.5 py-1 rounded-md bg-zinc-900/95 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1.5 backdrop-blur-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        Sold Out Today
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md bg-orange-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-white" />
                        #{index + 1} Best Seller
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Name & Price */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-bold text-sm sm:text-base text-zinc-900 uppercase tracking-wide">
                        {product.name}
                      </h4>
                      <span className="font-bold text-sm sm:text-base text-red-600 flex-shrink-0 tracking-tight">
                        Rs. {activePrice.toLocaleString()}
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
                              className={`flex-1 py-1 px-3 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider text-center transition-all duration-200 cursor-pointer ${
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
                          {/* Sleek Stepper */}
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
                            className={`flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl active:scale-[0.98] font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                            }`}
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                            <span>{isAdded ? 'Added!' : 'Add to Cart'}</span>
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

      </div>
    </section>
  );
}
