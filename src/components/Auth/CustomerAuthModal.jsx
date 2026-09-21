import React, { useState } from 'react';
import { X, Mail, ShieldCheck, ArrowRight, Sparkles, User, MapPin, Phone, CheckCircle2 } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export default function CustomerAuthModal() {
  const { authModalOpen, setAuthModalOpen, sendOtp, verifyOtp } = useCustomerAuth();

  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [devCode, setDevCode] = useState('');
  const [delivered, setDelivered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!authModalOpen) return null;

  const handleClose = () => {
    setAuthModalOpen(false);
    setStep('email');
    setError('');
    setCode('');
    setDevCode('');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address (e.g. yourname@gmail.com)');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(email.trim());
      setDevCode(res.devCode || '');
      setDelivered(Boolean(res.delivered));
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!code.trim()) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email.trim(), code.trim(), name, phone, address);
      handleClose();
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div 
        onClick={handleClose} 
        className="fixed inset-0" 
      />

      <div className="relative w-full max-w-md bg-[#16161b] text-white border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 max-h-[92vh] overflow-y-auto animate-scale-in">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-600/20 border border-orange-500/40 text-orange-500 flex items-center justify-center mx-auto mb-3 shadow-md">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-display uppercase tracking-wide font-bold text-white">
            {step === 'email' ? 'Customer Sign In' : 'Verify Email Code'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
            {step === 'email' 
              ? 'Enter your email address to sign in, save delivery addresses, and track your past orders.' 
              : `We sent a 6-digit verification code to ${email}.`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: EMAIL INPUT */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                />
                <Mail className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                A 6-digit verification code will be sent to your inbox.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Sending Code...' : 'Send Verification Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: EMAIL OTP VERIFICATION */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            
            {/* Delivery Info Banner */}
            {delivered ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Verification code sent! Please check your inbox and spam folder.</span>
              </div>
            ) : devCode ? (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Verification Code:</span>
                  </span>
                  <span className="text-[11px] text-zinc-400">SMTP setup pending</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCode(devCode)}
                  className="font-extrabold text-xs px-2.5 py-1 rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  Autofill ({devCode})
                </button>
              </div>
            ) : null}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 text-center tracking-[0.3em] font-sans text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                />
                <ShieldCheck className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Optional Customer Profile Details */}
            <div className="space-y-2.5 pt-1 border-t border-white/5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Your Full Name (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Salik Khan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-white placeholder-zinc-500"
                  />
                  <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Mobile Number (For Delivery Rider)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="e.g. 0309-5369472"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-white placeholder-zinc-500"
                  />
                  <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Delivery Address (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="House/Street, Wah Cantt"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-white placeholder-zinc-500"
                  />
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="flex-1 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? 'Verifying...' : 'Verify & Login'}</span>
                <ShieldCheck className="w-4 h-4" />
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
