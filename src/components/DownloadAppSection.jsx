import React from 'react';
import { 
  Smartphone, Download, Zap, Bike, Bell, CheckCircle2
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
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-bold uppercase tracking-wider">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>OFFICIAL ANDROID APP</span>
                </div>
                
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

            {/* Right Column: Sleek Phone Mockup Visual */}
            <div className="lg:col-span-5 flex justify-center">
              <div className={`relative w-full max-w-[240px] sm:max-w-[270px] rounded-[2rem] p-2.5 border-3 shadow-xl ${
                isDark 
                  ? 'bg-zinc-950 border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)]' 
                  : 'bg-zinc-900 border-zinc-700 shadow-xl text-white'
              }`}>
                
                {/* Phone Speaker & Camera Notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-black rounded-full z-30 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-zinc-800 mr-1.5" />
                  <div className="w-6 h-1 rounded-full bg-zinc-800" />
                </div>

                {/* Inner Screen Preview */}
                <div className="rounded-[1.6rem] overflow-hidden bg-[#0f0f13] text-white p-3.5 pt-7 space-y-3 relative select-none">
                  
                  {/* Top Bar Preview */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-orange-500/60 bg-black">
                        <img src="/assets/salik-logo.png" alt="Salik" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="text-[11px] font-black tracking-tight leading-none">SALIK FAST FOOD</div>
                        <div className="text-[8px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Wah Cantt • Open
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Promo Banner Preview */}
                  <div className="rounded-xl p-2.5 bg-gradient-to-r from-orange-600 to-amber-600 shadow-md flex items-center justify-between gap-1.5">
                    <div className="space-y-0.5">
                      <span className="text-[7px] font-extrabold uppercase px-1 py-0.5 rounded-full bg-white/20">Special Offer</span>
                      <div className="text-[11px] font-black font-montserrat">FAMILY FEAST</div>
                      <div className="text-[8px] text-white/90">Rs. 2580 • Pizza & Burgers</div>
                    </div>
                    <img src="/assets/deal-family.png" alt="Deal" className="w-11 h-11 object-contain drop-shadow-md" />
                  </div>

                  {/* Mini Product Card Preview */}
                  <div className="rounded-lg p-2 bg-zinc-900 border border-white/10 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[10px] font-bold truncate">Tower Zinger Burger</div>
                      <div className="text-[8px] text-orange-400 font-extrabold">Rs. 280</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-orange-600 text-white text-[8px] font-extrabold shrink-0">
                      + ADD
                    </span>
                  </div>

                  {/* Bottom Active Status Floating Bar */}
                  <div className="p-1.5 rounded-lg bg-purple-950/80 border border-purple-500/40 flex items-center justify-between text-[9px]">
                    <div className="flex items-center gap-1 text-purple-200 font-bold">
                      <Bike className="w-3 h-3 text-purple-400" />
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
