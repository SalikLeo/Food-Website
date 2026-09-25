import React from 'react';
import { 
  WifiOff, 
  Phone, 
  RefreshCw, 
  Pizza, 
  Hamburger, 
  Sandwich, 
  CupSoda, 
  UtensilsCrossed, 
  Coffee, 
  Cookie, 
  CakeSlice 
} from 'lucide-react';

const SHOP_PHONE = '0309-5369472';
const TEL_LINK = 'tel:03095369472';

export default function NoInternetScreen({ onRetry, isChecking = false }) {
  const handleCall = () => {
    window.location.href = TEL_LINK;
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none font-sans">
      {/* Food Doodles Pattern Card */}
      <div className="relative w-full max-w-sm rounded-[28px] bg-white p-6 sm:p-8 text-center shadow-2xl overflow-hidden border border-zinc-200">
        
        {/* Decorative Food Doodles Watermark scattered in background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.07] overflow-hidden text-zinc-950">
          <Pizza className="absolute -top-3 -left-3 w-16 h-16 -rotate-12" />
          <CupSoda className="absolute top-2 right-3 w-12 h-12 rotate-12" />
          <Hamburger className="absolute top-1/4 -left-2 w-14 h-14 rotate-6" />
          <UtensilsCrossed className="absolute top-1/3 -right-3 w-14 h-14 -rotate-45" />
          <Sandwich className="absolute bottom-16 -left-3 w-14 h-14 12" />
          <CakeSlice className="absolute bottom-14 -right-2 w-12 h-12 -rotate-12" />
          <Coffee className="absolute -bottom-3 left-10 w-12 h-12 rotate-12" />
          <Cookie className="absolute -bottom-3 right-12 w-12 h-12 -rotate-6" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Orange Circular Badge with WifiOff */}
          <div className="w-20 h-20 rounded-full bg-[#f15a24] flex items-center justify-center shadow-lg shadow-orange-500/30 mb-5">
            <WifiOff className="w-10 h-10 text-white stroke-[2.2]" />
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">
            No Internet Access!
          </h2>

          {/* Subtitle */}
          <p className="text-zinc-600 font-medium text-sm sm:text-base leading-snug mb-6 max-w-[280px]">
            Please tap below to order via phone call.
          </p>

          {/* Yellow Call Button */}
          <a
            href={TEL_LINK}
            onClick={handleCall}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-b from-[#ffd400] to-[#ffbe00] hover:from-[#ffc800] hover:to-[#ffa700] active:scale-[0.98] transition-all text-zinc-950 font-black text-sm sm:text-base tracking-wider uppercase shadow-md shadow-amber-300/40 flex items-center justify-center gap-2.5 cursor-pointer no-underline"
          >
            <Phone className="w-4 h-4 text-zinc-950 fill-zinc-950 shrink-0" />
            <span>CALL SALIK FAST FOOD</span>
          </a>

          {/* Shop Phone Subtext */}
          <div className="mt-3 text-xs font-semibold text-zinc-500">
            Helpline: <span className="text-zinc-800 font-bold">{SHOP_PHONE}</span>
          </div>

          {/* Try Again / Retry Action */}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isChecking}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 py-1.5 px-3 rounded-lg hover:bg-orange-50 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking Connection...' : 'Try Again'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
