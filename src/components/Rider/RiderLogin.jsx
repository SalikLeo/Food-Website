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
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Background glow accents */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between z-10">
        <button
          type="button"
          onClick={onBackToStore}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Customer Storefront</span>
        </button>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-bold tracking-wider uppercase">
          <Bike className="w-3.5 h-3.5" />
          <span>Rider Portal</span>
        </span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto z-10 py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/30 mb-3.5 ring-4 ring-orange-500/10">
            <Bike className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wide text-white uppercase font-sans">
            Salik Fast Food
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 font-medium">
            Delivery Staff & Rider Access
          </p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Number Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Rider Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03001234567"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-semibold text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>
            </div>

            {/* 4-digit PIN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  4-Digit Security PIN
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold cursor-pointer"
                >
                  {showPin ? 'Hide PIN' : 'Show PIN'}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono font-bold text-base tracking-widest placeholder-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Default PIN is the last 4 digits of your phone number (or check with manager).
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
      <div className="text-center text-[11px] text-zinc-600 z-10">
        Salik Fast Food &copy; {new Date().getFullYear()} &bull; Wah Cantt Delivery Fleet
      </div>
    </div>
  );
}
