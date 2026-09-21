import React, { useState } from 'react';
import { Lock, ArrowLeft, ShieldAlert } from 'lucide-react';
import { apiUrl } from '../../config/api';

export default function AdminLogin({ onLogin, onBackToStore }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('salik_admin_token', data.token);
        localStorage.setItem('mehrban_admin_token', data.token);
        onLogin();
      } else {
        setError(data.error || 'Invalid passcode. Default passcode is "admin123" or "salik123"');
      }
    } catch {
      setError('Unable to reach server. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#d5d8de] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-8 shadow-xl text-zinc-900">
        
        <button
          onClick={onBackToStore}
          className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Storefront</span>
        </button>

        <div className="text-center mb-8">
          <img
            src="/assets/salik-logo.png"
            alt="Salik Fast Food"
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <h2 className="font-display text-3xl uppercase tracking-wide text-zinc-900">
            Admin Panel Login
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Sign in to manage products, pricing, deals, and incoming customer orders.
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
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin passcode (e.g. salik123)"
                className="w-full pl-4 pr-10 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-2xs"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[11px] text-zinc-500 mt-1.5 block">
              Default password: <code className="text-orange-600 font-bold">salik123</code> or <code className="text-orange-600 font-bold">admin123</code>
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>

      </div>
    </div>
  );
}
