import React, { useState, useMemo } from 'react';
import { Flame, Check, Plus, Minus, ShoppingBag, Users, Zap } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice, cleanDealInclusions } from '../utils/formatters';

function isFamilyDeal(deal) {
  if (!deal) return false;
  return (
    deal.dealType === 'family' ||
    deal.id === 'family-deal' ||
    (deal.name && deal.name.toLowerCase().includes('family'))
  );
}

export default function DealsSection({ deals = [], familyDeal = null }) {
  const { addToCart, isDark } = useCart();
  const [quantities, setQuantities] = useState({});

  const getQty = (id) => quantities[id] || 1;
  const setQty = (id, delta) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const handleAddToCart = (deal, e = null) => {
    const qty = getQty(deal.id);
    const cleanedIncludes = cleanDealInclusions(deal.includes || []);
    const cleanDesc = cleanDealInclusions(deal.description || (Array.isArray(cleanedIncludes) ? cleanedIncludes.join(' + ') : cleanedIncludes) || '');
    addToCart({
      ...deal,
      category: 'deals',
      includes: cleanedIncludes,
      description: cleanDesc
    }, null, qty, e?.currentTarget);
  };

  const handleOrderNow = (deal) => {
    handleAddToCart(deal);
    const orderSection = document.getElementById('order');
    if (orderSection) {
      orderSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Separate normal deals and family deals
  const normalDeals = deals.filter((d) => !isFamilyDeal(d));
  const rawFamilyDeals = [
    ...deals.filter((d) => isFamilyDeal(d)),
    ...(familyDeal && !deals.some((d) => d.id === familyDeal.id) ? [familyDeal] : [])
  ];
  // Deduplicate by ID
  const familyDeals = Array.from(new Map(rawFamilyDeals.map((d) => [d.id, d])).values());

  // Adaptive layout based on deal count for perfect website proportions
  const normalDealsGridClass = useMemo(() => {
    const count = normalDeals.length;
    if (count === 1) return 'grid grid-cols-1 max-w-md mx-auto gap-8';
    if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8';
    if (count === 3) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto gap-6 sm:gap-8';
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
  }, [normalDeals.length]);

  const isSpaciousCards = normalDeals.length <= 2;

  if (normalDeals.length === 0 && familyDeals.length === 0) {
    return null;
  }

  return (
    <section
      id="deals"
      className={`py-20 ${
        isDark
          ? 'bg-[#0c0c0d] border-zinc-900'
          : 'bg-gradient-to-b from-[#f4eee4] via-[#f8f4ec] to-[#fbf8f3] border-zinc-200/80'
      } border-t transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* NORMAL COMBO DEALS SECTION */}
        {normalDeals.length > 0 && (
          <div className="mb-16">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold tracking-widest uppercase">
                <Flame className="w-3.5 h-3.5 fill-orange-400" />
                <span>COMBO DEALS</span>
              </div>
              <h2 className={`text-5xl sm:text-6xl font-display uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                <span className="text-primary">GO</span> DEALS
              </h2>
              <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-600'} text-base sm:text-lg`}>
                Best Deals. Better Taste. More Value.
              </p>
            </div>

            {/* Normal Deals Grid */}
            <div className={normalDealsGridClass}>
              {normalDeals.map((deal) => {
                const qty = getQty(deal.id);
                return (
                  <div
                    key={deal.id}
                    className={`group relative flex flex-col justify-between ${
                      isDark
                        ? 'bg-[#161618] border-zinc-800/80 hover:shadow-card-dark'
                        : 'bg-white border-zinc-200/90 shadow-md hover:shadow-xl'
                    } rounded-2xl border overflow-hidden hover:border-orange-500/50 transition-all duration-300`}
                  >
                    {/* Deal Tag Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-full bg-orange-600 text-white text-[10px] font-extrabold tracking-wider uppercase shadow-md">
                        DEAL {deal.number || deal.id.replace('deal-', '')}
                      </span>
                    </div>

                    {/* Deal Image */}
                    <div
                      className={`relative w-full bg-black flex items-center justify-center overflow-hidden transition-all duration-300 ${
                        isSpaciousCards ? 'h-56 sm:h-64 p-4' : 'h-48 sm:h-52 p-3'
                      }`}
                    >
                      <img
                        src={deal.image}
                        alt={deal.name}
                        className={`w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300 ${
                          isSpaciousCards ? 'max-h-52 sm:max-h-56' : 'max-h-44'
                        }`}
                        onError={(e) => {
                          e.target.src = '/assets/deal-1.png';
                        }}
                      />

                      {/* Price Tag Overlay in Gold */}
                      <div
                        className={`absolute bottom-3 right-3 z-10 bg-amber-400 text-zinc-950 font-sans font-bold tracking-wide shadow-md ${
                          isSpaciousCards
                            ? 'text-sm sm:text-base px-3 py-1.5 rounded-lg'
                            : 'text-xs sm:text-sm px-2.5 py-1 rounded-md'
                        }`}
                      >
                        Rs. {formatPrice(deal.price)}
                      </div>
                    </div>

                    {/* Deal Inclusions Checklist */}
                    <div
                      className={`flex-1 flex flex-col justify-between bg-white rounded-b-2xl text-zinc-900 ${
                        isSpaciousCards ? 'p-6 sm:p-7' : 'p-5'
                      }`}
                    >
                      <div>
                        <h4
                          className={`font-bold text-zinc-900 truncate ${
                            isSpaciousCards ? 'text-base sm:text-lg mb-2.5' : 'text-sm mb-2'
                          }`}
                        >
                          {deal.name || `Deal ${deal.number || ''}`}
                        </h4>
                        <ul className={`space-y-2 ${isSpaciousCards ? 'mb-6' : 'mb-5'}`}>
                          {(deal.includes || []).map((item, idx) => (
                            <li
                              key={idx}
                              className={`flex items-center gap-2 font-semibold text-zinc-800 ${
                                isSpaciousCards ? 'text-xs sm:text-[13px]' : 'text-xs'
                              }`}
                            >
                              <Check
                                className={`text-orange-600 flex-shrink-0 ${
                                  isSpaciousCards ? 'w-4 h-4' : 'w-3.5 h-3.5'
                                }`}
                              />
                              <span>{cleanDealInclusions(item)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Quantity Stepper and Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-zinc-100">
                        <div className="flex items-center gap-2">
                          {/* Sleek, Modern Stepper */}
                          <div className="flex items-center h-10 rounded-xl bg-zinc-100/90 border border-zinc-200/80 p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setQty(deal.id, -1)}
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
                              onClick={() => setQty(deal.id, 1)}
                              className="w-8 h-full rounded-lg flex items-center justify-center text-zinc-600 hover:text-zinc-950 hover:bg-white active:scale-90 transition-all cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Add to Cart Button */}
                          <button
                            type="button"
                            onClick={(e) => handleAddToCart(deal, e)}
                            className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                            <span>Add to Cart</span>
                          </button>
                        </div>

                        {/* ORDER NOW Orange Button */}
                        <button
                          type="button"
                          onClick={() => handleOrderNow(deal)}
                          className="w-full h-10 rounded-xl bg-gradient-to-r from-[#e53e10] to-[#f56505] hover:from-[#d1350a] hover:to-[#e05703] active:scale-[0.98] text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>Order Now</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* FAMILY DEALS & FEASTS (FAMILY DEAL 1, 2, 3...) */}
        {/* ==================================================================== */}
        {familyDeals.length > 0 && (
          <div className="space-y-8">
            {/* Family Deals Header */}
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-widest uppercase">
                <Users className="w-3.5 h-3.5 fill-amber-400" />
                <span>FAMILY DEALS & FEASTS</span>
              </div>
              <h3 className={`text-4xl sm:text-5xl font-display uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                MEGA <span className="text-amber-500">FAMILY</span> BUNDLES
              </h3>
              <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-600'} text-sm sm:text-base`}>
                Bigger savings, hearty portions for the whole family to feast together!
              </p>
            </div>

            {/* If single Family Deal: Full-width Grand Banner */}
            {familyDeals.length === 1 ? (
              (() => {
                const deal = familyDeals[0];
                const qty = getQty(deal.id);
                return (
                  <div className={`relative rounded-3xl overflow-hidden border border-amber-500/40 ${isDark ? 'bg-[#161619]' : 'bg-white shadow-xl'} shadow-2xl p-6 lg:p-8`}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                      {/* Left Side Image */}
                      <div className="lg:col-span-6 relative">
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full bg-amber-500 text-zinc-950 font-extrabold text-xs uppercase tracking-wider shadow">
                            {deal.name ? deal.name.toUpperCase() : 'FAMILY BUNDLE'}
                          </span>
                        </div>
                        <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center p-4">
                          <img
                            src={deal.image || '/assets/deal-family.png'}
                            alt={deal.name || 'Family Deal'}
                            className="w-full h-auto max-h-72 object-contain hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              e.target.src = '/assets/deal-family.png';
                            }}
                          />
                        </div>
                      </div>

                      {/* Right Side: Copy, Inclusions & Actions */}
                      <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl text-zinc-900 flex flex-col justify-between">
                        <div>
                          <div className="flex items-baseline justify-between mb-2">
                            <h3 className="font-display text-4xl sm:text-5xl text-zinc-900 tracking-tight leading-none">
                              {deal.name || 'FAMILY DEAL'}
                            </h3>
                            <span className="text-2xl sm:text-3xl font-display text-orange-600 font-bold flex items-baseline">
                              <span className="font-sans text-lg sm:text-xl font-bold mr-1">Rs.</span>
                              <span>{formatPrice(deal.price)}</span>
                            </span>
                          </div>

                          <p className="text-zinc-600 text-sm mb-6 leading-relaxed">
                            One big combo bundle crafted for the entire family — packed with burgers, pizza, shawarmas, and chilled beverages.
                          </p>

                          {/* 2-Column Checklist */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                            {(deal.includes || []).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs font-bold text-zinc-800">
                                <Check className="w-4 h-4 text-orange-600 flex-shrink-0" />
                                <span>{cleanDealInclusions(item)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-zinc-200">
                          <button
                            type="button"
                            onClick={(e) => handleAddToCart(deal, e)}
                            className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow cursor-pointer"
                          >
                            <ShoppingBag className="w-4 h-4 text-orange-400" />
                            <span>Add to Cart</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOrderNow(deal)}
                            className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#e53e10] to-[#f56505] hover:from-[#d1350a] hover:to-[#e05703] text-white font-bold text-xs uppercase tracking-wider shadow hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <Zap className="w-4 h-4 fill-white" />
                            <span>Order Now</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* If multiple Family Deals (Family Deal 1, 2, 3...): Grid of Grand Cards */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {familyDeals.map((deal) => {
                  const qty = getQty(deal.id);
                  return (
                    <div
                      key={deal.id}
                      className={`relative rounded-3xl overflow-hidden border border-amber-500/40 ${isDark ? 'bg-[#161619]' : 'bg-white shadow-xl'} shadow-xl flex flex-col justify-between p-6 group hover:border-amber-500 transition-all duration-300`}
                    >
                      <div>
                        {/* Header & Badges */}
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <span className="px-3 py-1 rounded-full bg-amber-500 text-zinc-950 font-extrabold text-xs uppercase tracking-wider shadow">
                            {deal.name ? deal.name.toUpperCase() : `FAMILY DEAL ${deal.number || ''}`}
                          </span>
                          <span className="font-display text-2xl text-amber-400 font-bold flex items-baseline">
                            <span className="font-sans text-base font-bold mr-1">Rs.</span>
                            <span>{formatPrice(deal.price)}</span>
                          </span>
                        </div>

                        {/* Image */}
                        <div className="w-full h-52 rounded-2xl bg-black flex items-center justify-center p-3 mb-5 overflow-hidden">
                          <img
                            src={deal.image || '/assets/deal-family.png'}
                            alt={deal.name}
                            className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              e.target.src = '/assets/deal-family.png';
                            }}
                          />
                        </div>

                        {/* Inclusions Card */}
                        <div className="bg-white rounded-2xl p-5 mb-5 text-zinc-900">
                          <span className="font-bold text-[11px] text-zinc-500 uppercase tracking-wider block mb-2">
                            Included in this Bundle:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {(deal.includes || []).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs font-bold text-zinc-800">
                                <Check className="w-4 h-4 text-orange-600 flex-shrink-0" />
                                <span className="truncate">{cleanDealInclusions(item)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Stepper & Actions */}
                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center h-10 border border-zinc-700 rounded-xl overflow-hidden bg-zinc-900">
                            <button
                              type="button"
                              onClick={() => setQty(deal.id, -1)}
                              className="w-8 h-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 text-xs font-bold text-white text-center">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQty(deal.id, 1)}
                              className="w-8 h-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleAddToCart(deal, e)}
                            className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-100 active:scale-[0.98] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                          >
                            <ShoppingBag className="w-4 h-4 text-orange-600" />
                            <span>Add to Cart</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOrderNow(deal)}
                          className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e53e10] to-[#f56505] hover:from-[#d1350a] hover:to-[#e05703] active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider shadow-xs cursor-pointer transition-all"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>Order Now</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}
