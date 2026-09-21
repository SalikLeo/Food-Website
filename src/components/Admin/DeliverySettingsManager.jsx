import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  AlertCircle,
  CheckCircle2,
  Save,
  Smartphone,
  Monitor,
  ArrowUp,
  Sliders,
  Flame,
  Check,
  Package,
  ShoppingBag
} from 'lucide-react';
import WhatsAppIcon from '../WhatsAppIcon';
import { apiUrl } from '../../config/api';

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

  const [floatingButtons, setFloatingButtons] = useState({
    whatsappWeb: true,
    whatsappMobile: true,
    backToTopWeb: true,
    backToTopMobile: true,
    cartWeb: true,
    cartMobile: true
  });

  // Best Sellers eligible categories state
  const [bestSellerCategories, setBestSellerCategories] = useState(['pizza', 'burgers']);
  const [allCategories, setAllCategories] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [settingsRes, catsRes, prodsRes, ordersRes] = await Promise.all([
        fetch(apiUrl('/api/settings')).then((r) => r.json()),
        fetch(apiUrl('/api/categories')).then((r) => r.json()).catch(() => []),
        fetch(apiUrl('/api/products')).then((r) => r.json()).catch(() => []),
        fetch(apiUrl('/api/orders')).then((r) => r.json()).catch(() => [])
      ]);

      if (settingsRes) {
        if (typeof settingsRes.deliveryFee === 'number') setDeliveryFee(settingsRes.deliveryFee);
        if (typeof settingsRes.minOrder === 'number') setMinOrder(settingsRes.minOrder);
        if (typeof settingsRes.freeDeliveryThreshold === 'number')
          setFreeDeliveryThreshold(settingsRes.freeDeliveryThreshold);
        if (settingsRes.deliveryNotice) setDeliveryNotice(settingsRes.deliveryNotice);
        if (settingsRes.floatingButtons) {
          setFloatingButtons({
            whatsappWeb: settingsRes.floatingButtons.whatsappWeb !== false,
            whatsappMobile: settingsRes.floatingButtons.whatsappMobile !== false,
            backToTopWeb: settingsRes.floatingButtons.backToTopWeb !== false,
            backToTopMobile: settingsRes.floatingButtons.backToTopMobile !== false,
            cartWeb: settingsRes.floatingButtons.cartWeb !== false,
            cartMobile: settingsRes.floatingButtons.cartMobile !== false
          });
        }
        if (Array.isArray(settingsRes.bestSellerCategories) && settingsRes.bestSellerCategories.length > 0) {
          setBestSellerCategories(settingsRes.bestSellerCategories);
        }
      }

      if (Array.isArray(catsRes)) setAllCategories(catsRes);
      if (Array.isArray(prodsRes)) setProductsList(prodsRes);
      if (Array.isArray(ordersRes)) setOrdersList(ordersRes);
    } catch (err) {
      console.error('Error fetching settings & categories:', err);
      setErrorMessage('Could not load current settings from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Live preview calculation of top 4 best sellers based on selected categories
  const previewBestSellers = useMemo(() => {
    const allowed = (bestSellerCategories || []).map((c) => c.toLowerCase());
    const salesMap = {};
    (ordersList || []).forEach((order) => {
      if (order.status === 'Cancelled') return;
      (order.items || []).forEach((item) => {
        const name = (item.name || '').trim().toLowerCase();
        if (!name) return;
        salesMap[name] = (salesMap[name] || 0) + (Number(item.quantity) || 1);
      });
    });

    const eligible = (productsList || []).filter((p) => {
      const cat = (p.category || '').toLowerCase();
      return allowed.includes(cat);
    });

    const ranked = eligible.map((p) => {
      const pName = (p.name || '').trim().toLowerCase();
      let sales = 0;
      Object.keys(salesMap).forEach((k) => {
        if (k === pName || k.includes(pName) || pName.includes(k)) {
          sales += salesMap[k];
        }
      });
      return { ...p, salesCount: sales };
    });

    ranked.sort((a, b) => {
      if (b.salesCount !== a.salesCount) return b.salesCount - a.salesCount;
      if (b.popular && !a.popular) return 1;
      if (!b.popular && a.popular) return -1;
      return 0;
    });

    return ranked.slice(0, 4);
  }, [bestSellerCategories, productsList, ordersList]);

  const toggleCategory = (catId) => {
    const id = catId.toLowerCase();
    setBestSellerCategories((prev) => {
      if (prev.includes(id)) {
        // Keep at least one category selected
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch(apiUrl('/api/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryFee: Math.max(0, Number(deliveryFee) || 0),
          minOrder: Math.max(0, Number(minOrder) || 0),
          freeDeliveryThreshold: Math.max(0, Number(freeDeliveryThreshold) || 0),
          deliveryNotice: deliveryNotice.trim(),
          floatingButtons: {
            whatsappWeb: Boolean(floatingButtons.whatsappWeb),
            whatsappMobile: Boolean(floatingButtons.whatsappMobile),
            backToTopWeb: Boolean(floatingButtons.backToTopWeb),
            backToTopMobile: Boolean(floatingButtons.backToTopMobile),
            cartWeb: Boolean(floatingButtons.cartWeb),
            cartMobile: Boolean(floatingButtons.cartMobile)
          },
          bestSellerCategories: bestSellerCategories
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage('Delivery, Floating Buttons & Best Sellers settings updated successfully!');
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
          <span className="font-display text-2xl text-orange-600 font-bold flex items-baseline md:justify-end">
            {Number(deliveryFee) === 0 ? (
              'FREE'
            ) : (
              <>
                <span className="font-sans font-bold text-base mr-1">Rs.</span>
                <span>{Number(deliveryFee).toLocaleString()}</span>
              </>
            )}
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

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Section 1: Standard Delivery Fee */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <label className="text-sm font-bold text-zinc-900 block mb-1">
                Standard Base Delivery Fee (Rs.)
              </label>
              <p className="text-xs text-zinc-500">
                This is the standard delivery amount charged on every customer order.
              </p>
            </div>

            <div className="relative w-full max-w-sm">
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

            {/* Quick Presets */}
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
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <label className="text-sm font-bold text-zinc-900 block mb-1">
                Minimum Order Amount for Delivery (Rs.)
              </label>
              <p className="text-xs text-zinc-500">
                Customers must meet this subtotal threshold to qualify for home delivery.
              </p>
            </div>

            <div className="relative w-full max-w-sm">
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

            <div>
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                Quick Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                {[0, 300, 500, 750, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setMinOrder(amt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
          </div>

          {/* Section 3: Optional Free Delivery Threshold */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <label className="text-sm font-bold text-zinc-900 block mb-1">
                Free Delivery Above Subtotal (Optional)
              </label>
              <p className="text-xs text-zinc-500">
                Automatically waive delivery charges if the customer orders above this amount. Set to 0 to disable.
              </p>
            </div>

            <div className="relative w-full max-w-sm">
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

            <div>
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                Quick Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                {[0, 1500, 2000, 2500, 3000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setFreeDeliveryThreshold(amt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
          </div>

          {/* Section 4: Delivery Notice */}
          <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <label className="text-sm font-bold text-zinc-900 block mb-1">
                Delivery Policy & Area Notice
              </label>
              <p className="text-xs text-zinc-500">
                This note is shown on checkout and store contact info to inform customers about delivery areas and variable charges.
              </p>
            </div>
            <textarea
              rows="4"
              value={deliveryNotice}
              onChange={(e) => setDeliveryNotice(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs resize-none"
              placeholder="e.g. Delivery available in nearby areas (Wah Model Town, Wah Cantt). Rates may vary for distant areas."
            />
            <div className="text-[11px] text-zinc-400">
              Customers can view this notice during online ordering.
            </div>
          </div>

        </div>

        {/* Section 5: Storefront Floating Action Buttons (WhatsApp & Move to Top) */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center flex-shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Storefront Floating Action Buttons
                </h3>
                <p className="text-xs text-zinc-500">
                  Independent controls to hide or show floating buttons on Desktop (Web) vs Mobile views.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 self-start sm:self-auto">
              Storefront Display Controls
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* 1. Floating Cart Button */}
            <div className="p-5 rounded-2xl bg-zinc-50/80 border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs border border-zinc-700">
                    <ShoppingBag className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900">
                      Floating Cart Button
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Bottom-right floating cart drawer button
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    floatingButtons.cartWeb || floatingButtons.cartMobile
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-zinc-200 text-zinc-600 border-zinc-300'
                  }`}
                >
                  {floatingButtons.cartWeb && floatingButtons.cartMobile
                    ? 'Active (All Devices)'
                    : floatingButtons.cartWeb
                    ? 'Web View Only'
                    : floatingButtons.cartMobile
                    ? 'Mobile View Only'
                    : 'Hidden on All'}
                </span>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                {/* Web View Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-800 block">Web / Desktop View</span>
                      <span className="text-[10px] text-zinc-400">Screens 640px and wider</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[11px] font-bold tracking-wider transition-colors ${
                        floatingButtons.cartWeb ? 'text-emerald-600' : 'text-zinc-400'
                      }`}
                    >
                      {floatingButtons.cartWeb ? 'ON' : 'OFF'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={floatingButtons.cartWeb}
                      onClick={() =>
                        setFloatingButtons((prev) => ({ ...prev, cartWeb: !prev.cartWeb }))
                      }
                      className={`w-12 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ease-in-out focus:outline-none shadow-inner ${
                        floatingButtons.cartWeb ? 'bg-emerald-500' : 'bg-zinc-300'
                      }`}
                      aria-label="Toggle Cart Button on Web"
                    >
                      <div
                        className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                          floatingButtons.cartWeb ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Mobile View Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-800 block">Mobile Phone View</span>
                      <span className="text-[10px] text-zinc-400">Mobile phones & small screens</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[11px] font-bold tracking-wider transition-colors ${
                        floatingButtons.cartMobile ? 'text-emerald-600' : 'text-zinc-400'
                      }`}
                    >
                      {floatingButtons.cartMobile ? 'ON' : 'OFF'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={floatingButtons.cartMobile}
                      onClick={() =>
                        setFloatingButtons((prev) => ({
                          ...prev,
                          cartMobile: !prev.cartMobile
                        }))
                      }
                      className={`w-12 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ease-in-out focus:outline-none shadow-inner ${
                        floatingButtons.cartMobile ? 'bg-emerald-500' : 'bg-zinc-300'
                      }`}
                      aria-label="Toggle Cart Button on Mobile"
                    >
                      <div
                        className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                          floatingButtons.cartMobile ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. WhatsApp Floating Chat Button */}
            <div className="p-5 rounded-2xl bg-zinc-50/80 border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-xs">
                    <WhatsAppIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900">
                      WhatsApp Chat Button
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Bottom-right direct WhatsApp ordering button
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    floatingButtons.whatsappWeb || floatingButtons.whatsappMobile
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-zinc-200 text-zinc-600 border-zinc-300'
                  }`}
                >
                  {floatingButtons.whatsappWeb && floatingButtons.whatsappMobile
                    ? 'Active (All Devices)'
                    : floatingButtons.whatsappWeb
                    ? 'Web View Only'
                    : floatingButtons.whatsappMobile
                    ? 'Mobile View Only'
                    : 'Hidden on All'}
                </span>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                {/* Web View Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-800 block">Web / Desktop View</span>
                      <span className="text-[10px] text-zinc-400">Screens 640px and wider</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[11px] font-bold tracking-wider transition-colors ${
                        floatingButtons.whatsappWeb ? 'text-emerald-600' : 'text-zinc-400'
                      }`}
                    >
                      {floatingButtons.whatsappWeb ? 'ON' : 'OFF'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={floatingButtons.whatsappWeb}
                      onClick={() =>
                        setFloatingButtons((prev) => ({ ...prev, whatsappWeb: !prev.whatsappWeb }))
                      }
                      className={`w-12 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ease-in-out focus:outline-none shadow-inner ${
                        floatingButtons.whatsappWeb ? 'bg-emerald-500' : 'bg-zinc-300'
                      }`}
                      aria-label="Toggle WhatsApp on Web"
                    >
                      <div
                        className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                          floatingButtons.whatsappWeb ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Mobile View Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-800 block">Mobile Phone View</span>
                      <span className="text-[10px] text-zinc-400">Mobile phones & small screens</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[11px] font-bold tracking-wider transition-colors ${
                        floatingButtons.whatsappMobile ? 'text-emerald-600' : 'text-zinc-400'
                      }`}
                    >
                      {floatingButtons.whatsappMobile ? 'ON' : 'OFF'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={floatingButtons.whatsappMobile}
                      onClick={() =>
                        setFloatingButtons((prev) => ({
                          ...prev,
                          whatsappMobile: !prev.whatsappMobile
                        }))
                      }
                      className={`w-12 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ease-in-out focus:outline-none shadow-inner ${
                        floatingButtons.whatsappMobile ? 'bg-emerald-500' : 'bg-zinc-300'
                      }`}
                      aria-label="Toggle WhatsApp on Mobile"
                    >
                      <div
                        className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                          floatingButtons.whatsappMobile ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Move to Top Floating Button */}
            <div className="p-5 rounded-2xl bg-zinc-50/80 border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
                    <ArrowUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900">
                      Move to Top (Back to Top)
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Floating orange smooth scroll button
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    floatingButtons.backToTopWeb || floatingButtons.backToTopMobile
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-zinc-200 text-zinc-600 border-zinc-300'
                  }`}
                >
                  {floatingButtons.backToTopWeb && floatingButtons.backToTopMobile
                    ? 'Active (All Devices)'
                    : floatingButtons.backToTopWeb
                    ? 'Web View Only'
                    : floatingButtons.backToTopMobile
                    ? 'Mobile View Only'
                    : 'Hidden on All'}
                </span>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                {/* Web View Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-800 block">Web / Desktop View</span>
                      <span className="text-[10px] text-zinc-400">Screens 640px and wider</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[11px] font-bold tracking-wider transition-colors ${
                        floatingButtons.backToTopWeb ? 'text-emerald-600' : 'text-zinc-400'
                      }`}
                    >
                      {floatingButtons.backToTopWeb ? 'ON' : 'OFF'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={floatingButtons.backToTopWeb}
                      onClick={() =>
                        setFloatingButtons((prev) => ({
                          ...prev,
                          backToTopWeb: !prev.backToTopWeb
                        }))
                      }
                      className={`w-12 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ease-in-out focus:outline-none shadow-inner ${
                        floatingButtons.backToTopWeb ? 'bg-emerald-500' : 'bg-zinc-300'
                      }`}
                      aria-label="Toggle Back to Top on Web"
                    >
                      <div
                        className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                          floatingButtons.backToTopWeb ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Mobile View Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-800 block">Mobile Phone View</span>
                      <span className="text-[10px] text-zinc-400">Mobile phones & small screens</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[11px] font-bold tracking-wider transition-colors ${
                        floatingButtons.backToTopMobile ? 'text-emerald-600' : 'text-zinc-400'
                      }`}
                    >
                      {floatingButtons.backToTopMobile ? 'ON' : 'OFF'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={floatingButtons.backToTopMobile}
                      onClick={() =>
                        setFloatingButtons((prev) => ({
                          ...prev,
                          backToTopMobile: !prev.backToTopMobile
                        }))
                      }
                      className={`w-12 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ease-in-out focus:outline-none shadow-inner ${
                        floatingButtons.backToTopMobile ? 'bg-emerald-500' : 'bg-zinc-300'
                      }`}
                      aria-label="Toggle Back to Top on Mobile"
                    >
                      <div
                        className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                          floatingButtons.backToTopMobile ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Best Sellers Category Eligibility & Live Preview */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                <Flame className="w-5 h-5 fill-red-500 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Best Sellers Section Categories
                </h3>
                <p className="text-xs text-zinc-500">
                  Choose which food categories qualify for the top 4 Best Sellers row on your homepage.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 self-start sm:self-auto">
              Homepage Showcase
            </span>
          </div>

          {/* Category Toggle Pills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider block">
                Eligible Categories ({bestSellerCategories.length} selected):
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBestSellerCategories(['pizza', 'burgers'])}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                >
                  Pizza & Burgers Only
                </button>
                <span className="text-zinc-300">•</span>
                <button
                  type="button"
                  onClick={() =>
                    setBestSellerCategories(
                      allCategories
                        .map((c) => c.id.toLowerCase())
                        .filter((id) => id !== 'sauces' && !id.includes('drink'))
                    )
                  }
                  className="text-[11px] font-bold text-zinc-600 hover:text-zinc-800 hover:underline cursor-pointer"
                >
                  All Meals (No Sauces/Drinks)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {allCategories.map((cat) => {
                const isSelected = bestSellerCategories.includes(cat.id.toLowerCase());
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-600 shadow-xs scale-[1.02]'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-white text-red-600 border-white'
                          : 'bg-white border-zinc-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{cat.label || cat.id}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-zinc-500 italic pt-1">
              Tip: Unselected categories (such as cold drinks, extra sauces, or add-ons) are strictly blocked from appearing in the Best Sellers section.
            </p>
          </div>

          {/* Real-time Top 4 Best Sellers Preview */}
          <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500 fill-red-500" />
                <span>Live Preview: All-Time Top 4 Selling Items in Selected Categories</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Auto-calculated from all-time sales
              </span>
            </div>

            {previewBestSellers.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 bg-white rounded-xl border border-zinc-200">
                No items found in the selected categories. Please select at least one active category.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {previewBestSellers.map((item, idx) => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-xl border border-zinc-200 shadow-2xs flex flex-col justify-between space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-100 text-red-700">
                        #{idx + 1} Best Seller
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {item.salesCount || 0} sold
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img
                        src={item.image || '/assets/placeholder-food.png'}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-contain bg-zinc-50 border border-zinc-100 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-zinc-900 truncate">
                          {item.name}
                        </h5>
                        <span className="text-[10px] text-zinc-500 capitalize block">
                          {item.category}
                        </span>
                        <span className="text-xs font-bold text-red-600 font-display">
                          Rs. {Number(item.price || (item.sizes && item.sizes[0]?.price) || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save Button Row */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
