import React from 'react';
import { 
  Smartphone, Download, ShieldCheck, Zap, 
  Bike, Bell, Flame, CheckCircle2, ArrowRight
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function DownloadAppSection() {
  const { isDark } = useCart();

  const appFeatures = [
    {
      icon: Zap,
      title: 'Lightning Fast Ordering',
      desc: 'Browse complete menu with live prices and add custom deal selections in 1 tap.'
    },
    {
      icon: Bell,
      title: 'Live Order Tracking',
      desc: 'Real-time kitchen status notifications and sound alerts when your food is ready.'
    },
    {
      icon: Bike,
      title: 'Direct Rider Connect',
      desc: 'Direct WhatsApp and phone contact cards with your assigned delivery rider.'
    },
    {
      icon: ShieldCheck,
      title: 'Offline & Instant Access',
      desc: 'Native smooth animations, instant loading, and 100% secure direct ordering.'
    }
  ];

  return (
    <section id="download-app" className={`py-20 border-t relative overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#0a0a0d] border-zinc-800/80' : 'bg-[#faf7f2] border-zinc-200'
    }`}>
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold tracking-widest uppercase">
            <Smartphone className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
            <span>OFFICIAL MOBILE APP</span>
          </div>

          <h2 className={`text-4xl sm:text-5xl md:text-6xl font-display uppercase tracking-tight ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}>
            GET THE SALIK <span className="text-orange-500">MOBILE APP</span>
          </h2>

          <p className={`text-sm sm:text-base max-w-xl mx-auto leading-relaxed ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}>
            Enjoy the fastest food delivery experience in Wah Cantt. Download our official Android application for live order tracking and exclusive mobile promotions.
          </p>
        </div>

        {/* Main Content Banner Card */}
        <div className={`rounded-3xl border p-6 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden ${
          isDark 
            ? 'bg-gradient-to-br from-[#141418] via-[#101014] to-[#0c0c0f] border-white/10' 
            : 'bg-gradient-to-br from-white via-orange-50/40 to-amber-50/60 border-zinc-200'
        }`}>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column: Highlights & Download CTA */}
            <div className="lg:col-span-7 space-y-8">
              
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-500">
                  Wah Model Town & Wah Cantt
                </span>
                <h3 className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-montserrat uppercase ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}>
                  Everything You Love, Now In Your Pocket
                </h3>
              </div>

              {/* 4 Feature Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {appFeatures.map((feat, idx) => {
                  const Icon = feat.icon;
                  return (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                        isDark 
                          ? 'bg-zinc-900/60 border-white/5 hover:border-orange-500/30' 
                          : 'bg-white/80 border-zinc-200 hover:border-orange-500/40 shadow-xs'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0 text-orange-500">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h4 className={`text-xs font-bold uppercase tracking-wider ${
                          isDark ? 'text-white' : 'text-zinc-900'
                        }`}>
                          {feat.title}
                        </h4>
                        <p className={`text-[11px] leading-relaxed ${
                          isDark ? 'text-zinc-400' : 'text-zinc-600'
                        }`}>
                          {feat.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Download Buttons Section */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                
                {/* Primary Customer APK Download Button */}
                <a
                  href="/downloads/Salik-Fast-Food-Customer.apk"
                  download="Salik-Fast-Food-Customer.apk"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-orange-500/25 active:scale-98 transition-all group cursor-pointer"
                >
                  <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                  <div className="text-left">
                    <div className="text-[10px] text-white/80 font-medium normal-case tracking-normal">
                      Direct Android Install (.APK)
                    </div>
                    <div className="font-montserrat font-black text-sm sm:text-base">
                      Download Customer App
                    </div>
                  </div>
                </a>

              </div>

              {/* Safe Download Trust Badge */}
              <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified Direct APK Download • 16 MB • Compatible with Android 8.0+</span>
              </div>

            </div>

            {/* Right Column: Phone Mockup Visual */}
            <div className="lg:col-span-5 flex justify-center">
              <div className={`relative w-full max-w-[280px] sm:max-w-[320px] rounded-[2.5rem] p-3 border-4 shadow-2xl ${
                isDark 
                  ? 'bg-zinc-950 border-zinc-800 shadow-[0_25px_60px_rgba(0,0,0,0.8)]' 
                  : 'bg-zinc-900 border-zinc-700 shadow-2xl text-white'
              }`}>
                
                {/* Phone Speaker & Camera Notch */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-black rounded-full z-30 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800 mr-2" />
                  <div className="w-8 h-1 rounded-full bg-zinc-800" />
                </div>

                {/* Inner Screen Preview */}
                <div className="rounded-[2rem] overflow-hidden bg-[#0f0f13] text-white p-4 pt-8 space-y-3.5 relative select-none">
                  
                  {/* Top Bar Preview */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-orange-500/60 bg-black">
                        <img src="/assets/salik-logo.png" alt="Salik" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-xs font-black tracking-tight leading-none">SALIK FAST FOOD</div>
                        <div className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Wah Model Town • Open
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Promo Banner Preview */}
                  <div className="rounded-2xl p-3 bg-gradient-to-r from-orange-600 to-amber-600 shadow-md flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-white/20">Special Offer</span>
                      <div className="text-xs font-black font-montserrat">FAMILY FEAST</div>
                      <div className="text-[9px] text-white/90">Rs. 2580 • Pizza & Burgers</div>
                    </div>
                    <img src="/assets/deal-family.png" alt="Deal" className="w-14 h-14 object-contain drop-shadow-md" />
                  </div>

                  {/* Mini Categories Chips Preview */}
                  <div className="flex items-center gap-1.5 overflow-hidden text-[9px] font-bold">
                    <span className="px-2 py-1 rounded-full bg-orange-600 text-white">🍕 Pizza</span>
                    <span className="px-2 py-1 rounded-full bg-white/10 text-zinc-300">🍔 Burgers</span>
                    <span className="px-2 py-1 rounded-full bg-white/10 text-zinc-300">🌯 Shawarma</span>
                  </div>

                  {/* Mini Product Card Preview */}
                  <div className="rounded-xl p-2.5 bg-zinc-900 border border-white/10 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[11px] font-bold truncate">Tower Zinger Burger</div>
                      <div className="text-[9px] text-orange-400 font-extrabold">Rs. 280</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-orange-600 text-white text-[9px] font-extrabold shrink-0">
                      + ADD
                    </span>
                  </div>

                  {/* Bottom Active Status Floating Bar */}
                  <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 text-purple-200 font-bold">
                      <Bike className="w-3.5 h-3.5 text-purple-400" />
                      <span>Order #104 Out for Delivery</span>
                    </div>
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
