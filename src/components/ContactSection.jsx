import React from 'react';
import { MapPin, Phone, Clock, Truck, ShoppingBag } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { useCart } from '../context/CartContext';

export default function ContactSection() {
  const { settings } = useCart();
  const fee = settings?.deliveryFee ?? 100;
  const min = settings?.minOrder ?? 500;

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/923095369472?text=Hi%20MP%20Fast%20Food%2C%20I%20would%20like%20to%20place%20an%20order.', '_blank');
  };

  return (
    <section id="contact" className="py-20 bg-cream border-t border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-12">
          <span className="text-xs font-bold tracking-[0.2em] text-orange-600 uppercase">
            CONTACT
          </span>
          <h2 className="mt-1 text-4xl sm:text-5xl lg:text-6xl font-display uppercase tracking-tight text-zinc-900 leading-none">
            VISIT US OR ORDER <span className="text-orange-600">FOR DELIVERY</span>
          </h2>
        </div>

        {/* 6 Information Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          
          {/* 1. Location */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm flex flex-col justify-between hover:border-orange-500/50 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wide">
                Location
              </h3>
              <p className="text-zinc-600 text-xs leading-relaxed">
                Wah Model Town, Wah Cantt
              </p>
            </div>
          </div>

          {/* 2. Call to order */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm flex flex-col justify-between hover:border-orange-500/50 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wide">
                Call to Order
              </h3>
              <div className="space-y-1">
                <a href="tel:03095369472" className="text-zinc-700 hover:text-orange-600 font-semibold text-xs block transition-colors">
                  0309-5369472
                </a>
              </div>
            </div>
          </div>

          {/* 3. Timings */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm flex flex-col justify-between hover:border-orange-500/50 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wide">
                Timings
              </h3>
              <p className="text-zinc-600 text-xs leading-relaxed">
                Please call to confirm today's timings
              </p>
            </div>
          </div>

          {/* 4. Home Delivery */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm flex flex-col justify-between hover:border-orange-500/50 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wide">
                Home Delivery
              </h3>
              <p className="text-zinc-600 text-xs leading-relaxed">
                Delivery available in nearby areas <br />
                <span className="font-semibold text-zinc-800">Delivery fee {fee === 0 ? 'Free' : `Rs. ${fee}`}</span>
              </p>
            </div>
          </div>

          {/* 5. Minimum Order */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm flex flex-col justify-between hover:border-orange-500/50 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wide">
                Minimum Order
              </h3>
              <p className="text-zinc-600 text-xs leading-relaxed">
                Rs. {min} for home delivery
              </p>
            </div>
          </div>

          {/* 6. WhatsApp Ordering */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-sm flex flex-col justify-between hover:border-orange-500/50 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <WhatsAppIcon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wide">
                WhatsApp Ordering
              </h3>
              <p className="text-zinc-600 text-xs leading-relaxed">
                Send your order any time on WhatsApp
              </p>
            </div>
          </div>

        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleWhatsAppClick}
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <WhatsAppIcon className="w-4 h-4" />
            <span>Order on WhatsApp</span>
          </button>

          <a
            href="tel:03095369472"
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-900 font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            <Phone className="w-4 h-4 text-orange-600" />
            <span>0309-5369472</span>
          </a>
        </div>

      </div>
    </section>
  );
}
