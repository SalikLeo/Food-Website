import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Phone,
  ShoppingBag,
  Menu as MenuIcon,
  X,
  ShieldCheck,
  Home,
  Flame,
  Utensils,
  Info,
  MapPin,
  MessageCircle,
  ChevronRight
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Header({ onAdminClick }) {
  const { itemCount, setIsCartOpen } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Detect current section for active highlight
      const sections = ['contact', 'about', 'menu', 'deals'];
      const scrollPos = window.scrollY + 220;
      let found = '';
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPos) {
          found = `#${id}`;
          break;
        }
      }
      setActiveHash(found);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Handle ESC key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (href === '#' || href === '') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const navLinks = [
    { label: 'Home', href: '#', icon: Home },
    { label: 'Deals', href: '#deals', icon: Flame, badge: 'HOT' },
    { label: 'Menu', href: '#menu', icon: Utensils },
    { label: 'About Us', href: '#about', icon: Info },
    { label: 'Contact', href: '#contact', icon: MapPin },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'glass-nav py-3 shadow-card-dark'
            : 'bg-black/30 backdrop-blur-md py-4 border-b border-white/5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo & Tagline */}
          <a href="#" className="flex items-center gap-3 group">
            <img
              src="/assets/mehrban-logo.png"
              alt="Mehrban Fast Food"
              className="h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-display tracking-wider text-xl leading-none text-white group-hover:text-primary transition-colors">
                MEHRBAN FAST FOOD
              </span>
              <span className="text-[11px] font-medium tracking-[0.2em] text-orange-400 uppercase mt-0.5">
                Taste That You Need
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1.5 text-sm font-semibold tracking-wide text-zinc-300">
            <a
              href="#"
              className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide transition-all duration-200 ${
                !activeHash
                  ? 'bg-white/10 text-amber-400'
                  : 'text-zinc-300 hover:text-amber-400 hover:bg-white/10'
              }`}
            >
              Home
            </a>
            <a
              href="#deals"
              className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide transition-all duration-200 ${
                activeHash === '#deals'
                  ? 'bg-white/10 text-amber-400'
                  : 'text-zinc-300 hover:text-amber-400 hover:bg-white/10'
              }`}
            >
              Deals
            </a>
            <a
              href="#menu"
              className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide transition-all duration-200 ${
                activeHash === '#menu'
                  ? 'bg-white/10 text-amber-400'
                  : 'text-zinc-300 hover:text-amber-400 hover:bg-white/10'
              }`}
            >
              Menu
            </a>
            <a
              href="#about"
              className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide transition-all duration-200 ${
                activeHash === '#about'
                  ? 'bg-white/10 text-amber-400'
                  : 'text-zinc-300 hover:text-amber-400 hover:bg-white/10'
              }`}
            >
              About Us
            </a>
            <a
              href="#contact"
              className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide transition-all duration-200 ${
                activeHash === '#contact'
                  ? 'bg-white/10 text-amber-400'
                  : 'text-zinc-300 hover:text-amber-400 hover:bg-white/10'
              }`}
            >
              Contact
            </a>
            <button
              onClick={onAdminClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all border border-zinc-700/50 ml-2"
              title="Admin Dashboard"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
              <span>Admin</span>
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Phone Link */}
            <a
              href="tel:0323-4660279"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-primary" />
              <span>0323-4660279</span>
            </a>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white hover:border-primary/50 transition-all focus:outline-none"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5 text-zinc-200" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center animate-pulse shadow-sm">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Desktop ORDER NOW Orange CTA */}
            <a
              href="#order"
              className="hidden md:inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow-md transition-all active:scale-95"
            >
              Order Now
            </a>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl text-zinc-300 hover:text-white bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-orange-400" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Modern Slide-over Mobile Drawer Menu Rendered via Portal to body */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[100] lg:hidden transition-all duration-300 ${
              mobileMenuOpen
                ? 'opacity-100 pointer-events-auto visible'
                : 'opacity-0 pointer-events-none invisible'
            }`}
          >
            {/* Dark Backdrop Overlay */}
            <div
              onClick={() => setMobileMenuOpen(false)}
              className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${
                mobileMenuOpen ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Full-Height Drawer Panel with 100% Opaque Solid Dark Background */}
            <div
              className={`absolute top-0 right-0 bottom-0 w-[86%] max-w-[360px] h-full bg-[#101013] border-l border-white/10 text-white shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-out z-10 ${
                mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              {/* Drawer Top Header */}
              <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-zinc-800/80 flex items-center justify-between bg-[#141418]">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/mehrban-logo.png"
                    alt="Mehrban Fast Food"
                    className="h-10 w-auto object-contain"
                  />
                  <div className="flex flex-col">
                    <span className="font-display tracking-wider text-xl leading-none text-white">
                      MEHRBAN <span className="text-amber-400">FAST FOOD</span>
                    </span>
                    <span className="text-[10px] font-medium tracking-[0.2em] text-orange-400 uppercase mt-0.5">
                      Taste That You Need
                    </span>
                  </div>
                </div>

                {/* Sleek Close Button */}
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center border border-zinc-700/60 transition-all focus:outline-none"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Navigation & Content Area */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                {/* Navigation Section */}
                <div className="space-y-1.5">
                  {navLinks.map((item) => {
                    const isActive =
                      activeHash === item.href || (!activeHash && item.href === '#');
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        onClick={(e) => handleNavClick(e, item.href)}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all group ${
                          isActive
                            ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/10 text-amber-400 border border-orange-500/30 font-bold shadow-sm'
                            : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`p-2 rounded-xl transition-colors ${
                              isActive
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-zinc-800/80 text-zinc-400 group-hover:text-white group-hover:bg-zinc-800'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </span>
                          <span>{item.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm">
                              {item.badge}
                            </span>
                          )}
                          <ChevronRight
                            className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                              isActive ? 'text-amber-400' : 'text-zinc-500'
                            }`}
                          />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="p-5 border-t border-zinc-800/80 space-y-2.5 bg-[#141418]">
                {/* Order Online CTA */}
                <a
                  href="#order"
                  onClick={(e) => handleNavClick(e, '#order')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm tracking-wide text-center shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Order Online Now</span>
                </a>

                {/* Direct Call Button */}
                <a
                  href="tel:0323-4660279"
                  className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4 text-orange-400" />
                  <span>Call: 0323-4660279</span>
                </a>

                {/* WhatsApp Quick Order Button */}
                <a
                  href="https://wa.me/923234660279?text=Assalam%20o%20Alaikum%20Mehrban%20Fast%20Food!%20I%20would%20like%20to%20place%20an%20order."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Order on WhatsApp</span>
                </a>

                {/* Admin Management Link */}
                <div className="pt-1.5 flex justify-center">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onAdminClick();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-orange-400 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                    <span>Admin Management</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
