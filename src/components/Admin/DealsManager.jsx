import React, { useState } from 'react';
import { Edit2, Check, ShoppingBag, Plus } from 'lucide-react';

export default function DealsManager({ deals = [], familyDeal = null, onRefresh }) {
  const [editingDeal, setEditingDeal] = useState(null);
  const [priceInput, setPriceInput] = useState('');
  const [includesInput, setIncludesInput] = useState('');

  const openEdit = (deal) => {
    setEditingDeal(deal);
    setPriceInput(deal.price);
    setIncludesInput((deal.includes || []).join(', '));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingDeal) return;

    const includes = includesInput.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      price: Number(priceInput),
      includes
    };

    try {
      const res = await fetch(`/api/deals/${editingDeal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingDeal(null);
        onRefresh();
      } else {
        alert('Failed to update deal');
      }
    } catch {
      alert('Error updating deal');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl uppercase tracking-wide text-zinc-900">
          Manage Combo Deals & Bundles
        </h3>
        <span className="text-xs text-zinc-500 font-medium">
          Total Deals: {deals.length + (familyDeal ? 1 : 0)}
        </span>
      </div>

      {/* Family Deal Highlight */}
      {familyDeal && (
        <div className="bg-white border border-orange-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-4">
            <img
              src={familyDeal.image}
              alt="Family Deal"
              className="w-16 h-16 rounded-xl object-contain bg-zinc-50 border border-zinc-200"
              onError={(e) => { e.target.src = '/assets/deal-family.png'; }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-xl text-zinc-900">Family Deal</span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] uppercase">
                  Family Bundle
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                {(familyDeal.includes || []).join(' • ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <span className="font-display text-2xl text-orange-600 font-bold">
              Rs. {familyDeal.price?.toLocaleString()}
            </span>
            <button
              onClick={() => openEdit(familyDeal)}
              className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-xs font-semibold text-zinc-700 hover:text-zinc-900 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-orange-600" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      )}

      {/* 11 Combo Deals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xs hover:border-zinc-300 p-4 flex flex-col justify-between space-y-3 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded bg-orange-600 text-white font-extrabold text-[10px] uppercase shadow-2xs">
                DEAL {deal.number || deal.id.replace('deal-', '')}
              </span>
              <span className="font-display text-lg text-orange-600 font-bold">
                Rs. {deal.price?.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={deal.image}
                alt={deal.name}
                className="w-16 h-16 object-contain bg-zinc-50 rounded-xl p-1 border border-zinc-200 flex-shrink-0"
                onError={(e) => { e.target.src = '/assets/deal-1.png'; }}
              />
              <ul className="space-y-1 text-xs text-zinc-700">
                {(deal.includes || []).map((it, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 line-clamp-1">
                    <Check className="w-3 h-3 text-orange-600 flex-shrink-0" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => openEdit(deal)}
              className="w-full py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 hover:text-zinc-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-orange-600" />
              <span>Edit Deal Details</span>
            </button>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingDeal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 max-w-md w-full text-zinc-900 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-display text-2xl uppercase tracking-wide mb-4 text-zinc-900">
              Edit {editingDeal.name || editingDeal.id}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Price (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Included Items (comma separated)
                </label>
                <textarea
                  rows={3}
                  value={includesInput}
                  onChange={(e) => setIncludesInput(e.target.value)}
                  placeholder="e.g. 1 Zinger Burger, 1 Patty Burger, 1 Coke 500ml"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-900 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setEditingDeal(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-wider shadow cursor-pointer transition-all"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
