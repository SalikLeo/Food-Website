import React, { useState, useMemo } from 'react';
import { Search, ShoppingBag, Plus, Minus, Tag, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function MenuSection({ categories = [], products = [] }) {
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState('pizza');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSizes, setSelectedSizes] = useState({});
  const [quantities, setQuantities] = useState({});

  // Active category blurb
  const activeCat = categories.find(c => c.id === selectedCategory) || categories[0];

  // Only show available (in stock) products on the public storefront
  const inStockProducts = useMemo(() => {
    return (products || []).filter(p => p.inStock !== false);
  }, [products]);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    let list = inStockProducts;
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
    return list;
  }, [inStockProducts, selectedCategory, searchQuery]);

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

  const handleAddToCart = (product) => {
    if (product.inStock === false) return;
    const size = getSelectedSize(product);
    const qty = getQty(product.id);
    addToCart(product, size, qty);
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Category Pills Navigation */}
        {!searchQuery && (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-4 mb-8 category-scroll">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const itemCount = inStockProducts.filter(p => p.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
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

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Card Media Top */}
                  <div className="relative w-full h-48 bg-zinc-100 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = '/assets/images/cat-special-CdXGKIOV.jpg';
                      }}
                    />

                    {/* Tag / Badge */}
                    {product.tag && (
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-md bg-orange-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow">
                          {product.tag}
                        </span>
                      </div>
                    )}
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
                          RS. {activePrice.toLocaleString()}
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
                                onClick={() => handleSelectSize(product.id, s)}
                                className={`flex-1 py-1 px-3 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider text-center transition-all duration-200 ${
                                  isSizeActive
                                    ? 'bg-gradient-to-r from-[#d93409] to-[#ea580c] text-white shadow-sm'
                                    : 'text-[#635d56] hover:text-zinc-900 bg-transparent'
                                }`}
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
                      <div className="flex items-center gap-2">
                        {/* Stepper */}
                        <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden bg-zinc-50">
                          <button
                            onClick={() => setQty(product.id, -1)}
                            className="px-2.5 py-1.5 hover:bg-zinc-200 text-zinc-700 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 py-1 text-xs font-bold text-zinc-900 min-w-[20px] text-center">
                            {qty}
                          </span>
                          <button
                            onClick={() => setQty(product.id, 1)}
                            className="px-2.5 py-1.5 hover:bg-zinc-200 text-zinc-700 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Add to Cart */}
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                          <span>Add to Cart</span>
                        </button>
                      </div>

                      {/* Order Now */}
                      <button
                        onClick={() => handleOrderNow(product)}
                        className="w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                      >
                        Order Now
                      </button>
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
