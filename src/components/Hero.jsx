import React from 'react';
import { Flame, Clock, Star, Utensils, ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section
      id="home"
      className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden bg-[#0d0d0e]"
      style={{
        background: `
          radial-gradient(ellipse 80% 70% at 95% 25%, rgba(165, 28, 28, 0.45) 0%, rgba(100, 18, 22, 0.25) 50%, transparent 80%),
          radial-gradient(ellipse 70% 60% at 5% 45%, rgba(217, 85, 12, 0.28) 0%, rgba(146, 45, 10, 0.12) 45%, transparent 75%),
          radial-gradient(ellipse 55% 35% at 50% 0%, rgba(120, 20, 20, 0.2) 0%, transparent 60%),
          linear-gradient(180deg, #150908 0%, #0f0b0d 45%, #0d0d0e 85%)
        `
      }}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-amber-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-16 right-0 w-[600px] h-[600px] bg-red-700/25 blur-[160px] rounded-full pointer-events-none" />

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
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.25rem] font-display uppercase tracking-tight text-white leading-[0.92]">
              MEHRBAN FAST FOOD <br />
              LAHORE <br />
              <span className="text-gradient-orange">MADE FRESH.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-zinc-400 text-base sm:text-lg max-w-xl leading-relaxed">
              Best pizza, zinger burgers, shawarma, broast wings and combo deals with fast home delivery in Lahore — Main Multan Road, Itfaq Town.
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
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white font-bold text-sm uppercase tracking-wider transition-all"
              >
                Explore Menu
              </a>
            </div>

            {/* Trust Badges Row */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-zinc-800/80 w-full max-w-lg">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-orange-400 font-bold text-sm">
                  <Clock className="w-4 h-4" />
                  <span>30-40 MIN</span>
                </div>
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider mt-0.5">
                  HOME DELIVERY
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>4.8 / 5</span>
                </div>
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider mt-0.5">
                  LOVED LOCALLY
                </span>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-orange-400 font-bold text-sm">
                  <Utensils className="w-4 h-4" />
                  <span>9 CATEGORIES</span>
                </div>
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider mt-0.5">
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
              <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-[#141416] shadow-2xl">
                <img
                  src="/assets/hero-food.jpg"
                  alt="Delicious Fast Food Platter"
                  className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                />

                {/* Floating Discount Badge */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl text-zinc-900 border border-white/40 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-display text-xl sm:text-2xl text-zinc-900 tracking-wide leading-none">
                      DEALS FROM RS. 500
                    </span>
                    <span className="text-[11px] font-bold text-orange-600 tracking-wider uppercase mt-1">
                      MINIMUM ORDER RS. 500
                    </span>
                  </div>
                  <a
                    href="#deals"
                    className="p-2 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                    aria-label="View Deals"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
