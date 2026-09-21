import React, { useState } from 'react';
import { X, Phone, ShieldCheck, ArrowRight, MessageCircle, Sparkles, User, MapPin } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export default function CustomerAuthModal() {
  const { authModalOpen, setAuthModalOpen, sendOtp, verifyOtp } = useCustomerAuth();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'profile'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!authModalOpen) return null;

  const handleClose = () => {
    setAuthModalOpen(false);
    setStep('phone');
    setError('');
    setCode('');
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) {
      setError('Please enter your mobile phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(phone);
      setSentCode(res.code || '');
      setWhatsappUrl(res.whatsappUrl || '');
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
      await verifyOtp(phone, code, name, address);
      handleClose();
    } catch (err) {
      setError(err.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div 
        onClick={handleClose} 
        className="fixed inset-0" 
      />

      <div className="relative w-full max-w-md bg-[#16161b] text-white border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 animate-scale-in">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-orange-600/20 border border-orange-500/40 text-orange-500 flex items-center justify-center mx-auto mb-3">
            <MessageCircle className="w-6 h-6 fill-orange-500/20" />
          </div>
          <h3 className="text-2xl font-display uppercase tracking-wide font-bold text-white">
            {step === 'phone' ? 'Customer Sign In' : 'Verify WhatsApp Code'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
            {step === 'phone' 
              ? 'Enter your mobile number to sign in, save delivery addresses, and track past orders.' 
              : `We sent a 6-digit code for ${phone} via WhatsApp.`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: PHONE INPUT */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                Mobile Number (Pakistan)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="0309-5369472"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-zinc-500 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                />
                <Phone className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Works with any Pakistani mobile network (Jazz, Zong, Telenor, Ufone).
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Sending Code...' : 'Continue with WhatsApp'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            
            {/* Quick Autofill Helper for Testing */}
            {sentCode && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp Code:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCode(sentCode)}
                    className="font-extrabold text-xs px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                  >
                    Autofill ({sentCode})
                  </button>
                </div>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[11px] text-emerald-400 hover:underline pt-0.5"
                  >
                    Tap here to view on WhatsApp &rarr;
                  </a>
                )}
              </div>
            )}

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

            {/* Optional Name & Address for First-time setup */}
            <div className="space-y-2.5 pt-1">
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
                onClick={() => setStep('phone')}
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
