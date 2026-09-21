import React, { useState, useEffect } from 'react';
import { ArrowUp, Phone, MapPin, Clock, Heart, ShoppingBag } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { useCart } from '../context/CartContext';
import { isCustomerApp } from '../config/api';

export default function Footer({ categories = [], settings = null }) {
  const { itemCount, setIsCartOpen } = useCart();
  const hasFloatingCart = itemCount > 0;
  const [showTopBtn, setShowTopBtn] = useState(false);

  const cartWeb = settings?.floatingButtons?.cartWeb !== false;
  const cartMobile = settings?.floatingButtons?.cartMobile !== false;
  const whatsappWeb = settings?.floatingButtons?.whatsappWeb !== false;
  const whatsappMobile = settings?.floatingButtons?.whatsappMobile !== false;
  const backToTopWeb = settings?.floatingButtons?.backToTopWeb !== false;
  const backToTopMobile = settings?.floatingButtons?.backToTopMobile !== false;

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper for responsive display classes (Web = sm screen and above, Mobile = below sm)
  const getDisplayClass = (webEnabled, mobileEnabled) => {
    if (!webEnabled && !mobileEnabled) return 'hidden';
    if (webEnabled && !mobileEnabled) return 'hidden sm:flex';
    if (!webEnabled && mobileEnabled) return 'flex sm:hidden';
    return 'flex';
  };

  const cartDisplayClass = getDisplayClass(cartWeb, cartMobile);
  const whatsappDisplayClass = getDisplayClass(whatsappWeb, whatsappMobile);
  const backToTopDisplayClass = getDisplayClass(backToTopWeb, backToTopMobile);

  const isTopBtnActiveMobile = showTopBtn && backToTopMobile;
  const isTopBtnActiveWeb = showTopBtn && backToTopWeb;

  const isWhatsappActiveMobile = whatsappMobile;
  const isWhatsappActiveWeb = whatsappWeb;

  const getWhatsappBottomClass = () => {
    if (hasFloatingCart) {
      const mobilePos = isTopBtnActiveMobile ? 'bottom-[7.25rem]' : 'bottom-[4.5rem]';
      const webPos = isTopBtnActiveWeb ? 'sm:bottom-[4.75rem]' : 'sm:bottom-6';
      return `${mobilePos} ${webPos}`;
    } else {
      const mobilePos = isTopBtnActiveMobile ? 'bottom-[3.6rem]' : 'bottom-3.5';
      const webPos = isTopBtnActiveWeb ? 'sm:bottom-[4.75rem]' : 'sm:bottom-6';
      return `${mobilePos} ${webPos}`;
    }
  };

  const getCartBottomClass = () => {
    const countWeb = (isTopBtnActiveWeb ? 1 : 0) + (isWhatsappActiveWeb ? 1 : 0);
    const countMobile = (isTopBtnActiveMobile ? 1 : 0) + (isWhatsappActiveMobile ? 1 : 0);

    let mobilePos = 'bottom-3.5';
    if (hasFloatingCart) {
      if (countMobile === 2) mobilePos = 'bottom-[10rem]';
      else if (countMobile === 1) mobilePos = 'bottom-[7.25rem]';
      else mobilePos = 'bottom-[4.5rem]';
    } else {
      if (countMobile === 2) mobilePos = 'bottom-[6.375rem]';
      else if (countMobile === 1) mobilePos = 'bottom-[3.6rem]';
      else mobilePos = 'bottom-3.5';
    }

    let webPos = 'sm:bottom-6';
    if (countWeb === 2) webPos = 'sm:bottom-[8rem]';
    else if (countWeb === 1) webPos = 'sm:bottom-[4.75rem]';
    else webPos = 'sm:bottom-6';

    return `${mobilePos} ${webPos}`;
  };

  return (
    <footer className="bg-[#09090b] text-zinc-400 border-t border-zinc-800/80 pt-16 pb-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/salik-logo.png"
                alt="Salik Fast Food"
                className="h-10 w-auto object-contain"
              />
              <span className="font-display tracking-wider text-xl text-white">
                SALIK FAST FOOD
              </span>
            </div>
            <p className="text-xs font-semibold tracking-wider text-orange-400 uppercase">
              Taste That You Need
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Freshly prepared pizzas, burgers, shawarma and deals in Wah Cantt.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://wa.me/923095369472"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-[#25D366] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4" />
              </a>
              <a
                href="tel:03095369472"
                className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-orange-600 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Phone"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-white mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#" className="hover:text-primary transition-colors">Home</a>
              </li>
              <li>
                <a href="#deals" className="hover:text-primary transition-colors">Deals</a>
              </li>
              <li>
                <a href="#menu" className="hover:text-primary transition-colors">Menu</a>
              </li>
              <li>
                <a href="#order" className="hover:text-primary transition-colors">Order Now</a>
              </li>
              <li>
                <a href="#about" className="hover:text-primary transition-colors">About Us</a>
              </li>
              <li>
                <a href="#reviews" className="hover:text-primary transition-colors">Customer Reviews</a>
              </li>
              <li>
                <a href="#contact" className="hover:text-primary transition-colors">Contact Salik Fast Food</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-primary transition-colors">FAQs</a>
              </li>
            </ul>
          </div>

          {/* Menu Categories */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-white mb-4">
              Menu Categories
            </h4>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-2.5 text-xs">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <a href="#menu" className="hover:text-primary transition-colors">
                    {cat.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-widest text-white mb-4">
              Contact
            </h4>
            <div className="flex items-start gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <span>Wah Model Town, Wah Cantt</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs">
              <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <a href="tel:03095369472" className="hover:text-white transition-colors">
                0309-5369472
              </a>
            </div>
            <div className="flex items-center gap-2.5 text-xs">
              <WhatsAppIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span>WhatsApp ordering available</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs">
              <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span>Please call to confirm today's timings</span>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-900 text-center text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Salik Fast Food. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
            <span>in Wah Cantt, Pakistan</span>
          </p>
        </div>

      </div>

      {/* Floating Action Buttons (Mobile App vs Website) */}
      
      {/* 1. Mobile App Dedicated Floating Cart Button (Bottom Right) */}
      {isCustomerApp && (
        <button
          id="floating-cart-btn"
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="fixed right-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-50 w-14 h-14 rounded-full bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 text-white shadow-[0_10px_25px_rgba(234,88,12,0.55)] border-2 border-white/20 flex items-center justify-center active:scale-90 transition-all duration-200 cursor-pointer group hover:scale-105"
          aria-label="View Cart"
        >
          <div className="relative flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-white drop-shadow-sm group-hover:scale-105 transition-transform" strokeWidth={2.4} />

            {/* Cart item count badge */}
            {itemCount > 0 && (
              <span className="absolute -top-3.5 -right-3.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-zinc-950 text-white font-black text-[11px] flex items-center justify-center shadow-lg border-2 border-white animate-in zoom-in-75">
                {itemCount}
              </span>
            )}
          </div>
        </button>
      )}

      {/* 2. Web Mode Floating Action Buttons (Cart, WhatsApp & Back to Top) */}
      {!isCustomerApp && (
        <>
          {/* Web Floating Cart Button */}
          {cartDisplayClass !== 'hidden' && (
            <button
              id="floating-cart-btn"
              type="button"
              onClick={() => setIsCartOpen(true)}
              className={`${cartDisplayClass} fixed right-3.5 sm:right-6 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-white border border-zinc-700/80 hover:border-orange-500/80 shadow-lg shadow-black/50 hover:shadow-orange-500/20 items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out group ${getCartBottomClass()}`}
              aria-label="View Cart"
            >
              <ShoppingBag className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] text-zinc-100 group-hover:text-orange-400 transition-colors" strokeWidth={2.2} />

              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] sm:min-w-[20px] h-[18px] sm:h-[20px] px-1 rounded-full bg-orange-600 text-white font-extrabold text-[9px] sm:text-[10px] flex items-center justify-center shadow-md border-2 border-[#18181b] animate-in zoom-in-50">
                  {itemCount}
                </span>
              )}

              <span className="absolute right-14 sm:right-16 bg-zinc-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-zinc-700">
                {itemCount > 0 ? `View Cart (${itemCount})` : 'View Cart'}
              </span>
            </button>
          )}

          {/* Web WhatsApp Contact Floating Button */}
          {whatsappDisplayClass !== 'hidden' && (
            <a
              href="https://wa.me/923095369472?text=Hi%20Salik%20Fast%20Food%2C%20I%20would%20like%20to%20place%20an%20order."
              target="_blank"
              rel="noopener noreferrer"
              className={`${whatsappDisplayClass} fixed right-3.5 sm:right-6 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#20ba5a] to-[#2bf075] hover:from-[#1da851] hover:to-[#26db6a] text-white shadow-lg shadow-emerald-950/40 hover:shadow-emerald-500/40 items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out group ${getWhatsappBottomClass()}`}
              aria-label="Direct WhatsApp Contact"
            >
              <svg viewBox="0 0 32 32" className="w-[25px] h-[25px] sm:w-[29px] sm:h-[29px] fill-white drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2C8.28 2 2 8.28 2 16c0 2.68.75 5.19 2.06 7.34L2 30l6.87-2.02C10.96 29.17 13.41 30 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.54c-2.31 0-4.48-.73-6.28-1.98l-.45-.31-4.22 1.24 1.25-4.09-.32-.47A11.45 11.45 0 0 1 4.46 16c0-6.36 5.18-11.54 11.54-11.54 6.36 0 11.54 5.18 11.54 11.54 0 6.36-5.18 11.54-11.54 11.54zm6.54-8.62c-.36-.18-2.12-1.05-2.45-1.17-.33-.12-.57-.18-.81.18-.24.36-.93 1.17-1.14 1.41-.21.24-.42.27-.78.09-.36-.18-1.52-.56-2.9-1.79-1.07-.96-1.8-2.14-2.01-2.5-.21-.36-.02-.56.16-.74.16-.16.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.81-1.95-1.11-2.67-.29-.7-.59-.6-.81-.61l-.69-.01c-.24 0-.63.09-.96.45-.33.36-1.26 1.23-1.26 3 0 1.77 1.29 3.48 1.47 3.72.18.24 2.54 3.88 6.15 5.44.86.37 1.53.59 2.05.76.86.27 1.64.23 2.26.14.69-.1 2.12-.87 2.42-1.71.3-.84.3-1.56.21-1.71-.09-.15-.33-.24-.69-.42z"/>
              </svg>
              <span className="absolute right-14 sm:right-16 bg-zinc-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-zinc-700">
                Chat on WhatsApp
              </span>
            </a>
          )}

          {/* Web Back to Top Button */}
          {backToTopDisplayClass !== 'hidden' && (
            <button
              onClick={scrollToTop}
              className={`${backToTopDisplayClass} fixed right-3.5 sm:right-6 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-950/40 hover:shadow-orange-500/40 transition-all duration-300 active:scale-95 items-center justify-center ${
                hasFloatingCart
                  ? 'bottom-[4.5rem] sm:bottom-6'
                  : 'bottom-3.5 sm:bottom-6'
              } ${
                showTopBtn
                  ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                  : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
              }`}
              aria-label="Back to top"
            >
              <ArrowUp className="w-[22px] h-[22px] sm:w-[26px] sm:h-[26px]" strokeWidth={2.5} />
            </button>
          )}
        </>
      )}
    </footer>
  );
}
