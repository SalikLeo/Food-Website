import React, { useState, useEffect } from 'react';
import {
  Truck,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function DeliverySettingsManager({ onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [deliveryFee, setDeliveryFee] = useState(100);
  const [minOrder, setMinOrder] = useState(500);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(0);
  const [deliveryNotice, setDeliveryNotice] = useState(
    'Delivery available in nearby areas (Shaikh Chowk, Itfaq Town, Mansoora, Multan Road)'
  );

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data) {
        if (typeof data.deliveryFee === 'number') setDeliveryFee(data.deliveryFee);
        if (typeof data.minOrder === 'number') setMinOrder(data.minOrder);
        if (typeof data.freeDeliveryThreshold === 'number')
          setFreeDeliveryThreshold(data.freeDeliveryThreshold);
        if (data.deliveryNotice) setDeliveryNotice(data.deliveryNotice);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setErrorMessage('Could not load current settings from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryFee: Math.max(0, Number(deliveryFee) || 0),
          minOrder: Math.max(0, Number(minOrder) || 0),
          freeDeliveryThreshold: Math.max(0, Number(freeDeliveryThreshold) || 0),
          deliveryNotice: deliveryNotice.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Delivery Fee updated to Rs. ${deliveryFee} successfully!`);
        if (onRefresh) onRefresh();
        setTimeout(() => setSuccessMessage(''), 4000);
      } else {
        setErrorMessage(data.error || 'Failed to save settings.');
      }
    } catch (err) {
      setErrorMessage('Network error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const presets = [
    { label: 'Free Delivery', value: 0 },
    { label: 'Rs. 50', value: 50 },
    { label: 'Rs. 80', value: 80 },
    { label: 'Rs. 100 (Standard)', value: 100 },
    { label: 'Rs. 150 (Distant Areas)', value: 150 },
    { label: 'Rs. 200 (Long Distance)', value: 200 },
    { label: 'Rs. 250 (Express / Outer)', value: 250 }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
              <span>Delivery Fee & Distance Rates</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                Live on Storefront
              </span>
            </h2>
            <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
              Adjust your base delivery charges and minimum order values. Changes update the cart total, customer checkout, and WhatsApp order messages instantly.
            </p>
          </div>
        </div>

        {/* Current Active Badge */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-5 py-3 text-right w-full md:w-auto flex-shrink-0">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold block">
            Current Delivery Charge
          </span>
          <span className="font-display text-2xl text-orange-600 font-bold">
            {deliveryFee === 0 ? 'FREE' : `Rs. ${Number(deliveryFee).toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Standard Delivery Fee */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-4">
            <div>
              <label className="text-sm font-bold text-zinc-900 block mb-1">
                Standard Base Delivery Fee (Rs.)
              </label>
              <p className="text-xs text-zinc-500">
                This is the standard delivery amount charged on every customer order.
              </p>
            </div>

            <div className="relative max-w-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-600">
                Rs.
              </span>
              <input
                type="number"
                min="0"
                step="10"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 font-bold text-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
                placeholder="100"
                required
              />
            </div>

            {/* Quick 1-Click Presets */}
            <div>
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                Quick Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => {
                  const isSelected = Number(deliveryFee) === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setDeliveryFee(p.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-600 text-white border border-orange-600 shadow-xs'
                          : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Minimum Order Limit */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-4">
            <div>
              <label className="text-sm font-bold text-zinc-900 block mb-1">
                Minimum Order Amount for Delivery (Rs.)
              </label>
              <p className="text-xs text-zinc-500">
                Customers must meet this subtotal threshold to qualify for home delivery.
              </p>
            </div>

            <div className="relative max-w-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600">
                Rs.
              </span>
              <input
                type="number"
                min="0"
                step="50"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 font-bold text-base focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
                placeholder="500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[0, 300, 500, 750, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setMinOrder(amt)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    Number(minOrder) === amt
                      ? 'bg-amber-600 text-white border border-amber-600 shadow-xs'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}
                >
                  {amt === 0 ? 'No Minimum' : `Rs. ${amt}`}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Optional Free Delivery Threshold */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-4">
            <div>
              <label className="text-sm font-bold text-zinc-900 block mb-1">
                Free Delivery Above Subtotal (Optional)
              </label>
              <p className="text-xs text-zinc-500">
                Automatically waive delivery charges if the customer orders above this amount. Set to 0 to disable.
              </p>
            </div>

            <div className="relative max-w-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">
                Rs.
              </span>
              <input
                type="number"
                min="0"
                step="100"
                value={freeDeliveryThreshold}
                onChange={(e) => setFreeDeliveryThreshold(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 font-bold text-base focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
                placeholder="0 (Disabled)"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[0, 1500, 2000, 2500, 3000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setFreeDeliveryThreshold(amt)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    Number(freeDeliveryThreshold) === amt
                      ? 'bg-emerald-600 text-white border border-emerald-600 shadow-xs'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}
                >
                  {amt === 0 ? 'Disabled' : `Free above Rs. ${amt}`}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Delivery Notice */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-3">
            <label className="text-sm font-bold text-zinc-900 block">
              Delivery Policy & Area Notice
            </label>
            <p className="text-xs text-zinc-500">
              This note is shown on checkout and store contact info to inform customers about delivery areas and variable charges.
            </p>
            <textarea
              rows="2"
              value={deliveryNotice}
              onChange={(e) => setDeliveryNotice(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs resize-none"
              placeholder="e.g. Delivery available in nearby areas. Rates may vary for distant areas."
            />
          </div>

          {/* Save Button Row */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Delivery Settings'}</span>
            </button>

            <button
              type="button"
              onClick={fetchSettings}
              disabled={loading || saving}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>

        </div>

        {/* Right Column: Live Customer Preview & Operational Guidelines */}
        <div className="space-y-6">
          
          {/* Live Preview Box */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Customer Cart Live Preview</span>
            </div>

            <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 text-zinc-900 space-y-3 shadow-2xs">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 pb-2 border-b border-zinc-200">
                Order Summary
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Sample Food Items</span>
                  <span className="font-semibold text-zinc-900">Rs. 1,450</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Delivery Fee</span>
                  <span className="font-bold text-orange-600">
                    {Number(deliveryFee) === 0 ? 'FREE' : `Rs. ${Number(deliveryFee).toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-zinc-200 text-sm">
                  <span className="font-display uppercase text-zinc-900 font-bold">TOTAL</span>
                  <span className="font-display text-xl text-orange-600 font-bold">
                    Rs. {(1450 + (Number(deliveryFee) || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {Number(minOrder) > 0 && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-tight">
                  <span className="font-bold">Min Order: </span>
                  Rs. {Number(minOrder).toLocaleString()} for home delivery
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-200/60 text-xs text-zinc-600 space-y-1.5">
              <div className="flex items-center gap-2 text-zinc-800 font-semibold">
                <Info className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <span>How this works</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                When you change the delivery fee here and click <strong>Save</strong>, the new amount is immediately saved to the store database. Any customer opening the cart, web order form, or WhatsApp order generator will see this new rate.
              </p>
            </div>
          </div>

          {/* Operational Guidance Card for Varying Rates */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-600" />
              <span>Variable Distance Delivery Tips</span>
            </h3>
            <ul className="text-xs text-zinc-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>
                  <strong>Standard nearby areas</strong> (Itfaq Town, Shaikh Chowk, Mansoora) can use the default fee (e.g. Rs. 100).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>
                  <strong>Distant orders</strong>: You can adjust the delivery fee on individual customer orders directly in the <strong>Customer Orders</strong> tab before confirming.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>
                  <strong>Rainy / High Demand</strong>: Easily increase the base fee here by Rs. 50 or Rs. 100 during peak delivery rush.
                </span>
              </li>
            </ul>
          </div>

        </div>

      </form>
    </div>
  );
}
