import React from 'react';
import { MapPin, Phone, Clock, Truck, ShoppingBag } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { useCart } from '../context/CartContext';

export default function ContactSection() {
  const { settings, isDark } = useCart();
  const fee = settings?.deliveryFee ?? 100;
  const min = settings?.minOrder ?? 500;

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/923095369472?text=Hi%20Salik%20Fast%20Food%2C%20I%20would%20like%20to%20place%20an%20order.', '_blank');
  };

  return (
    <section id="contact" className={`py-20 ${isDark ? 'bg-[#0a0a0d] border-t border-zinc-800/80' : 'bg-cream border-t border-zinc-200'} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-12">
          <span className="text-xs font-bold tracking-[0.2em] text-orange-500 sm:text-orange-600 uppercase">
            CONTACT
          </span>
          <h2 className={`mt-1 text-4xl sm:text-5xl lg:text-6xl font-display uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'} leading-none`}>
            VISIT US OR ORDER <span className="text-orange-500 sm:text-orange-600">FOR DELIVERY</span>
          </h2>
        </div>

        {/* 3 Information Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* 1. Location */}
          <div className={`${isDark ? 'bg-[#141419] border-white/10 hover:border-orange-500/50 shadow-card-dark' : 'bg-white border-zinc-200 hover:border-orange-500/50 shadow-sm'} rounded-2xl p-6 border flex flex-col justify-between transition-colors`}>
            <div className="space-y-3">
              <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-600'} flex items-center justify-center`}>
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-zinc-900'} uppercase tracking-wide`}>
                Location
              </h3>
              <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-600'} text-xs leading-relaxed`}>
                Wah Model Town, Wah Cantt
              </p>
            </div>
          </div>

          {/* 2. Call to order */}
          <div className={`${isDark ? 'bg-[#141419] border-white/10 hover:border-orange-500/50 shadow-card-dark' : 'bg-white border-zinc-200 hover:border-orange-500/50 shadow-sm'} rounded-2xl p-6 border flex flex-col justify-between transition-colors`}>
            <div className="space-y-3">
              <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-600'} flex items-center justify-center`}>
                <Phone className="w-5 h-5" />
              </div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-zinc-900'} uppercase tracking-wide`}>
                Call to Order
              </h3>
              <div className="space-y-1">
                <a href="tel:03095369472" className={`${isDark ? 'text-zinc-300 hover:text-orange-400' : 'text-zinc-700 hover:text-orange-600'} font-semibold text-xs block transition-colors`}>
                  0309-5369472
                </a>
              </div>
            </div>
          </div>

          {/* 3. Delivery Fee */}
          <div className={`${isDark ? 'bg-[#141419] border-white/10 hover:border-orange-500/50 shadow-card-dark' : 'bg-white border-zinc-200 hover:border-orange-500/50 shadow-sm'} rounded-2xl p-6 border flex flex-col justify-between transition-colors`}>
            <div className="space-y-3">
              <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-orange-500/15 text-orange-400' : 'bg-orange-50 text-orange-600'} flex items-center justify-center`}>
                <Truck className="w-5 h-5" />
              </div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-zinc-900'} uppercase tracking-wide`}>
                Delivery Fee
              </h3>
              <p className={`${isDark ? 'text-zinc-400' : 'text-zinc-600'} text-xs leading-relaxed`}>
                <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>Delivery fee {fee === 0 ? 'Free' : `Rs. ${fee}`}</span>
              </p>
            </div>
          </div>

        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleWhatsAppClick}
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
          </button>

          <a
            href="tel:03095369472"
            className={`flex items-center gap-2 px-8 py-3.5 rounded-full ${
              isDark
                ? 'bg-[#141419] hover:bg-zinc-800 border-zinc-700 text-white'
                : 'bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-900'
            } border font-bold text-xs uppercase tracking-wider transition-all shadow-sm`}
          >
            <Phone className="w-4 h-4 text-orange-500" />
            <span>0309-5369472</span>
          </a>
        </div>

      </div>
    </section>
  );
}
