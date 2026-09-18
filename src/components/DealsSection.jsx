import React, { useState } from 'react';
import { Flame, Check, Plus, Minus, ShoppingBag, MessageCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function DealsSection({ deals = [], familyDeal = null }) {
  const { addToCart, setIsCartOpen } = useCart();
  const [quantities, setQuantities] = useState({});

  const getQty = (id) => quantities[id] || 1;
  const setQty = (id, delta) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const handleAddToCart = (deal) => {
    const qty = getQty(deal.id);
    addToCart(deal, null, qty);
  };

  const handleOrderNow = (deal) => {
    handleAddToCart(deal);
    const orderSection = document.getElementById('order');
    if (orderSection) {
      orderSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleWhatsAppFamilyDeal = () => {
    const text = encodeURIComponent(
      `Assalam o Alaikum Mehrban Fast Food! I want to order the FAMILY DEAL (1 Zinger Burger, 2 Patty Burger, 2 Small Shawarma, 1 Large Shawarma, 6 Nuggets, 1 Coke 1.5L) — Rs. 1,580.`
    );
    window.open(`https://wa.me/923236580604?text=${text}`, '_blank');
  };

  return (
    <section id="deals" className="py-20 bg-[#0c0c0d] border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold tracking-widest uppercase">
            <Flame className="w-3.5 h-3.5 fill-orange-400" />
            <span>COMBO DEALS</span>
          </div>
          <h2 className="text-5xl sm:text-6xl font-display uppercase tracking-tight text-white">
            <span className="text-primary">GO</span> DEALS
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg">
            Best Deals. Better Taste. More Value.
          </p>
        </div>

        {/* 11 Combo Deals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {deals.map((deal) => {
            const qty = getQty(deal.id);
            return (
              <div
                key={deal.id}
                className="group relative flex flex-col justify-between bg-[#161618] rounded-2xl border border-zinc-800/80 overflow-hidden hover:border-orange-500/50 transition-all duration-300 hover:shadow-card-dark"
              >
                {/* Deal Tag Badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-2.5 py-1 rounded-full bg-orange-600 text-white text-[10px] font-extrabold tracking-wider uppercase shadow-md">
                    DEAL {deal.number || deal.id.replace('deal-', '')}
                  </span>
                </div>

                {/* Deal Image with Coke Bottle */}
                <div className="relative w-full h-48 sm:h-52 bg-black flex items-center justify-center p-3 overflow-hidden">
                  <img
                    src={deal.image}
                    alt={deal.name}
                    className="w-full h-full max-h-44 object-contain transform group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = '/assets/deal-1.png';
                    }}
                  />
                  
                  {/* Price Tag Overlay in Gold */}
                  <div className="absolute bottom-3 right-3 z-10 bg-amber-400 text-zinc-950 font-sans text-xs sm:text-sm font-bold tracking-wide px-2.5 py-1 rounded-md shadow-md">
                    RS. {deal.price.toLocaleString()}
                  </div>
                </div>

                {/* Deal Inclusions Checklist */}
                <div className="p-5 flex-1 flex flex-col justify-between bg-white rounded-b-2xl text-zinc-900">
                  <ul className="space-y-2 mb-5">
                    {(deal.includes || []).map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs font-semibold text-zinc-800">
                        <Check className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Quantity Stepper and Add To Cart */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden bg-zinc-50">
                        <button
                          onClick={() => setQty(deal.id, -1)}
                          className="px-2.5 py-1.5 hover:bg-zinc-200 text-zinc-700 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 py-1 text-xs font-bold text-zinc-900 min-w-[24px] text-center">
                          {qty}
                        </span>
                        <button
                          onClick={() => setQty(deal.id, 1)}
                          className="px-2.5 py-1.5 hover:bg-zinc-200 text-zinc-700 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleAddToCart(deal)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                        <span>Add to Cart</span>
                      </button>
                    </div>

                    {/* ORDER NOW Orange button */}
                    <button
                      onClick={() => handleOrderNow(deal)}
                      className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                    >
                      Order Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAMILY DEAL BANNER */}
        {familyDeal && (
          <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-[#161619] shadow-2xl p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Side: Family Bundle Image */}
              <div className="lg:col-span-6 relative">
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-zinc-950 font-extrabold text-xs uppercase tracking-wider shadow">
                    FAMILY BUNDLE
                  </span>
                </div>
                <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center p-4">
                  <img
                    src={familyDeal.image || '/assets/deal-family.png'}
                    alt="Family Deal"
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
                      FAMILY <span className="text-orange-600">DEAL</span>
                    </h3>
                    <span className="text-2xl sm:text-3xl font-display text-orange-600 font-bold">
                      RS. {familyDeal.price.toLocaleString()}
                    </span>
                  </div>

                  <p className="text-zinc-600 text-sm mb-6 leading-relaxed">
                    One big bundle for the whole family — burgers, shawarma, nuggets and a chilled 1.5L Coke.
                  </p>

                  {/* 2-Column Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                    {(familyDeal.includes || []).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-bold text-zinc-800">
                        <Check className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-zinc-200">
                  <button
                    onClick={() => handleAddToCart(familyDeal)}
                    className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow"
                  >
                    <ShoppingBag className="w-4 h-4 text-orange-400" />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    onClick={handleWhatsAppFamilyDeal}
                    className="w-full sm:w-1/2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Order Now on WhatsApp</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}
