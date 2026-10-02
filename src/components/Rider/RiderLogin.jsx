import React, { useState } from 'react';
import { Bike, Lock, Phone, ArrowLeft, Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { apiUrl, resolveImageUrl } from '../../config/api';

export default function RiderLogin({ onLoginSuccess, onBackToStore }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('92') && cleanPhone.length === 12) cleanPhone = '0' + cleanPhone.slice(2);
    else if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) cleanPhone = '0' + cleanPhone;

    if (!cleanPhone || cleanPhone.length !== 11) {
      setError('Please enter a valid 11-digit phone number (e.g. 03001234567).');
      return;
    }

    if (!pin || pin.trim().length < 4) {
      setError('Please enter your 4-digit PIN.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/rider/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, pin: pin.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success && data.rider) {
        try {
          localStorage.setItem('salik_rider_token', data.token);
          localStorage.setItem('salik_rider_user', JSON.stringify(data.rider));
        } catch {}
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50/40 via-zinc-50 to-zinc-100 text-zinc-900 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Subtle background glow accents */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-amber-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between z-10 max-w-4xl mx-auto w-full">
        <button
          type="button"
          onClick={onBackToStore}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-zinc-200/80 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 transition-colors text-xs font-bold shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Customer Storefront</span>
        </button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-[11px] font-bold tracking-wider uppercase">
          <Bike className="w-3.5 h-3.5 text-orange-600" />
          <span>Rider Portal</span>
        </span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto z-10 py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/25 mb-3.5 ring-4 ring-orange-100">
            <Bike className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wide text-zinc-900 uppercase font-sans">
            Salik Fast Food
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 font-medium">
            Delivery Staff & Rider Access
          </p>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-zinc-200/60">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
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
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-semibold text-sm placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
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
                  required
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 font-mono font-bold text-base tracking-widest placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Default PIN is the last 4 digits of your phone number (or check with manager).
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm uppercase tracking-wider shadow-md shadow-orange-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Bike className="w-4 h-4" />
                  <span>Start Shift / Login</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-zinc-500 z-10">
        Salik Fast Food &copy; {new Date().getFullYear()} &bull; Wah Cantt Delivery Fleet
      </div>
    </div>
  );
}
