import React, { useState, useEffect } from 'react';
import { ArrowUp, Phone, MapPin, MessageCircle, Clock, Heart } from 'lucide-react';

export default function Footer({ categories = [] }) {
  const [showTopBtn, setShowTopBtn] = useState(false);

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

  return (
    <footer className="bg-[#09090b] text-zinc-400 border-t border-zinc-800/80 pt-16 pb-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/mehrban-logo.png"
                alt="Mehrban Fast Food"
                className="h-10 w-auto object-contain"
              />
              <span className="font-display tracking-wider text-xl text-white">
                MEHRBAN FAST FOOD
              </span>
            </div>
            <p className="text-xs font-semibold tracking-wider text-orange-400 uppercase">
              Taste That You Need
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Freshly prepared pizzas, burgers, shawarma and deals in Lahore.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://wa.me/923236580604"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-orange-600 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href="tel:0323-4660279"
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
                <a href="#contact" className="hover:text-primary transition-colors">Contact Mehrban Fast Food</a>
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
              <span>Shaikh Chowk Itfaq Town, Mansoora Bazar, Main Multan Road, Lahore</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs">
              <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <a href="tel:0323-4660279" className="hover:text-white transition-colors">
                0323-4660279 / 0323-6580604
              </a>
            </div>
            <div className="flex items-center gap-2.5 text-xs">
              <MessageCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
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
          <p>© 2026 Mehrban Fast Food. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
            <span>in Lahore, Pakistan</span>
          </p>
        </div>

      </div>

      {/* Floating Action Buttons (WhatsApp & Back to Top) */}
      
      {/* 1. Direct WhatsApp Contact Floating Button */}
      <a
        href="https://wa.me/923236580604?text=Hi%20Mehrban%20Fast%20Food%2C%20I%20would%20like%20to%20place%20an%20order."
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed right-3.5 sm:right-6 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-tr from-[#20ba5a] to-[#2bf075] hover:from-[#1da851] hover:to-[#26db6a] text-white shadow-lg shadow-emerald-950/40 hover:shadow-emerald-500/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out group ${
          showTopBtn ? 'bottom-[3.6rem] sm:bottom-[4.75rem]' : 'bottom-3.5 sm:bottom-6'
        }`}
        aria-label="Direct WhatsApp Contact"
      >
        <svg viewBox="0 0 32 32" className="w-[25px] h-[25px] sm:w-[29px] sm:h-[29px] fill-white drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2C8.28 2 2 8.28 2 16c0 2.68.75 5.19 2.06 7.34L2 30l6.87-2.02C10.96 29.17 13.41 30 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.54c-2.31 0-4.48-.73-6.28-1.98l-.45-.31-4.22 1.24 1.25-4.09-.32-.47A11.45 11.45 0 0 1 4.46 16c0-6.36 5.18-11.54 11.54-11.54 6.36 0 11.54 5.18 11.54 11.54 0 6.36-5.18 11.54-11.54 11.54zm6.54-8.62c-.36-.18-2.12-1.05-2.45-1.17-.33-.12-.57-.18-.81.18-.24.36-.93 1.17-1.14 1.41-.21.24-.42.27-.78.09-.36-.18-1.52-.56-2.9-1.79-1.07-.96-1.8-2.14-2.01-2.5-.21-.36-.02-.56.16-.74.16-.16.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.81-1.95-1.11-2.67-.29-.7-.59-.6-.81-.61l-.69-.01c-.24 0-.63.09-.96.45-.33.36-1.26 1.23-1.26 3 0 1.77 1.29 3.48 1.47 3.72.18.24 2.54 3.88 6.15 5.44.86.37 1.53.59 2.05.76.86.27 1.64.23 2.26.14.69-.1 2.12-.87 2.42-1.71.3-.84.3-1.56.21-1.71-.09-.15-.33-.24-.69-.42z"/>
        </svg>

        {/* Tooltip */}
        <span className="absolute right-14 sm:right-16 bg-zinc-900 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border border-zinc-700">
          Chat on WhatsApp
        </span>
      </a>

      {/* 2. Floating Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed right-3.5 sm:right-6 bottom-3.5 sm:bottom-6 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-950/40 hover:shadow-orange-500/40 transition-all duration-300 active:scale-95 flex items-center justify-center ${
          showTopBtn
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
        }`}
        aria-label="Back to top"
      >
        <ArrowUp className="w-[22px] h-[22px] sm:w-[26px] sm:h-[26px]" strokeWidth={2.5} />
      </button>
    </footer>
  );
}
