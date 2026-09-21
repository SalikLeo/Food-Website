import React, { useState } from 'react';
import { X, User, Phone, MapPin, Mail, LogOut, Check, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export default function CustomerProfileModal() {
  const { user, profileModalOpen, setProfileModalOpen, updateProfile, logout } = useCustomerAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [addresses, setAddresses] = useState(user?.addresses || []);
  const [newAddress, setNewAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!profileModalOpen || !user) return null;

  const handleAddAddress = () => {
    if (!newAddress.trim()) return;
    setAddresses(prev => [newAddress.trim(), ...prev]);
    setNewAddress('');
  };

  const handleRemoveAddress = (idx) => {
    setAddresses(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await updateProfile({ name, email, phone, addresses });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div 
        onClick={() => setProfileModalOpen(false)} 
        className="fixed inset-0" 
      />

      <div className="relative w-full max-w-md bg-[#16161b] text-white border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 max-h-[90vh] overflow-y-auto animate-scale-in">
        
        {/* Close Button */}
        <button
          onClick={() => setProfileModalOpen(false)}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white font-bold text-xl flex items-center justify-center shadow-md flex-shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'S')}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-display uppercase tracking-wide font-bold text-white truncate">
              {user.name || 'Customer Profile'}
            </h3>
            <span className="text-xs text-zinc-400 truncate block">
              {user.email || user.phone}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>Profile updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
              <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                Verified Email
              </label>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified</span>
              </span>
            </div>
            <div className="relative">
              <input
                type="email"
                disabled
                value={user.email || email}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-zinc-400 text-sm cursor-not-allowed"
              />
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
              Delivery Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0309-5369472"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-sans focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
              />
              <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-[11px] text-zinc-500 mt-1 block">
              Rider will contact this number when your food is on the way.
            </span>
          </div>

          {/* Delivery Addresses */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
              Saved Delivery Addresses
            </label>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Add new address (e.g. Street 4, Wah Model Town)"
                className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
              <button
                type="button"
                onClick={handleAddAddress}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {addresses.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No saved addresses yet.</p>
              ) : (
                addresses.map((addr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/5 text-xs text-zinc-300"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                      <span className="truncate">{addr}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAddress(idx)}
                      className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={logout}
              className="px-4 py-3 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
