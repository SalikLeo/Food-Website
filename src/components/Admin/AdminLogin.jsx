import React, { useState, useEffect } from 'react';
import { Lock, ArrowLeft, ShieldAlert, Eye, EyeOff, Smartphone } from 'lucide-react';
import { apiUrl, resolveImageUrl, APP_MODE } from '../../config/api';

export default function AdminLogin({ onLogin, onBackToStore }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(() => {
    try {
      const cached = localStorage.getItem('salik_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.logoUrl || '';
      }
    } catch {}
    return '';
  });

  useEffect(() => {
    fetch(apiUrl('/api/settings'))
      .then(r => r.json())
      .then(data => {
        if (data?.logoUrl) setLogoUrl(data.logoUrl);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanPass = password.trim();

    try {
      const res = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('salik_admin_token', data.token);
        onLogin();
      } else {
        setError(data.error || 'Invalid admin passcode');
      }
    } catch {
      // Offline / network fallback verification for admin master passcode
      if (cleanPass === 'Salik.leo1212') {
        localStorage.setItem('salik_admin_token', 'salik-auth-token-valid');
        onLogin();
        return;
      }
      setError('Unable to verify passcode. Please check internet connection or enter the correct passcode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#d5d8de] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xl text-zinc-900">
        
        {APP_MODE !== 'admin' && onBackToStore && (
          <button
            onClick={onBackToStore}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Storefront</span>
          </button>
        )}

        <div className="text-center mb-8">
          <img
            src={resolveImageUrl(logoUrl || '/assets/salik-logo.png')}
            alt="Salik Fast Food"
            className="h-16 w-auto mx-auto mb-4 object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = resolveImageUrl('/assets/salik-logo.svg');
            }}
          />
          <h2 className="font-display text-3xl uppercase tracking-wide text-zinc-900">
            {APP_MODE === 'admin' ? 'Salik Admin App' : 'Admin Panel Login'}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {APP_MODE === 'admin'
              ? 'Enter the admin passcode to unlock the management dashboard.'
              : 'Sign in to manage products, pricing, deals, and incoming customer orders.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
              Admin Passcode
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin passcode"
                autoComplete="current-password"
                className="w-full pl-4 pr-11 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 rounded-lg transition-colors cursor-pointer"
                title={showPassword ? 'Hide passcode' : 'Show passcode'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>

        {/* Download Admin App (.APK) Button on Web */}
        {APP_MODE !== 'admin' && (
          <div className="mt-8 pt-6 border-t border-zinc-200 text-center">
            <p className="text-xs text-zinc-500 font-medium mb-3">
              Manage your orders & menu directly from your Android phone
            </p>
            <a
              href="/downloads/Salik-Fast-Food-Admin.apk"
              download="Salik-Fast-Food-Admin.apk"
              className="inline-flex items-center justify-center gap-2.5 w-full py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              <Smartphone className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Download Admin App (.APK)</span>
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
