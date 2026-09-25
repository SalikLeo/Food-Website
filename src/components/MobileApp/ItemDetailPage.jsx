import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, ShoppingBag, Plus, Minus, Check, Flame, 
  Share2, AlertCircle, Utensils
} from 'lucide-react';
import { formatPrice, cleanDealInclusions } from '../../utils/formatters';

export default function ItemDetailPage({
  item,
  isDeal = false,
  isDark = false,
  onBack,
  onAddToCart,
  onOpenCart,
  cartCount = 0,
  relatedItems = [],
  onSelectRelated
}) {
  if (!item) return null;

  const hasSizes = Boolean(item.sizes && item.sizes.length > 0);
  const [selectedSize, setSelectedSize] = useState(() => {
    if (hasSizes) {
      return item.sizes[0];
    }
    return null;
  });

  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [addedToast, setAddedToast] = useState(false);

  const unitPrice = useMemo(() => {
    if (selectedSize && selectedSize.price !== undefined) {
      return Number(selectedSize.price);
    }
    return Number(item.price || 0);
  }, [item, selectedSize]);

  const totalPrice = unitPrice * quantity;
  const isOutOfStock = item.inStock === false;

  const handleIncrement = () => setQuantity(q => q + 1);
  const handleDecrement = () => setQuantity(q => (q > 1 ? q - 1 : 1));

  const handleAdd = (e) => {
    if (isOutOfStock) return;
    
    // Prepare item for cart
    if (isDeal) {
      const cleanedIncludes = cleanDealInclusions(item.includes || []);
      const itemsSummary = Array.isArray(cleanedIncludes) && cleanedIncludes.length > 0 ? cleanedIncludes.join(' + ') : '';
      onAddToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image || '/assets/deal-1.png',
        category: 'deals',
        description: itemsSummary || item.description || '',
        includes: cleanedIncludes,
        notes: specialInstructions.trim() || undefined
      }, null, quantity, e?.currentTarget);
    } else {
      onAddToCart({
        ...item,
        notes: specialInstructions.trim() || undefined
      }, selectedSize, quantity, e?.currentTarget);
    }

    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2200);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.name,
          text: `Check out ${item.name} at Salik Fast Food! Only Rs. ${formatPrice(unitPrice)}`,
          url: window.location.href
        });
      } catch (err) {}
    } else {
      navigator.clipboard?.writeText?.(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const [isClosing, setIsClosing] = useState(false);

  const handleSmoothBack = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onBack();
    }, 180);
  };

  useEffect(() => {
    const handleEventBack = () => {
      handleSmoothBack();
    };
    window.addEventListener('salik_trigger_item_detail_back', handleEventBack);
    return () => window.removeEventListener('salik_trigger_item_detail_back', handleEventBack);
  }, [isClosing]);

  return (
    <div className={`min-h-screen pb-32 font-sans transition-colors duration-200 select-none ${
      isClosing ? 'animate-page-exit' : 'animate-page-enter'
    } ${
      isDark ? 'bg-[#0f0f13] text-white' : 'bg-[#faf8f5] text-zinc-900'
    }`}>
      
      {/* Sticky Top Navigation Bar */}
      <div className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between transition-colors ${
        isDark ? 'bg-[#0f0f13]/90 border-white/10' : 'bg-[#faf8f5]/90 border-zinc-200'
      }`}>
        <button
          type="button"
          onClick={handleSmoothBack}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
            isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs border border-zinc-200'
          }`}
          aria-label="Go Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <span className="font-extrabold text-sm sm:text-base tracking-tight truncate max-w-[200px] text-center">
          {item.name}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShare}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
              isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-white hover:bg-zinc-100 text-zinc-800 shadow-xs border border-zinc-200'
            }`}
            title="Share"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className={`w-10 h-10 rounded-full flex items-center justify-center relative transition-all active:scale-90 cursor-pointer ${
              isDark ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' : 'bg-orange-50 text-orange-600 border border-orange-200 shadow-xs'
            }`}
            aria-label="Open Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center px-1 shadow-sm animate-pulse">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Single Page Container */}
      <div className="max-w-2xl mx-auto px-4 pt-3 space-y-5">
        
        {/* Hero Food Showcase Image Card */}
        <div className={`relative w-full h-72 sm:h-84 rounded-3xl overflow-hidden border shadow-lg ${
          isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'
        }`}>
          <img
            src={item.image || (isDeal ? '/assets/deal-1.png' : '/assets/images/cat-pizza-BmV7hCev.jpg')}
            alt={item.name}
            className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${isOutOfStock ? 'grayscale opacity-75' : ''}`}
            onError={(e) => {
              e.target.src = isDeal ? '/assets/deal-1.png' : '/assets/images/cat-pizza-BmV7hCev.jpg';
            }}
          />

          {/* Subtle Top Gradient for Badge Readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none" />

          {/* Badges on Top Left */}
          <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-2">
            {item.category && (
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/20">
                {item.category}
              </span>
            )}
            {item.tag && !isOutOfStock && (
              <span className="px-3 py-1 rounded-full bg-orange-600 text-white text-xs font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-white" />
                <span>{item.tag}</span>
              </span>
            )}
          </div>

          {/* Sold Out Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-red-400">
              <AlertCircle className="w-10 h-10 stroke-[2]" />
              <span className="text-base font-black uppercase tracking-widest text-white">Currently Sold Out</span>
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div className={`p-4 sm:p-5 rounded-3xl border shadow-xs space-y-2 ${
          isDark ? 'bg-[#15151a] border-white/10' : 'bg-white border-zinc-200'
        }`}>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight leading-tight ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}>
            {item.name}
          </h1>

          {item.description && (
            <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              {item.description}
            </p>
          )}
        </div>

        {/* Deals Inclusions (For Deals Only) */}
        {isDeal && item.includes && item.includes.length > 0 && (
          <div className={`p-5 rounded-3xl border shadow-xs space-y-3 ${
            isDark ? 'bg-[#15151a] border-white/10' : 'bg-white border-zinc-200'
          }`}>
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-orange-500" />
              <h3 className={`text-sm font-extrabold uppercase tracking-wide ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                What's Included in This Deal
              </h3>
            </div>

            <ul className="space-y-2.5 pt-1">
              {(item.includes || []).map((inclusion, idx) => (
                <li
                  key={idx}
                  className={`flex items-start gap-3 p-2.5 rounded-2xl border transition-colors ${
                    isDark ? 'bg-zinc-900/60 border-white/5 text-zinc-200' : 'bg-orange-50/50 border-orange-100 text-zinc-800'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span className="font-semibold text-sm leading-snug">
                    {cleanDealInclusions(inclusion)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Size Selection (For Regular Products with Multiple Sizes) */}
        {hasSizes && !isOutOfStock && (
          <div className={`p-5 rounded-3xl border shadow-xs space-y-3 ${
            isDark ? 'bg-[#15151a] border-white/10' : 'bg-white border-zinc-200'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-extrabold uppercase tracking-wide ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}>
                Select Size
              </h3>
              <span className="text-xs font-semibold text-orange-500">
                Required
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {item.sizes.map((sz, idx) => {
                const isSelected = selectedSize?.label === sz.label;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between sm:flex-col sm:items-start gap-1.5 ${
                      isSelected
                        ? 'bg-orange-500 border-orange-600 text-white shadow-md shadow-orange-500/25 scale-[1.01]'
                        : isDark
                          ? 'bg-zinc-900/60 border-white/10 hover:border-white/20 text-zinc-200'
                          : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800'
                    }`}
                  >
                    <div>
                      <span className={`block font-bold text-sm ${isSelected ? 'text-white' : isDark ? 'text-white' : 'text-zinc-900'}`}>
                        {sz.label}
                      </span>
                      {sz.description && (
                        <span className={`block text-[11px] mt-0.5 ${isSelected ? 'text-white/80' : isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {sz.description}
                        </span>
                      )}
                    </div>
                    <span className={`font-black text-sm sm:text-base ${isSelected ? 'text-white' : 'text-orange-500'}`}>
                      Rs. {formatPrice(sz.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Special Cooking Instructions Field */}
        <div className={`p-5 rounded-3xl border shadow-xs space-y-2.5 ${
          isDark ? 'bg-[#15151a] border-white/10' : 'bg-white border-zinc-200'
        }`}>
          <label className={`block text-xs font-bold uppercase tracking-wide ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Special Instructions <span className="font-normal text-zinc-400 lowercase">(optional)</span>
          </label>
          <input
            type="text"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="e.g. Extra spicy, no onions, extra ketchup..."
            className={`w-full px-4 py-3 rounded-2xl border text-sm transition-all outline-none ${
              isDark 
                ? 'bg-black/30 border-white/10 text-white placeholder-zinc-500 focus:border-orange-500' 
                : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-orange-500 focus:bg-white'
            }`}
          />
        </div>

        {/* Related Items Section */}
        {relatedItems && relatedItems.length > 0 && (
          <div className="pt-2 space-y-3">
            <h3 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              You May Also Like
            </h3>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {relatedItems.slice(0, 6).map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSelectRelated && onSelectRelated(rel)}
                  className={`min-w-[160px] max-w-[160px] rounded-2xl p-3 border cursor-pointer active:scale-95 transition-all shadow-2xs flex-shrink-0 ${
                    isDark ? 'bg-[#15151a] border-white/10 hover:border-orange-500/40' : 'bg-white border-zinc-200 hover:border-orange-300'
                  }`}
                >
                  <div className="w-full h-24 rounded-xl overflow-hidden mb-2 bg-zinc-100">
                    <img
                      src={rel.image || '/assets/images/cat-pizza-BmV7hCev.jpg'}
                      alt={rel.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/assets/images/cat-pizza-BmV7hCev.jpg';
                      }}
                    />
                  </div>
                  <h4 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {rel.name}
                  </h4>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-orange-500 font-extrabold text-xs">
                      Rs. {formatPrice(rel.price)}
                    </span>
                    <span className="text-[10px] text-zinc-400">View</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Floating Added Notification Toast */}
      {addedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Added to your cart!</span>
        </div>
      )}

      {/* Sticky Bottom Action Bar with Quantity & Add Button */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 border-t p-4 backdrop-blur-xl transition-colors ${
        isDark ? 'bg-[#0f0f13]/95 border-white/10' : 'bg-white/95 border-zinc-200'
      }`}>
        <div className="max-w-2xl mx-auto flex items-center gap-3.5">
          
          {/* Stepper Quantity Counter */}
          <div className={`flex items-center gap-1.5 p-1 rounded-2xl border ${
            isDark ? 'bg-zinc-800/80 border-white/10' : 'bg-zinc-100 border-zinc-200'
          }`}>
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 1 || isOutOfStock}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                quantity <= 1 || isOutOfStock
                  ? 'opacity-40 cursor-not-allowed text-zinc-400'
                  : isDark 
                    ? 'bg-zinc-700 hover:bg-zinc-600 text-white active:scale-90' 
                    : 'bg-white hover:bg-zinc-200 text-zinc-800 shadow-2xs active:scale-90'
              }`}
              aria-label="Decrease Quantity"
            >
              <Minus className="w-4 h-4 stroke-[2.5]" />
            </button>

            <span className={`w-8 text-center font-black text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {quantity}
            </span>

            <button
              type="button"
              onClick={handleIncrement}
              disabled={isOutOfStock}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isOutOfStock
                  ? 'opacity-40 cursor-not-allowed text-zinc-400'
                  : 'bg-orange-500 hover:bg-orange-600 text-white shadow-2xs active:scale-90'
              }`}
              aria-label="Increase Quantity"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Add to Cart Primary Button */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`flex-1 py-3.5 px-5 rounded-2xl font-black text-sm sm:text-base tracking-wide uppercase transition-all shadow-lg flex items-center justify-between cursor-pointer ${
              isOutOfStock
                ? 'bg-zinc-400 text-white cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white active:scale-[0.98] shadow-orange-500/25'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>{isOutOfStock ? 'Sold Out' : 'Add'}</span>
            </div>
            {!isOutOfStock && (
              <span className="font-sans font-black text-white text-base">
                Rs. {formatPrice(totalPrice)}
              </span>
            )}
          </button>

        </div>
      </div>

    </div>
  );
}
