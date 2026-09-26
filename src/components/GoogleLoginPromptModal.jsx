import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, ShieldCheck, History, ArrowRight, Loader2, 
  CheckCircle2, Mail, RefreshCw 
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
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [syncingEmail, setSyncingEmail] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
          setShowEmailInput(true);
        },
        onConfigRequired: () => {
          setGoogleLoading(false);
          setShowEmailInput(true);
        }
      });
    } catch (e) {
      setGoogleLoading(false);
      setShowEmailInput(true);
    }
  };

  // Direct Gmail address sync handler
  const handleManualEmailSync = async (e) => {
    e?.preventDefault?.();
    const clean = (manualEmail || '').trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setToastMessage('Please enter a valid Google email address');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    setSyncingEmail(true);
    try {
      const user = {
        name: clean.split('@')[0],
        email: clean,
        picture: '',
        loginMethod: 'google'
      };
      setStoredCustomerUser(user);

      if (typeof syncCustomerOrdersCloud === 'function') {
        syncCustomerOrdersCloud(clean, userProfile?.phone);
      }

      try {
        const cloudProf = await fetchCustomerCloudProfile(clean);
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
      } catch {}

      window.dispatchEvent(new Event('salik_customer_auth_changed'));
      setIsOpen(false);
    } catch {
      setToastMessage('Failed to sync. Please check your internet connection.');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setSyncingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Dimmed backdrop */}
      <div 
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Floating Card */}
      <div 
        className={`relative w-full max-w-sm sm:max-w-md rounded-3xl p-6 sm:p-7 border shadow-2xl z-10 space-y-5 animate-in zoom-in-95 duration-200 ${
          isDark 
            ? 'bg-[#141417] border-zinc-800 text-white shadow-black/80' 
            : 'bg-white border-zinc-200 text-zinc-900 shadow-zinc-400/40'
        }`}
      >
        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors cursor-pointer ${
            isDark 
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/80' 
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo and Brand Header */}
        <div className="text-center pt-1">
          <div className="inline-flex items-center justify-center relative mb-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/30 overflow-hidden">
              <img 
                src="/assets/salik-logo.png" 
                alt="Salik Fast Food" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            {/* Google badge badge overlay */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center p-1 border border-zinc-200">
              <svg className="w-full h-full" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.4 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.42l4.04-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.6 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
            </div>
          </div>

          <h3 className="text-lg sm:text-xl font-display uppercase tracking-wide">
            Sign in with Google
          </h3>
          <p className={`text-xs mt-1 max-w-xs mx-auto leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Connect your Google account to automatically synchronize your orders and delivery details.
          </p>
        </div>

        {/* Value Points */}
        <div className={`p-3.5 rounded-2xl space-y-2.5 text-xs ${
          isDark ? 'bg-zinc-900/80 border border-zinc-800/80' : 'bg-orange-50/60 border border-orange-100'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-orange-600/15 text-orange-600 flex items-center justify-center shrink-0">
              <History className="w-3.5 h-3.5" />
            </div>
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
              Access previous orders across all your devices
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-600/15 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
              Auto-saved address & name for 1-tap checkout
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-600/15 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
              Safe & secure without remembering passwords
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
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

          {/* Fallback Direct Gmail Sync */}
          {!showEmailInput ? (
            <button
              type="button"
              onClick={() => setShowEmailInput(true)}
              className={`w-full text-center text-[11px] font-semibold py-1 transition-colors cursor-pointer ${
                isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Or sync orders with Google email address →
            </button>
          ) : (
            <form onSubmit={handleManualEmailSync} className="pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
              <label className={`text-[10px] font-bold block uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Enter Gmail Address
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="your.email@gmail.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs border outline-none ${
                    isDark 
                      ? 'bg-zinc-800/90 border-zinc-700 text-white placeholder-zinc-500 focus:border-orange-500' 
                      : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-orange-500'
                  }`}
                />
                <button
                  type="submit"
                  disabled={syncingEmail}
                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer shrink-0"
                >
                  {syncingEmail ? 'Syncing...' : 'Sync'}
                </button>
              </div>
            </form>
          )}

          {toastMessage && (
            <p className="text-[11px] font-semibold text-center text-red-500">
              {toastMessage}
            </p>
          )}

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            className={`w-full text-center text-xs font-semibold py-1.5 transition-colors cursor-pointer ${
              isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            Maybe Later (Continue as Guest)
          </button>
        </div>
      </div>
    </div>
  );
}
