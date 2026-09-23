import React, { useState, useEffect } from 'react';
import { Award, ArrowRight } from 'lucide-react';
import { apiUrl } from '../config/api';
import { useCart } from '../context/CartContext';

export default function AboutSection({ categories = [], products = [], deals = [] }) {
  const { isDark } = useCart();
  const [internalCategories, setInternalCategories] = useState([]);
  const [internalProducts, setInternalProducts] = useState([]);
  const [internalDeals, setInternalDeals] = useState([]);

  useEffect(() => {
    if (categories.length === 0) {
      fetch(apiUrl('/api/categories'))
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setInternalCategories(data);
        })
        .catch(() => {});
    }
    if (products.length === 0) {
      fetch(apiUrl('/api/products'))
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setInternalProducts(data);
        })
        .catch(() => {});
    }
    if (deals.length === 0) {
      fetch(apiUrl('/api/deals'))
        .then((r) => r.json())
        .then((data) => {
          if (data?.deals) setInternalDeals(data.deals);
        })
        .catch(() => {});
    }
  }, [categories.length, products.length, deals.length]);

  const allCategories = categories.length > 0 ? categories : internalCategories;
  const allProducts = products.length > 0 ? products : internalProducts;
  const allDeals = deals.length > 0 ? deals : internalDeals;

  const categoriesCount = allCategories.length > 0 ? allCategories.length : 9;
  const productsCount = allProducts.length > 0 ? allProducts.length : 57;
  const dealsCount = allDeals.length > 0 ? allDeals.length : 4;

  return (
    <section id="about" className={`py-20 ${isDark ? 'bg-[#0d0d10] border-t border-zinc-800/80' : 'bg-cream border-t border-zinc-200'} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Image with 100% Fresh stamp */}
          <div className="lg:col-span-6 relative">
            <div className={`relative rounded-3xl overflow-hidden shadow-2xl border ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <img
                src="/assets/images/cat-pizza-BmV7hCev.jpg"
                alt="Salik Fast Food Fresh Preparation"
                className="w-full h-80 sm:h-96 object-cover"
                onError={(e) => {
                  e.target.src = '/assets/hero-food.jpg';
                }}
              />
              
              {/* Circular 100% Fresh Daily Stamp */}
              <div className="absolute bottom-4 right-4 bg-zinc-950/90 text-white rounded-2xl p-4 border border-zinc-800 shadow-xl flex flex-col items-center">
                <Award className="w-5 h-5 text-orange-500 mb-1" />
                <span className="font-display text-2xl text-amber-400 leading-none">100%</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                  FRESH DAILY
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Copy & Stats */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-xs font-bold tracking-[0.2em] text-orange-500 sm:text-orange-600 uppercase">
                ABOUT US
              </span>
              <h2 className={`mt-2 text-4xl sm:text-5xl lg:text-6xl font-display uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'} leading-none`}>
                TASTE THAT YOU <span className="text-orange-500 sm:text-orange-600">NEED</span>
              </h2>
            </div>

            <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-600'} text-base leading-relaxed`}>
              Salik Fast Food brings together freshly prepared pizzas, burgers, shawarma, sandwiches and delicious fast-food deals, made for great taste and value.
            </p>

            <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-600'} text-sm leading-relaxed`}>
              Every order is cooked after you place it — hot dough, marinated chicken and our own sauces. From a single zinger burger to a full family deal, we keep the quality the same.
            </p>

            {/* 3 Metric cards */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div className={`${isDark ? 'bg-[#141419] border-white/10 text-white shadow-card-dark' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'} rounded-2xl p-4 border text-center`}>
                <span className={`font-display text-3xl sm:text-4xl ${isDark ? 'text-white' : 'text-zinc-900'} block leading-none mb-1`}>
                  {categoriesCount}
                </span>
                <span className={`text-[11px] font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'} uppercase tracking-wider`}>
                  Categories
                </span>
              </div>

              <div className={`${isDark ? 'bg-[#141419] border-white/10 text-white shadow-card-dark' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'} rounded-2xl p-4 border text-center`}>
                <span className="font-display text-3xl sm:text-4xl text-orange-500 sm:text-orange-600 block leading-none mb-1">
                  {productsCount}
                </span>
                <span className={`text-[11px] font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'} uppercase tracking-wider`}>
                  Menu Items
                </span>
              </div>

              <div className={`${isDark ? 'bg-[#141419] border-white/10 text-white shadow-card-dark' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'} rounded-2xl p-4 border text-center`}>
                <span className="font-display text-3xl sm:text-4xl text-amber-500 block leading-none mb-1">
                  {dealsCount}
                </span>
                <span className={`text-[11px] font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'} uppercase tracking-wider`}>
                  Value Deals
                </span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="#menu"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all hover:scale-105"
              >
                <span>Explore Menu</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
