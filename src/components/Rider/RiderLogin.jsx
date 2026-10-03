import React, { useState, useEffect } from 'react';
import { Bike, Lock, Phone, ArrowLeft, Loader2, AlertCircle, Sparkles, CheckCircle2, Smartphone, Fingerprint } from 'lucide-react';
import { apiUrl, resolveImageUrl, APP_MODE } from '../../config/api';
import { updateSystemBarsTheme } from '../../utils/systemBars';
import { requestNotificationPermission } from '../../services/notificationService';
import {
  isBiometricAvailable,
  isBiometricEnrolled,
  authenticateWithBiometrics,
  registerBiometricCredential,
  getSavedBiometricProfile
} from '../../services/biometricService';

export default function RiderLogin({ onLoginSuccess, onBackToStore }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [savedRiderProfile, setSavedRiderProfile] = useState(null);
  const [enableBiometricCheckbox, setEnableBiometricCheckbox] = useState(false);

  useEffect(() => {
    updateSystemBarsTheme(false);
    requestNotificationPermission().catch(() => {});

    isBiometricAvailable().then((avail) => {
      setBiometricAvailable(avail);
      const enrolled = avail && isBiometricEnrolled('rider');
      setBiometricEnrolled(enrolled);
      if (enrolled) {
        setSavedRiderProfile(getSavedBiometricProfile('rider'));
      }
    });
  }, []);

  const handleBiometricRiderLogin = async () => {
    setBiometricLoading(true);
    setError('');
    try {
      const res = await authenticateWithBiometrics('rider');
      if (res.success && res.profile) {
        const saved = res.profile;
        if (saved.phone && saved.pin) {
          try {
            const apiRes = await fetch(apiUrl('/api/rider/login'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: saved.phone, pin: saved.pin })
            });
            const data = await apiRes.json();
            if (apiRes.ok && data.success && data.rider) {
              localStorage.setItem('salik_rider_token', data.token);
              localStorage.setItem('salik_rider_user', JSON.stringify(data.rider));
              if (typeof onLoginSuccess === 'function') {
                onLoginSuccess(data.rider);
              }
              return;
            }
          } catch {}
        }
        localStorage.setItem('salik_rider_user', JSON.stringify(saved));
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(saved);
        }
      }
    } catch (err) {
      console.warn('Rider biometric login failed:', err);
      setError(err?.message || 'Biometric verification failed.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    requestNotificationPermission().catch(() => {});

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 11) {
      setError('Please enter a valid phone number.');
      return;
    }

    const cleanPin = pin.replace(/\D/g, '');
    if (!cleanPin || cleanPin.length !== 4) {
      setError('Please enter your 4-digit PIN.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/rider/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, pin: cleanPin })
      });

      const data = await res.json();
      if (res.ok && data.success && data.rider) {
        try {
          localStorage.setItem('salik_rider_token', data.token);
          localStorage.setItem('salik_rider_user', JSON.stringify(data.rider));
          if (enableBiometricCheckbox && biometricAvailable) {
            await registerBiometricCredential({
              role: 'rider',
              profile: { ...data.rider, pin: cleanPin }
            });
          }
        } catch (bioErr) {
          console.warn('Could not save rider biometric profile:', bioErr);
        }
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(data.rider);
        }
      } else {
        setError(data.error || 'Login failed. Please verify your phone number and PIN.');
      }
    } catch (err) {
      setError('Unable to connect to server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen text-zinc-900 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans select-none bg-[#fffaf5]"
      style={{
        background: `
          radial-gradient(ellipse 80% 70% at 95% 20%, rgba(249, 115, 22, 0.18) 0%, rgba(251, 146, 60, 0.08) 50%, transparent 80%),
          radial-gradient(ellipse 70% 60% at 5% 40%, rgba(234, 88, 12, 0.14) 0%, rgba(249, 115, 22, 0.06) 45%, transparent 75%),
          radial-gradient(ellipse 55% 35% at 50% 0%, rgba(251, 191, 36, 0.15) 0%, transparent 60%),
          linear-gradient(180deg, #fffaf5 0%, #fbf5ec 45%, #f6efe4 85%, #f3eae0 100%)
        `
      }}
    >
      {/* Background ambient lighting matching main website */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-orange-500/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-16 right-0 w-[600px] h-[600px] bg-amber-400/15 blur-[160px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between z-10 max-w-4xl mx-auto w-full">
        <button
          type="button"
          onClick={onBackToStore}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur-xs border border-orange-200/80 text-zinc-800 hover:text-orange-600 hover:bg-white transition-all text-xs font-bold shadow-2xs cursor-pointer active:scale-98"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Customer Storefront</span>
        </button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-600 text-[11px] font-bold tracking-wider uppercase">
          <Bike className="w-3.5 h-3.5 text-orange-600" />
          <span>Rider Portal</span>
        </span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto z-10 py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/25 mb-3.5 ring-4 ring-orange-200/60">
            <Bike className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wide text-zinc-900 uppercase font-sans">
            Salik Fast Food
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            Delivery Staff & Rider Access
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-md border border-orange-200/70 rounded-3xl p-6 sm:p-8 shadow-xl shadow-orange-950/5">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Biometric Fingerprint Login (if enrolled) */}
          {biometricEnrolled && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleBiometricRiderLogin}
                disabled={biometricLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {biometricLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Scanning Fingerprint...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5" />
                    <span>Login with Fingerprint {savedRiderProfile?.name ? `(${savedRiderProfile.name})` : ''}</span>
                  </>
                )}
              </button>

              <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-orange-200/80"></div>
                <span className="flex-shrink mx-3 text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
                  Or Login with PIN
                </span>
                <div className="flex-grow border-t border-orange-200/80"></div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Number Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                Rider Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="03001234567"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#fffdfa] border border-orange-200/80 text-zinc-900 font-semibold text-sm placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* 4-digit PIN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  4-Digit Security PIN
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-orange-600 hover:text-orange-700 font-bold cursor-pointer"
                >
                  {showPin ? 'Hide PIN' : 'Show PIN'}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#fffdfa] border border-orange-200/80 text-zinc-900 font-semibold text-sm placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Opt-in to Biometrics (if available and not yet enrolled) */}
            {biometricAvailable && !biometricEnrolled && (
              <label className="flex items-center gap-2 text-xs text-zinc-600 font-medium cursor-pointer py-1 select-none">
                <input
                  type="checkbox"
                  checked={enableBiometricCheckbox}
                  onChange={(e) => setEnableBiometricCheckbox(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-600 border-zinc-300 focus:ring-orange-500 cursor-pointer"
                />
                <Fingerprint className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span>Enable Fingerprint login for fast shift unlock</span>
              </label>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm uppercase tracking-wider shadow-md shadow-orange-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Logging In...</span>
                </>
              ) : (
                <>
                  <Bike className="w-4 h-4" />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

          {APP_MODE !== 'rider' && (
            <div className="mt-6 pt-5 border-t border-orange-100 text-center">
              <p className="text-xs text-zinc-500 font-medium mb-2.5">
                Install the dedicated delivery app on your phone
              </p>
              <a
                href="/downloads/Salik-Fast-Food-Rider.apk"
                download="Salik-Fast-Food-Rider.apk"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 font-bold text-xs uppercase tracking-wider shadow-2xs hover:scale-[1.01] active:scale-[0.98] transition-all"
              >
                <Smartphone className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Download Rider App (.APK)</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-zinc-500 z-10">
        Salik Fast Food &copy; {new Date().getFullYear()} &bull; Wah Cantt Delivery Fleet
      </div>
    </div>
  );
}
