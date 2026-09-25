import React from 'react';
import { 
  Download, Zap, Bike, Bell, CheckCircle2
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function DownloadAppSection() {
  const { isDark } = useCart();

  const appHighlights = [
    {
      icon: Zap,
      title: 'Fast 1-Tap Ordering',
      desc: 'Browse full menu, customize deals, and checkout in seconds.'
    },
    {
      icon: Bell,
      title: 'Live Order Tracking',
      desc: 'Real-time kitchen status updates and order alerts.'
    },
    {
      icon: Bike,
      title: 'Direct Rider Connect',
      desc: 'Quick WhatsApp & phone contact with your assigned rider.'
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Column: Heading, 3 Highlights, Download CTA */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="space-y-2">
                <span className="text-xs font-bold tracking-[0.2em] text-orange-500 sm:text-orange-600 uppercase block">
                  OFFICIAL ANDROID APP
                </span>
                
                <h2 className={`text-3xl sm:text-4xl md:text-5xl font-display uppercase tracking-tight ${
                  isDark ? 'text-white' : 'text-zinc-900'
                } leading-none`}>
                  GET THE SALIK <span className="text-orange-500">MOBILE APP</span>
                </h2>
                
                <p className={`text-xs sm:text-sm leading-relaxed max-w-lg ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}>
                  Enjoy the fastest food ordering experience in Wah Cantt with live tracking and instant notifications.
                </p>
              </div>

              {/* 3 Streamlined Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {appHighlights.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div 
                      key={idx} 
                      className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${
                        isDark 
                          ? 'bg-zinc-900/50 border-white/5' 
                          : 'bg-white border-zinc-200/80 shadow-2xs'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0 text-orange-500">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className={`text-xs font-bold uppercase tracking-wide ${
                          isDark ? 'text-white' : 'text-zinc-900'
                        }`}>
                          {item.title}
                        </h3>
                        <p className={`text-[11px] leading-tight mt-0.5 ${
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
                  className="inline-flex items-center justify-center gap-3 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/20 active:scale-98 transition-all group cursor-pointer"
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

            {/* Right Column: Sleek Phone Mockup Visual (Slim Bezels & Modern Phone Aspect Ratio) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className={`relative w-[260px] sm:w-[280px] rounded-[2.8rem] p-2 border-2 shadow-2xl transition-all ${
                isDark 
                  ? 'bg-zinc-950 border-zinc-700/80 shadow-[0_25px_60px_rgba(0,0,0,0.85)] ring-1 ring-white/10' 
                  : 'bg-zinc-900 border-zinc-700 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/10'
              }`}>
                
                {/* Phone Top Notch / Dynamic Island */}
                <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-black rounded-full z-30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-zinc-800 mr-1.5" />
                  <div className="w-5 h-1 rounded-full bg-zinc-800" />
                </div>

                {/* Inner Screen Preview - Light Theme App UI with proper height */}
                <div className="rounded-[2.3rem] overflow-hidden bg-[#faf8f5] text-zinc-900 p-3.5 pt-7 pb-4 space-y-2.5 relative select-none border border-zinc-200/60 shadow-inner flex flex-col justify-between min-h-[500px] sm:min-h-[520px]">
                  
                  {/* Top Bar Preview */}
                  <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2.5 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-orange-400/50 bg-white shadow-2xs">
                        <img src="/assets/salik-logo.png" alt="Salik" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-[11px] font-black tracking-tight leading-none text-zinc-900">SALIK FAST FOOD</div>
                        <div className="text-[8px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Wah Cantt • Open Now
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Categories Row */}
                  <div className="flex items-center gap-1.5 overflow-hidden text-[9px] font-bold">
                    <span className="px-2.5 py-1 rounded-full bg-orange-500 text-white shadow-2xs">🍕 Pizza</span>
                    <span className="px-2.5 py-1 rounded-full bg-zinc-200/70 text-zinc-700">🍔 Burgers</span>
                    <span className="px-2.5 py-1 rounded-full bg-zinc-200/70 text-zinc-700">🌯 Shawarma</span>
                  </div>

                  {/* Promo Banner Preview */}
                  <div className="rounded-2xl p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm flex items-center justify-between gap-1.5">
                    <div className="space-y-0.5">
                      <span className="text-[7px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-white/25">Special Offer</span>
                      <div className="text-[11px] font-black font-montserrat tracking-tight leading-tight">FAMILY FEAST</div>
                      <div className="text-[8px] text-white/95">Rs. 2580 • Pizza & Burgers</div>
                    </div>
                    <img src="/assets/deal-family.png" alt="Deal" className="w-12 h-12 object-contain drop-shadow" />
                  </div>

                  {/* Mini Product Card 1 */}
                  <div className="rounded-xl p-2.5 bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[10px] font-bold text-zinc-800 truncate">Tower Zinger Burger</div>
                      <div className="text-[8px] text-orange-600 font-extrabold">Rs. 280</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-orange-500 text-white text-[8px] font-extrabold shrink-0 shadow-2xs">
                      + ADD
                    </span>
                  </div>

                  {/* Mini Product Card 2 */}
                  <div className="rounded-xl p-2.5 bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[10px] font-bold text-zinc-800 truncate">Chicken Tikka Pizza</div>
                      <div className="text-[8px] text-orange-600 font-extrabold">Rs. 750</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-orange-500 text-white text-[8px] font-extrabold shrink-0 shadow-2xs">
                      + ADD
                    </span>
                  </div>

                  {/* Bottom Active Status Floating Bar */}
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-[9px] shadow-2xs">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <Bike className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Order #104 Out for Delivery</span>
                    </div>
                    <span className="text-[8px] text-emerald-600 font-bold">8 min</span>
                  </div>

                  {/* Bottom Home Bar Indicator */}
                  <div className="flex justify-center pt-1">
                    <div className="w-24 h-1 bg-zinc-300 rounded-full" />
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
