import React, { useState, useMemo } from 'react';
import { 
  Bike, 
  Phone, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  X, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Package, 
  Copy, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { apiUrl } from '../../config/api';

export default function RidersManager({
  riders = [],
  orders = [],
  onRefresh
}) {
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRider, setEditingRider] = useState(null);
  const [deletingRider, setDeletingRider] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Compute active orders & total deliveries per rider
  const riderStats = useMemo(() => {
    const stats = {};
    riders.forEach(r => {
      stats[r.id] = {
        activeOrders: [],
        completedCount: 0
      };
    });

    (orders || []).forEach(o => {
      if (o.riderId && stats[o.riderId]) {
        if (o.status === 'Out for Delivery') {
          stats[o.riderId].activeOrders.push(o);
        } else if (o.status === 'Delivered') {
          stats[o.riderId].completedCount += 1;
        }
      }
    });

    return stats;
  }, [riders, orders]);

  // Filter riders by search query
  const filteredRiders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return riders;
    return riders.filter(r => 
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.phone && r.phone.includes(q))
    );
  }, [riders, search]);

  const handleCopyPhone = (riderId, phone) => {
    try {
      navigator.clipboard.writeText(phone);
      setCopiedId(riderId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const openAddModal = () => {
    setFormData({ name: '', phone: '' });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (rider) => {
    setEditingRider(rider);
    setFormData({ name: rider.name || '', phone: rider.phone || '' });
    setFormError('');
  };

  const handleSaveRider = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanName = (formData.name || '').trim();
    const cleanPhone = (formData.phone || '').replace(/\D/g, '').slice(0, 11);

    if (!cleanName) {
      setFormError('Rider name is required.');
      return;
    }

    if (!cleanPhone || cleanPhone.length !== 11) {
      setFormError('Phone number must be 11 digits (e.g. 03001234567).');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEdit = Boolean(editingRider);
      const riderId = isEdit ? editingRider.id : `rider-${Date.now()}`;
      const riderObj = {
        id: riderId,
        name: cleanName,
        phone: cleanPhone,
        createdAt: isEdit ? editingRider.createdAt : new Date().toISOString()
      };

      // 1. Immediately update localStorage cache
      try {
        const saved = localStorage.getItem('salik_riders');
        let list = saved ? JSON.parse(saved) : [];
        if (isEdit) {
          list = list.map(r => (r.id === riderId ? { ...r, ...riderObj } : r));
        } else {
          list.push(riderObj);
        }
        localStorage.setItem('salik_riders', JSON.stringify(list));
      } catch (e) {
        console.error('LocalStorage write error:', e);
      }

      // 2. Sync to Backend API
      const endpoint = isEdit ? apiUrl(`/api/riders/${editingRider.id}`) : apiUrl('/api/riders');
      const method = isEdit ? 'PUT' : 'POST';

      try {
        const res = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cleanName, phone: cleanPhone })
        });

        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.rider) {
            try {
              const saved = localStorage.getItem('salik_riders');
              let list = saved ? JSON.parse(saved) : [];
              list = list.map(r => (r.id === riderId || r.id === data.rider.id ? data.rider : r));
              localStorage.setItem('salik_riders', JSON.stringify(list));
            } catch {}
          }
        }
      } catch (apiErr) {
        console.warn('Backend sync delayed (saved locally):', apiErr);
      }

      setIsAddModalOpen(false);
      setEditingRider(null);
      if (typeof onRefresh === 'function') {
        onRefresh();
      }
      window.dispatchEvent(new CustomEvent('salik_sync_riders'));
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving rider.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRider = async () => {
    if (!deletingRider) return;

    // Check if this rider is currently assigned to active deliveries
    const activeDeliveries = (orders || []).filter(
      o => o.riderId === deletingRider.id && o.status === 'Out for Delivery'
    );

    if (activeDeliveries.length > 0) {
      alert(
        `Cannot delete "${deletingRider.name}" because they have ${activeDeliveries.length} active delivery parcel${
          activeDeliveries.length > 1 ? 's' : ''
        } (Out for Delivery).\n\nPlease complete or reassign their orders before deleting.`
      );
      setDeletingRider(null);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Remove from localStorage immediately
      try {
        const saved = localStorage.getItem('salik_riders');
        if (saved) {
          const list = JSON.parse(saved).filter(r => r.id !== deletingRider.id);
          localStorage.setItem('salik_riders', JSON.stringify(list));
        }
      } catch (e) {
        console.error(e);
      }

      // 2. Delete on backend
      try {
        const res = await fetch(apiUrl(`/api/riders/${deletingRider.id}`), {
          method: 'DELETE'
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data && data.error) {
            console.warn('Backend delete error:', data.error);
          }
        }
      } catch (apiErr) {
        console.warn('Backend delete sync delayed:', apiErr);
      }

      setDeletingRider(null);
      if (typeof onRefresh === 'function') {
        onRefresh();
      }
      window.dispatchEvent(new CustomEvent('salik_sync_riders'));
    } catch (err) {
      alert(err.message || 'Failed to delete rider');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Bike className="w-4 h-4" />
              </div>
              <span>Delivery Riders Management</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Add riders and track active parcel deliveries. One rider can handle multiple orders simultaneously.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm active:scale-98 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Rider</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search riders by name or phone number..."
            className="w-full pl-10 pr-9 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Riders Grid / List */}
      {filteredRiders.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-zinc-200 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
            <Bike className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-900">
              {search ? 'No Matching Riders Found' : 'No Delivery Riders Added Yet'}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {search
                ? `No riders match "${search}". Try searching for another name or number.`
                : 'Add your delivery riders here. When an order is Out for Delivery, you can select which rider is delivering it.'}
            </p>
          </div>
          {!search && (
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Rider</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredRiders.map((rider) => {
            const stats = riderStats[rider.id] || { activeOrders: [], completedCount: 0 };
            const activeCount = stats.activeOrders.length;
            const completedCount = stats.completedCount;

            return (
              <div
                key={rider.id}
                className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3.5"
              >
                {/* Rider Top Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
                      {rider.name
                        ? rider.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                        : 'RD'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-zinc-900 truncate">
                        {rider.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-orange-600 shrink-0" />
                        <a
                          href={`tel:${rider.phone}`}
                          className="text-xs font-semibold text-zinc-700 hover:text-orange-600 hover:underline tracking-wide truncate"
                          title="Click to call rider"
                        >
                          {rider.phone}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(rider.id, rider.phone)}
                          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                          title="Copy phone number"
                        >
                          {copiedId === rider.id ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(rider)}
                      className="p-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                      title="Edit rider"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingRider(rider)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        activeCount > 0
                          ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700'
                          : 'bg-zinc-50 hover:bg-red-50 border-zinc-200 hover:border-red-200 text-zinc-500 hover:text-red-600'
                      }`}
                      title={activeCount > 0 ? `Cannot delete: ${activeCount} active parcel${activeCount > 1 ? 's' : ''} on way` : 'Delete rider'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Delivery Status & Stats Pills */}
                <div className="pt-2 border-t border-zinc-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[11px] font-medium">Active Deliveries:</span>
                    {activeCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold border border-purple-200 animate-pulse">
                        <Bike className="w-3 h-3 text-purple-700" />
                        <span>{activeCount} {activeCount === 1 ? 'Parcel On Way' : 'Parcels On Way'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[11px] font-medium border border-zinc-200">
                        Available / Idle
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 text-[11px] font-medium">Total Delivered:</span>
                    <span className="font-bold text-zinc-900">
                      {completedCount} {completedCount === 1 ? 'order' : 'orders'}
                    </span>
                  </div>

                  {/* If active orders exist, show order badges */}
                  {activeCount > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                        Current Parcels:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {stats.activeOrders.map((ao) => (
                          <span
                            key={ao.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 text-[11px] font-bold border border-purple-200"
                            title={`Customer: ${ao.customerName || 'Customer'} • Rs. ${ao.total}`}
                          >
                            <Package className="w-3 h-3 text-purple-600" />
                            <span>#{ao.id}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Call Button */}
                <div className="pt-1">
                  <a
                    href={`tel:${rider.phone}`}
                    className="w-full py-2 px-3 rounded-xl bg-zinc-100 hover:bg-orange-50 hover:text-orange-700 border border-zinc-200 hover:border-orange-200 text-zinc-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    <Phone className="w-3.5 h-3.5 text-orange-600" />
                    <span>Call Rider ({rider.phone})</span>
                  </a>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT RIDER MODAL */}
      {(isAddModalOpen || editingRider) && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isSubmitting) {
              setIsAddModalOpen(false);
              setEditingRider(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95 duration-150 text-left my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    {editingRider ? 'Edit Delivery Rider' : 'Add New Delivery Rider'}
                  </h3>
                  <span className="text-xs text-zinc-500">
                    {editingRider ? 'Update rider contact information' : 'Rider can be assigned to multiple orders'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingRider(null);
                }}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveRider} className="space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              {/* Rider Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Rider Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ali Raza, Naveed Ahmed"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
                />
              </div>

              {/* Rider Phone */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Rider Phone *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  required
                  value={formData.phone}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setFormData({ ...formData, phone: clean });
                  }}
                  placeholder="03001234567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingRider(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm active:scale-98 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingRider ? 'Save Changes' : 'Add Rider'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingRider && (() => {
        const activeOrdersList = (orders || []).filter(
          o => o.riderId === deletingRider.id && o.status === 'Out for Delivery'
        );
        const hasActiveDeliveries = activeOrdersList.length > 0;

        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => {
              if (!isSubmitting) setDeletingRider(null);
            }}
          >
            <div
              className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95 duration-150 text-center my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
                hasActiveDeliveries
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {hasActiveDeliveries ? (
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                ) : (
                  <Trash2 className="w-6 h-6" />
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-zinc-900">
                  {hasActiveDeliveries ? 'Cannot Delete Rider' : `Delete Rider "${deletingRider.name}"?`}
                </h3>

                {hasActiveDeliveries ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-1.5">
                    <p className="text-xs text-amber-900 font-bold flex items-center gap-1.5">
                      <span>⚠️ {activeOrdersList.length} Active {activeOrdersList.length === 1 ? 'Delivery' : 'Deliveries'} in Progress</span>
                    </p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      <strong>{deletingRider.name}</strong> is currently assigned to order{activeOrdersList.length > 1 ? 's' : ''} (<strong>{activeOrdersList.map(o => `#${o.id}`).join(', ')}</strong>) that {activeOrdersList.length > 1 ? 'are' : 'is'} <strong>Out for Delivery</strong>.
                    </p>
                    <p className="text-[11px] text-zinc-600 font-medium pt-0.5">
                      Please mark these orders as Delivered or reassign them to another rider before deleting.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Are you sure you want to delete <strong>{deletingRider.name}</strong>? This action cannot be undone.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-2">
                {hasActiveDeliveries ? (
                  <button
                    type="button"
                    onClick={() => setDeletingRider(null)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-900 text-white font-bold text-xs transition-colors cursor-pointer active:scale-98"
                  >
                    Got It, Keep Rider
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setDeletingRider(null)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleDeleteRider}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <span>Yes, Delete</span>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
