import React from 'react';
import { Sun } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ThemeToggle({ variant = 'compact', className = '' }) {
  const { isDark, toggleTheme } = useCart();

  if (variant === 'full') {
    return (
      <div className={`w-full ${className}`}>
        <div
          onClick={toggleTheme}
          role="button"
          tabIndex={0}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`w-full py-2.5 px-4 rounded-2xl flex items-center justify-between cursor-pointer select-none transition-all duration-300 active:scale-[0.98] ${
            isDark
              ? 'bg-[#1e232d] border border-white/5 shadow-inner'
              : 'bg-[#edf0f5] border border-zinc-200/90 shadow-2xs'
          }`}
        >
          {/* Sun Icon (Left Side) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isDark) toggleTheme();
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
              !isDark
                ? 'bg-amber-400/20 text-amber-500 shadow-2xs scale-105'
                : 'text-zinc-500/50'
            }`}
            title="Light Mode"
            aria-label="Light Mode"
          >
            <Sun
              className={`w-5 h-5 transition-transform duration-300 ${
                !isDark ? 'text-amber-500 fill-amber-400 rotate-0' : 'text-zinc-500/60 -rotate-45'
              }`}
            />
          </button>

          {/* Inset Neumorphic Track (Center) */}
          <div
            className={`relative w-20 h-10 rounded-full p-1 transition-all duration-300 flex items-center shrink-0 ${
              isDark
                ? 'bg-[#141720] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.7),inset_-1px_-1px_3px_rgba(255,255,255,0.06)]'
                : 'bg-[#d5dae3] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.18),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]'
            }`}
          >
            {/* Floating Sliding Knob */}
            <div
              style={{
                transform: `translateX(${isDark ? '40px' : '0px'})`,
                transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              className={`w-8 h-8 rounded-full ${
                isDark
                  ? 'bg-[#4f5768] shadow-[2px_3px_8px_rgba(0,0,0,0.6),-1px_-1px_3px_rgba(255,255,255,0.08)]'
                  : 'bg-[#ffffff] shadow-[2px_3px_6px_rgba(0,0,0,0.18),-1px_-1px_2px_rgba(255,255,255,0.9)]'
              }`}
            />
          </div>

          {/* Crescent Moon Icon (Right Side) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isDark) toggleTheme();
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
              isDark
                ? 'bg-amber-400/15 text-amber-300 shadow-2xs scale-105'
                : 'text-zinc-400/50'
            }`}
            title="Dark Mode"
            aria-label="Dark Mode"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${
                isDark
                  ? 'text-amber-300 fill-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.4)] rotate-0'
                  : 'text-zinc-400/60 fill-zinc-400/60 rotate-12'
              }`}
              viewBox="0 0 24 24"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Compact variant for Header (both desktop and mobile view)
  return (
    <div
      onClick={toggleTheme}
      role="button"
      tabIndex={0}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`px-1 sm:px-1.5 py-1 rounded-full flex items-center gap-1 sm:gap-1.5 cursor-pointer select-none transition-all duration-300 active:scale-[0.97] shrink-0 ${
        isDark
          ? 'bg-[#1b202a] border border-white/10 shadow-inner'
          : 'bg-[#edf0f5] border border-zinc-200/90 shadow-2xs'
      } ${className}`}
    >
      {/* Sun Icon */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isDark) toggleTheme();
        }}
        className={`w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
          !isDark
            ? 'bg-amber-400/20 text-amber-500 scale-105 shadow-2xs'
            : 'text-zinc-500/50'
        }`}
        title="Light Mode"
        aria-label="Light Mode"
      >
        <Sun
          className={`w-3.5 h-3.5 transition-transform duration-300 ${
            !isDark ? 'text-amber-500 fill-amber-400 rotate-0' : 'text-zinc-500/60 -rotate-45'
          }`}
        />
      </button>

      {/* Inset Neumorphic Track */}
      <div
        className={`relative w-11 h-6 rounded-full p-0.5 transition-all duration-300 flex items-center shrink-0 ${
          isDark
            ? 'bg-[#12151d] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.7),inset_-1px_-1px_2px_rgba(255,255,255,0.06)]'
            : 'bg-[#d2d7e0] shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.18),inset_-1.5px_-1.5px_3px_rgba(255,255,255,0.9)]'
        }`}
      >
        {/* Floating Sliding Knob */}
        <div
          style={{
            transform: `translateX(${isDark ? '20px' : '0px'})`,
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className={`w-5 h-5 rounded-full ${
            isDark
              ? 'bg-[#4f5768] shadow-[1px_2px_4px_rgba(0,0,0,0.6)]'
              : 'bg-[#ffffff] shadow-[1px_2px_4px_rgba(0,0,0,0.18)]'
          }`}
        />
      </div>

      {/* Moon Icon */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!isDark) toggleTheme();
        }}
        className={`w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
          isDark
            ? 'bg-amber-400/15 text-amber-300 scale-105 shadow-2xs'
            : 'text-zinc-400/50'
        }`}
        title="Dark Mode"
        aria-label="Dark Mode"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-300 ${
            isDark
              ? 'text-amber-300 fill-amber-300 drop-shadow-[0_0_4px_rgba(252,211,77,0.4)] rotate-0'
              : 'text-zinc-400/60 fill-zinc-400/60 rotate-12'
          }`}
          viewBox="0 0 24 24"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
    </div>
  );
}
