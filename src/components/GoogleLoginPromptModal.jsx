import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, History, Loader2, 
  CheckCircle2 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { 
  getStoredCustomerUser, 
  setStoredCustomerUser, 
  triggerGoogleLogin 
} from '../services/googleAuth';
import { fetchCustomerCloudProfile } from '../services/customerSync';
import { saveStoredUserProfile } from '../services/userProfile';
import { Capacitor } from '@capacitor/core';

export default function GoogleLoginPromptModal() {
  const { isDark, syncCustomerOrdersCloud, userProfile, saveUserProfile } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Auto-show prompt on startup if user is not already logged in
  useEffect(() => {
    // Check if user is already authenticated
    const currentUser = getStoredCustomerUser();
    if (currentUser && currentUser.email) {
      return;
    }

    // Check if dismissed in the current session
    let dismissed = false;
    try {
      dismissed = Boolean(sessionStorage.getItem('salik_google_startup_dismissed'));
    } catch {}

    if (!dismissed) {
      // Delay slightly for smooth page & animation readiness
      const timer = setTimeout(() => {
        const checkAgain = getStoredCustomerUser();
        if (!checkAgain || !checkAgain.email) {
          setIsOpen(true);
        }
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen to customer auth changes across tabs or deep links
  useEffect(() => {
    const handleAuthChange = () => {
      const user = getStoredCustomerUser();
      if (user && user.email) {
        setIsOpen(false);
      }
    };
    window.addEventListener('salik_customer_auth_changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('salik_customer_auth_changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem('salik_google_startup_dismissed', '1');
    } catch {}
  };

  // Google 1-Tap / Popup login handler
  const handleGoogleLogin = async () => {
    // If running in native Android APK, use deep-link bridge to prevent WebView popup issues
    if (typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || Capacitor.isNativePlatform?.())) {
      try {
        window.open('https://salikleo.website/mobile-google-auth.html', '_system');
      } catch {
        window.location.href = 'https://salikleo.website/mobile-google-auth.html';
      }
      return;
    }

    setGoogleLoading(true);
    try {
      await triggerGoogleLogin({
        onSuccess: async (user) => {
          setStoredCustomerUser(user);
          setGoogleLoading(false);
          setIsOpen(false);

          if (typeof syncCustomerOrdersCloud === 'function' && user?.email) {
            syncCustomerOrdersCloud(user.email, userProfile?.phone);
          }

          if (user?.email) {
            try {
              const cloudProf = await fetchCustomerCloudProfile(user.email);
              if (cloudProf) {
                const updated = {
                  name: userProfile?.name || cloudProf.name || user.name || '',
                  phone: userProfile?.phone || cloudProf.phone || '',
                  address: userProfile?.address || cloudProf.address || ''
                };
                if (typeof saveUserProfile === 'function') {
                  saveUserProfile(updated);
                } else {
                  saveStoredUserProfile(updated);
                }
              }
            } catch (err) {
              console.warn('Could not sync cloud profile:', err);
            }
          }

          window.dispatchEvent(new Event('salik_customer_auth_changed'));
        },
        onError: (err) => {
          setGoogleLoading(false);
          console.warn('Google login prompt error:', err);
        },
        onConfigRequired: () => {
          setGoogleLoading(false);
        }
      });
    } catch (e) {
      setGoogleLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Dimmed backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Floating Card */}
      <div 
        className={`relative w-full max-w-sm sm:max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl z-10 space-y-5 animate-in zoom-in-95 duration-200 ${
          isDark 
            ? 'bg-[#151518] border-zinc-800 text-white shadow-black/80' 
            : 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-400/30'
        }`}
      >
        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors cursor-pointer ${
            isDark 
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/80' 
              : 'text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100'
          }`}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Clean Header (No top logo, larger modern heading font) */}
        <div className="text-center pt-2">
          <h3 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-zinc-900 dark:text-white leading-snug">
            Sign in with Google
          </h3>
          <p className={`text-xs sm:text-[13px] mt-1.5 max-w-xs mx-auto leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Connect your Google account to automatically synchronize your orders and delivery details.
          </p>
        </div>

        {/* Value Points */}
        <div className={`p-4 rounded-2xl space-y-3 text-xs sm:text-[13px] ${
          isDark ? 'bg-zinc-900/80 border border-zinc-800/80' : 'bg-orange-50/60 border border-orange-100/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-orange-600/15 text-orange-600 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
              Access previous orders across all your devices
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-emerald-600/15 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
              Auto-saved address & name for 1-tap checkout
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-blue-600/15 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
              Safe & secure without remembering passwords
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-3 transition-transform active:scale-[0.98] shadow-md cursor-pointer ${
              isDark 
                ? 'bg-white hover:bg-zinc-100 text-zinc-900 shadow-white/10' 
                : 'bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 shadow-xs'
            }`}
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                <span>Connecting with Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.4 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.6 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            className={`w-full text-center text-xs font-semibold py-1.5 transition-colors cursor-pointer ${
              isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-700'
            }`}
          >
            Maybe Later (Continue as Guest)
          </button>
        </div>
      </div>
    </div>
  );
}
