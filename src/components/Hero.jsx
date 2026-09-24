import React, { useMemo, useState, useEffect } from 'react';
import { Flame, Clock, Star, Utensils } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { apiUrl, isCustomerApp } from '../config/api';
import { formatPrice } from '../utils/formatters';

export default function Hero({ products: propProducts = [], deals: propDeals = [] }) {
  const { settings, isDark } = useCart();
  const [internalProducts, setInternalProducts] = useState([]);
  const [internalDeals, setInternalDeals] = useState([]);

  useEffect(() => {
    if (propProducts.length === 0) {
      fetch(apiUrl('/api/products'))
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setInternalProducts(data);
        })
        .catch(() => {});
    }
    if (propDeals.length === 0) {
      fetch(apiUrl('/api/deals'))
        .then((r) => r.json())
        .then((data) => {
          if (data?.deals) setInternalDeals(data.deals);
        })
        .catch(() => {});
    }
  }, [propProducts.length, propDeals.length]);

  const allProducts = propProducts.length > 0 ? propProducts : internalProducts;
  const allDeals = propDeals.length > 0 ? propDeals : internalDeals;

  const totalItems = allProducts.length > 0 ? allProducts.length : 57;

  const lowestDealPrice = useMemo(() => {
    if (allDeals && allDeals.length > 0) {
      const prices = allDeals
        .map((d) => Number(d.price))
        .filter((p) => !isNaN(p) && p > 0);
      if (prices.length > 0) return Math.min(...prices);
    }
    return 600;
  }, [allDeals]);

  const freeDeliveryEnabled = settings?.freeDeliveryEnabled === true && Number(settings?.freeDeliveryThreshold || 0) > 0;
  const freeDeliveryAmount = freeDeliveryEnabled ? Number(settings.freeDeliveryThreshold) : 0;
  return (
    <section
      id="home"
      className={`relative ${isCustomerApp ? 'pt-20 pb-12' : 'pt-32 pb-16'} lg:pt-40 lg:pb-24 overflow-hidden ${isDark ? 'bg-[#0d0d0e]' : 'bg-[#fffaf5]'} transition-colors duration-300`}
      style={{
        background: isDark
          ? `
            radial-gradient(ellipse 80% 70% at 95% 25%, rgba(165, 28, 28, 0.45) 0%, rgba(100, 18, 22, 0.25) 50%, transparent 80%),
            radial-gradient(ellipse 70% 60% at 5% 45%, rgba(217, 85, 12, 0.28) 0%, rgba(146, 45, 10, 0.12) 45%, transparent 75%),
            radial-gradient(ellipse 55% 35% at 50% 0%, rgba(120, 20, 20, 0.2) 0%, transparent 60%),
            linear-gradient(180deg, #150908 0%, #0f0b0d 45%, #0d0d0e 85%)
          `
          : `
            radial-gradient(ellipse 80% 70% at 95% 20%, rgba(249, 115, 22, 0.15) 0%, rgba(251, 146, 60, 0.05) 50%, transparent 80%),
            radial-gradient(ellipse 70% 60% at 5% 40%, rgba(234, 88, 12, 0.12) 0%, rgba(249, 115, 22, 0.04) 45%, transparent 75%),
            radial-gradient(ellipse 55% 35% at 50% 0%, rgba(251, 191, 36, 0.12) 0%, transparent 60%),
            linear-gradient(180deg, #fffaf5 0%, #fbf5ec 45%, #f6efe4 85%, #f3eae0 100%)
          `
      }}
    >
      {/* Background ambient lighting */}
      <div className={`absolute top-1/4 left-0 w-[500px] h-[500px] ${isDark ? 'bg-amber-600/15' : 'bg-orange-500/10'} blur-[140px] rounded-full pointer-events-none`} />
      <div className={`absolute top-16 right-0 w-[600px] h-[600px] ${isDark ? 'bg-red-700/25' : 'bg-amber-400/15'} blur-[160px] rounded-full pointer-events-none`} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6">
            
            {/* Tag badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold tracking-widest uppercase animate-fade-in">
              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
              <span>FRESH • HOT • DELICIOUS</span>
            </div>

            {/* Main Headline */}
            <h1 className={`text-5xl sm:text-6xl md:text-7xl lg:text-[5.25rem] font-display uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'} leading-[0.92]`}>
              SALIK FAST FOOD <br />
              WAH CANTT <br />
              <span className="text-gradient-orange">MADE FRESH.</span>
            </h1>

            {/* Subtitle */}
            <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-600 font-medium'} text-base sm:text-lg max-w-xl leading-relaxed`}>
              Best pizza, zinger burgers, shawarma, broast wings and combo deals with fast home delivery in Wah Cantt — Wah Model Town.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#order"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                Order Now
              </a>
              <a
                href="#menu"
                className={`inline-flex items-center justify-center px-8 py-3.5 rounded-full ${
                  isDark
                    ? 'bg-zinc-900/90 hover:bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white'
                    : 'bg-white hover:bg-zinc-50 border-zinc-200/90 text-zinc-800 hover:text-orange-600 shadow-sm'
                } border font-bold text-sm uppercase tracking-wider transition-all`}
              >
                Explore Menu
              </a>
            </div>

            {/* Trust Badges Row */}
            <div className={`grid grid-cols-3 gap-4 pt-6 border-t ${isDark ? 'border-zinc-800/80' : 'border-zinc-300/80'} w-full max-w-lg`}>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-orange-400 font-bold text-sm">
                  <Clock className="w-4 h-4" />
                  <span>20-30 Min</span>
                </div>
                <span className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-600'} font-semibold uppercase tracking-wider mt-1`}>
                  HOME DELIVERY
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>4.8 / 5</span>
                </div>
                <span className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-600'} font-semibold uppercase tracking-wider mt-1`}>
                  LOVED LOCALLY
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-orange-400 font-bold text-sm">
                  <Utensils className="w-4 h-4" />
                  <span>{totalItems} ITEMS</span>
                </div>
                <span className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-600'} font-semibold uppercase tracking-wider mt-1`}>
                  FULL MENU
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Visual composition */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-[480px] group">
              {/* Glow backdrop */}
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/30 to-amber-500/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 -z-10" />

              {/* Main Image Frame */}
              <div className={`relative rounded-3xl overflow-hidden border ${isDark ? 'border-zinc-800 bg-[#141416]' : 'border-zinc-200 bg-white'} shadow-2xl`}>
                <img
                  src="/assets/hero-food.jpg"
                  alt="Delicious Fast Food Platter"
                  className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                />

                {/* Compact Floating Deals Badge */}
                <a
                  href="#deals"
                  className={`absolute bottom-3 left-3 sm:bottom-4 sm:left-4 backdrop-blur-md rounded-2xl sm:rounded-3xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-2xl border transition-all duration-200 flex flex-col items-start justify-center z-10 hover:scale-105 active:scale-95 ${
                    isDark
                      ? 'bg-zinc-950/85 border-white/10 shadow-black/70'
                      : 'bg-white/95 border-white/60 shadow-xl'
                  }`}
                  aria-label="View Deals"
                >
                  <span className={`font-sans font-bold ${isCustomerApp ? 'text-[1.75rem] leading-none' : 'text-lg sm:text-xl md:text-2xl lg:text-[1.6rem]'} text-gradient-orange tracking-tight uppercase inline-block pr-1.5`}>
                    DEALS FROM RS. {formatPrice(lowestDealPrice)}
                  </span>
                  <span className={`font-sans ${isCustomerApp ? 'text-xs font-semibold' : 'text-xs sm:text-xs md:text-sm'} font-medium leading-normal mt-0.5 block whitespace-nowrap ${
                    isDark ? 'text-zinc-300' : 'text-zinc-600'
                  }`}>
                    {freeDeliveryEnabled
                      ? `Free Delivery on order above Rs. ${formatPrice(freeDeliveryAmount)}`
                      : 'Hot & Fresh Delivery Wah Cantt'}
                  </span>
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
