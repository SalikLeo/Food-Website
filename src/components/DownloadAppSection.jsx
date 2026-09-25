import React from 'react';
import { 
  Download, Zap, Bike, Bell, CheckCircle2, Search, User, Menu as MenuIcon, ShoppingBag, Clock
} from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import { useCart } from '../context/CartContext';

export default function DownloadAppSection() {
  const { isDark } = useCart();

  const appHighlights = [
    {
      icon: Zap,
      title: 'Fast 1-Tap Ordering',
      desc: 'Browse complete menu, customize deals, and checkout in seconds.'
    },
    {
      icon: Bell,
      title: 'Instant Order Alerts',
      desc: 'Sound alerts and live kitchen notifications when your food is ready.'
    },
    {
      icon: Clock,
      title: 'Live Order Tracking',
      desc: 'Track order progress from preparation straight to your doorstep.'
    },
    {
      icon: Bike,
      title: 'Direct Rider Connect',
      desc: 'Direct WhatsApp & phone contact with your assigned delivery rider.'
    }
  ];

  return (
    <section id="download-app" className={`py-14 sm:py-16 border-t relative overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#0a0a0d] border-zinc-800/80' : 'bg-[#faf7f2] border-zinc-200'
    }`}>
      {/* Background Decorative Glows */}
      <div className="absolute top-1/3 -left-20 w-80 h-80 bg-orange-600/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-amber-600/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`rounded-3xl border p-6 sm:p-8 lg:p-10 shadow-xl relative overflow-hidden ${
          isDark 
            ? 'bg-gradient-to-br from-[#141418] via-[#101014] to-[#0c0c0f] border-white/10' 
            : 'bg-gradient-to-br from-white via-orange-50/30 to-amber-50/40 border-zinc-200'
        }`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Heading, 4 Highlights (2x2 Grid), Download CTA */}
            <div className="lg:col-span-7 flex flex-col justify-center py-2 sm:py-6 space-y-7 sm:space-y-8">
              
              <div className="space-y-2.5">
                <span className="text-xs font-bold tracking-[0.2em] text-orange-500 sm:text-orange-600 uppercase block">
                  OFFICIAL ANDROID APP
                </span>
                
                <h2 className={`mt-1 text-4xl sm:text-5xl lg:text-6xl font-display uppercase tracking-tight ${
                  isDark ? 'text-white' : 'text-zinc-900'
                } leading-none`}>
                  GET THE SALIK <span className="text-orange-500 sm:text-orange-600">MOBILE APP</span>
                </h2>
                
                <p className={`text-sm sm:text-base leading-relaxed max-w-xl ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}>
                  Enjoy the fastest food ordering experience in Wah Cantt with live tracking, sound alerts, and instant kitchen notifications.
                </p>
              </div>

              {/* 4 Highlights Arranged in 2x2 Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {appHighlights.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                        isDark 
                          ? 'bg-zinc-900/60 border-white/5 hover:border-orange-500/30' 
                          : 'bg-white border-zinc-200/90 shadow-2xs hover:border-orange-500/40'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0 text-orange-500">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h3 className={`text-xs font-bold uppercase tracking-wide ${
                          isDark ? 'text-white' : 'text-zinc-900'
                        }`}>
                          {item.title}
                        </h3>
                        <p className={`text-[11px] leading-relaxed ${
                          isDark ? 'text-zinc-400' : 'text-zinc-600'
                        }`}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Download CTA Button */}
              <div className="space-y-2.5 pt-1">
                <a
                  href="/downloads/Salik-Fast-Food-Customer.apk"
                  download="Salik-Fast-Food-Customer.apk"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/20 active:scale-98 transition-all group cursor-pointer"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-y-0.5 transition-transform" />
                  <span>Download Customer App (.APK)</span>
                </a>

                <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Direct Download • 16 MB • Android 8.0+</span>
                </div>
              </div>

            </div>

            {/* Right Column: Sleek Phone Mockup Visual matching Real App UI */}
            <div className="lg:col-span-5 flex justify-center">
              <div className={`relative w-[280px] sm:w-[300px] rounded-[2.8rem] p-2 border-2 shadow-2xl transition-all ${
                isDark 
                  ? 'bg-zinc-950 border-zinc-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.85)] ring-1 ring-white/10' 
                  : 'bg-zinc-900 border-zinc-700 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/10'
              }`}>
                
                {/* Phone Top Notch / Dynamic Island */}
                <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-black rounded-full z-30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-zinc-800 mr-1.5" />
                  <div className="w-5 h-1 rounded-full bg-zinc-800" />
                </div>

                {/* Inner Screen Preview - Authentic Mobile App UI with tight natural spacing */}
                <div className="rounded-[2.3rem] overflow-hidden bg-[#faf8f5] text-zinc-900 p-3 pt-6 pb-3 space-y-2.5 relative select-none border border-zinc-200/60 shadow-inner flex flex-col min-h-[540px] sm:min-h-[570px]">
                  
                  {/* 1. Top Navbar */}
                  <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2 pt-1 px-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-orange-400/50 bg-white shadow-2xs shrink-0">
                        <img src="/assets/salik-logo.png" alt="Salik" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10.5px] font-black tracking-tight leading-none text-zinc-900 truncate">
                          SALIK <span className="text-orange-500">FAST FOOD</span>
                        </div>
                        <div className="text-[7.5px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Wah Model Town • Open Now
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons (WhatsApp, Profile, Menu) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-2xs">
                        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-white border border-zinc-200/80 text-zinc-700 flex items-center justify-center shadow-2xs">
                        <User className="w-3.5 h-3.5 text-zinc-600" />
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-white border border-zinc-200/80 text-zinc-700 flex items-center justify-center shadow-2xs">
                        <MenuIcon className="w-3.5 h-3.5 text-zinc-600" />
                      </div>
                    </div>
                  </div>

                  {/* 2. Hero Combo Promo Banner */}
                  <div className="rounded-2xl p-2.5 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center gap-1">
                      <div className="space-y-1 z-10 min-w-0 flex-1">
                        <span className="inline-flex items-center gap-0.5 text-[6.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-white/25 backdrop-blur-xs">
                          ✨ COMBO OFFERS
                        </span>
                        <div className="text-[11px] font-black font-montserrat tracking-tight leading-tight uppercase">
                          DEALS FROM RS. 600
                        </div>
                        <div className="text-[7.5px] text-white/95 leading-tight truncate">
                          Zinger, Fries & Ice-Cold Drink
                        </div>
                        <div className="pt-0.5 flex items-center gap-1.5">
                          <span className="text-[7px] font-bold text-amber-200 whitespace-nowrap">11 Great Combos</span>
                          <span className="px-2 py-0.5 rounded-full bg-white text-orange-600 font-extrabold text-[7px] shadow-2xs whitespace-nowrap">
                            EXPLORE DEALS
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 w-14 h-14 flex items-center justify-center">
                        <img src="/assets/deal-family.png" alt="Deal" className="w-full h-full object-contain drop-shadow" />
                      </div>
                    </div>
                    {/* Carousel dots */}
                    <div className="flex justify-center items-center gap-1 pt-1">
                      <div className="w-1 h-1 rounded-full bg-white/50" />
                      <div className="w-3 h-1 rounded-full bg-white" />
                      <div className="w-1 h-1 rounded-full bg-white/50" />
                    </div>
                  </div>

                  {/* 3. Quick Action Navigation Tabs */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[8.5px] font-extrabold">
                    <div className="py-1.5 px-1 rounded-xl bg-white border border-zinc-200/90 text-zinc-800 shadow-2xs flex items-center justify-center gap-1">
                      <span>🍕</span>
                      <span>MENU</span>
                    </div>
                    <div className="py-1.5 px-1 rounded-xl bg-orange-50 border border-orange-200/90 text-orange-600 shadow-2xs flex items-center justify-center gap-1">
                      <span>🔥</span>
                      <span>DEALS</span>
                    </div>
                    <div className="py-1.5 px-1 rounded-xl bg-white border border-zinc-200/90 text-zinc-800 shadow-2xs flex items-center justify-center gap-1">
                      <span>🕒</span>
                      <span>ORDERS</span>
                    </div>
                  </div>

                  {/* 4. Search Bar */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-zinc-200/90 text-zinc-400 text-[8.5px] shadow-2xs">
                    <Search className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span className="truncate">Search food across all categories...</span>
                  </div>

                  {/* 5. EXPLORE MENU Grid (2x2) */}
                  <div className="space-y-1.5 relative flex-1">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[9.5px] font-black text-zinc-900 tracking-tight uppercase">
                        EXPLORE MENU
                      </span>
                      <span className="text-[8px] font-bold text-orange-500 uppercase flex items-center gap-0.5">
                        VIEW ALL &gt;
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Pizza */}
                      <div className="p-1.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs text-center flex flex-col items-center">
                        <div className="w-full h-14 rounded-lg overflow-hidden bg-zinc-50 mb-1 flex items-center justify-center">
                          <img src="/assets/images/cat-pizza-BmV7hCev.jpg" alt="Pizza" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-[9px] font-bold text-zinc-900 leading-tight">Pizza</div>
                        <div className="text-[7px] text-zinc-500 font-medium">17 Items</div>
                      </div>

                      {/* Burgers */}
                      <div className="p-1.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs text-center flex flex-col items-center">
                        <div className="w-full h-14 rounded-lg overflow-hidden bg-zinc-50 mb-1 flex items-center justify-center">
                          <img src="/assets/images/cat-burgers-CfWIZ4YN.jpg" alt="Burgers" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-[9px] font-bold text-zinc-900 leading-tight">Burgers</div>
                        <div className="text-[7px] text-zinc-500 font-medium">11 Items</div>
                      </div>

                      {/* Shawarma */}
                      <div className="p-1.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs text-center flex flex-col items-center">
                        <div className="w-full h-14 rounded-lg overflow-hidden bg-zinc-50 mb-1 flex items-center justify-center">
                          <img src="/assets/images/cat-shawarma-D-OpXs-U.jpg" alt="Shawarma" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-[9px] font-bold text-zinc-900 leading-tight">Shawarma</div>
                        <div className="text-[7px] text-zinc-500 font-medium">8 Items</div>
                      </div>

                      {/* Sandwiches */}
                      <div className="p-1.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs text-center flex flex-col items-center">
                        <div className="w-full h-14 rounded-lg overflow-hidden bg-zinc-50 mb-1 flex items-center justify-center">
                          <img src="/assets/images/cat-sandwiches-bOG3zufR.jpg" alt="Sandwiches" className="w-full h-full object-cover" />
                        </div>
                        <div className="text-[9px] font-bold text-zinc-900 leading-tight">Sandwiches</div>
                        <div className="text-[7px] text-zinc-500 font-medium">6 Items</div>
                      </div>
                    </div>

                    {/* Floating Cart Button (bottom-right of app mockup) */}
                    <div className="absolute -bottom-1 right-0.5 z-20">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg flex items-center justify-center relative shadow-orange-500/40">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-black text-white text-[7px] font-black flex items-center justify-center border border-white">
                          5
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 6. Bottom Home Bar Indicator */}
                  <div className="flex justify-center pt-1.5 mt-auto">
                    <div className="w-20 h-1 bg-zinc-300 rounded-full" />
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
