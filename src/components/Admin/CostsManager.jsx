import React, { useState, useMemo, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Calendar,
  Wallet,
  TrendingDown,
  TrendingUp,
  Search,
  Edit3,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Loader2,
  DollarSign,
  Clock
} from 'lucide-react';
import { apiUrl } from '../../config/api';
import { formatPrice, getLocalDateStr } from '../../utils/formatters';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CostsManager({
  costs = [],
  orders = [],
  dateFilteredOrders = [],
  timeFilterMode = 'today',
  selectedDate = '',
  selectedMonth = new Date().getMonth(),
  selectedYear = new Date().getFullYear(),
  onRefresh
}) {
  const todayStr = useMemo(() => getLocalDateStr(new Date()), []);
  const activeDate = selectedDate || todayStr;
  const [search, setSearch] = useState('');

  useEffect(() => {
    if ((!costs || costs.length === 0) && typeof onRefresh === 'function') {
      onRefresh();
    }
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCost, setEditingCost] = useState(null);
  const [deletingCost, setDeletingCost] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    date: activeDate,
    amount: '',
    note: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map delivered orders by date (YYYY-MM-DD) for individual row comparisons
  const dailyDeliveredSalesMap = useMemo(() => {
    const map = {};
    (orders || []).forEach(o => {
      if (o && o.status === 'Delivered' && o.createdAt) {
        const d = getLocalDateStr(new Date(o.createdAt));
        const total = Number(o.total) || 0;
        map[d] = (map[d] || 0) + total;
      }
    });
    return map;
  }, [orders]);

  // Filtered Costs matching top dashboard time filter & search
  const filteredCosts = useMemo(() => {
    return costs.filter(c => {
      if (!c || !c.date) return false;
      const costDate = new Date(c.date);
      if (isNaN(costDate.getTime())) return false;

      // 1. Match top dashboard time filter
      if (timeFilterMode === 'today') {
        if (activeDate && c.date !== activeDate) {
          return false;
        }
      } else if (timeFilterMode === 'monthly') {
        if (
          costDate.getMonth() !== Number(selectedMonth) ||
          costDate.getFullYear() !== Number(selectedYear)
        ) {
          return false;
        }
      } else if (timeFilterMode === 'annual') {
        if (costDate.getFullYear() !== Number(selectedYear)) {
          return false;
        }
      }
      // 'all' includes all records

      // 2. Match search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesNote = (c.note || '').toLowerCase().includes(q);
        const matchesDate = (c.date || '').includes(q);
        const matchesAmount = String(c.amount || '').includes(q);
        if (!matchesNote && !matchesDate && !matchesAmount) return false;
      }

      return true;
    });
  }, [costs, timeFilterMode, activeDate, selectedMonth, selectedYear, search]);

  // Period label for headers and cards
  const periodLabel = useMemo(() => {
    if (timeFilterMode === 'today') {
      try {
        const [y, m, d] = activeDate.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      } catch {
        return activeDate;
      }
    }
    if (timeFilterMode === 'monthly') {
      return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    }
    if (timeFilterMode === 'annual') {
      return `Year ${selectedYear}`;
    }
    return 'All Time';
  }, [timeFilterMode, activeDate, selectedMonth, selectedYear]);

  // Period Stats Calculation (tied directly to top time filter)
  const stats = useMemo(() => {
    const totalPeriodCost = filteredCosts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    // Delivered sales for the same period from dateFilteredOrders
    const totalPeriodSales = (dateFilteredOrders || [])
      .filter(o => o.status === 'Delivered')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const netProfit = totalPeriodSales - totalPeriodCost;
    const profitMargin = totalPeriodSales > 0 ? Math.round((netProfit / totalPeriodSales) * 100) : 0;

    const uniqueDays = new Set(filteredCosts.map(c => c.date)).size;
    const avgDailyCost = uniqueDays > 0 ? Math.round(totalPeriodCost / uniqueDays) : totalPeriodCost;

    return {
      totalPeriodCost,
      totalPeriodSales,
      netProfit,
      profitMargin,
      avgDailyCost,
      entriesCount: filteredCosts.length,
      uniqueDays
    };
  }, [filteredCosts, dateFilteredOrders]);

  // Open Add Modal
  const handleOpenAddModal = (initialDate = activeDate) => {
    setEditingCost(null);
    setFormData({
      date: initialDate,
      amount: '',
      note: ''
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cost) => {
    setEditingCost(cost);
    setFormData({
      date: cost.date || activeDate,
      amount: String(cost.amount || ''),
      note: cost.note || ''
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  // Set quick date in form
  const handleSetQuickDate = (daysAgo = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setFormData(prev => ({ ...prev, date: getLocalDateStr(d) }));
  };

  // Save Cost (Create or Update)
  const handleSaveCost = async (e) => {
    e.preventDefault();
    setFormError('');

    const amt = Number(formData.amount);
    if (isNaN(amt) || amt < 0 || formData.amount.trim() === '') {
      setFormError('Please enter a valid cost amount in Rs. (e.g. 15000)');
      return;
    }

    if (!formData.date) {
      setFormError('Please select a date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingCost
        ? apiUrl(`/api/costs/${editingCost.id}`)
        : apiUrl('/api/costs');
      const method = editingCost ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          amount: amt,
          note: formData.note ? formData.note.trim() : ''
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save daily cost.');
      }

      setIsAddModalOpen(false);
      setEditingCost(null);
      if (typeof onRefresh === 'function') {
        onRefresh();
      }
    } catch (err) {
      console.error('Save cost error:', err);
      setFormError(err.message || 'Error saving cost entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Cost
  const handleDeleteCost = async () => {
    if (!deletingCost) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl(`/api/costs/${deletingCost.id}`), {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete cost entry.');
      }
      setDeletingCost(null);
      if (typeof onRefresh === 'function') {
        onRefresh();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete cost entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight flex items-center gap-2">
                <span>Daily Ingredient & Operational Costs</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {filteredCosts.length} {filteredCosts.length === 1 ? 'entry' : 'entries'}
                </span>
              </h2>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Viewing data for: <span className="font-bold text-zinc-800">{periodLabel}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddModal(activeDate)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record Daily Cost</span>
          </button>
        </div>
      </div>

      {/* 2. DYNAMIC STATS OVERVIEW CARDS (Tied to Top Dashboard Time Header) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        
        {/* Total Cost for Period */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              {timeFilterMode === 'today' ? "Cost (Selected Date)" : "Total Cost"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base sm:text-xl font-extrabold text-red-600 leading-none">
            {formatPrice(stats.totalPeriodCost)}
          </div>
          <div className="text-[10.5px] text-zinc-400 font-semibold mt-1 truncate">
            {stats.entriesCount} recorded {stats.entriesCount === 1 ? 'day' : 'days'}
          </div>
        </div>

        {/* Delivered Sales for Period */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Delivered Sales</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base sm:text-xl font-extrabold text-emerald-600 leading-none">
            {formatPrice(stats.totalPeriodSales)}
          </div>
          <div className="text-[10.5px] text-zinc-400 font-semibold mt-1 truncate">
            Completed order revenue
          </div>
        </div>

        {/* Net Profit for Period */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Net Profit</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              stats.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`mt-2 text-base sm:text-xl font-extrabold leading-none ${
            stats.netProfit >= 0 ? 'text-zinc-900' : 'text-red-600'
          }`}>
            {formatPrice(stats.netProfit)}
          </div>
          <div className="text-[10.5px] font-bold mt-1 flex items-center gap-1">
            <span className={stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
              {stats.profitMargin}% margin
            </span>
            <span className="text-zinc-400 font-normal">• Sales - Cost</span>
          </div>
        </div>

        {/* Average Daily Cost */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Avg Daily Cost</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base sm:text-xl font-extrabold text-zinc-900 leading-none">
            {formatPrice(stats.avgDailyCost)}
          </div>
          <div className="text-[10.5px] text-zinc-400 font-semibold mt-1 truncate">
            Average expense per day
          </div>
        </div>
      </div>

      {/* 3. SEARCH CONTROL (Clean & Full Width, Tied to Top Filter) */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-zinc-200/90 shadow-2xs">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search in ${periodLabel} by notes, amount, or date...`}
            className="w-full pl-10 pr-9 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-50"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. COSTS LIST TABLE */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        {filteredCosts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider text-[10.5px]">
                  <th className="py-3 px-3.5 sm:px-4">Date</th>
                  <th className="py-3 px-3 sm:px-4">Ingredient Cost</th>
                  <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Sales on Date</th>
                  <th className="py-3 px-3 sm:px-4 hidden md:table-cell">Est. Net Profit</th>
                  <th className="py-3 px-3.5 sm:px-4">Notes / Details</th>
                  <th className="py-3 px-3.5 sm:px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                {filteredCosts.map((cost) => {
                  const daySales = dailyDeliveredSalesMap[cost.date] || 0;
                  const dayProfit = daySales - Number(cost.amount || 0);
                  const isProfitable = dayProfit >= 0;

                  // Clean date label (e.g. Oct 2, 2026)
                  let dateFormatted = cost.date;
                  try {
                    const [y, m, d] = (cost.date || '').split('-').map(Number);
                    const dt = new Date(y, m - 1, d);
                    dateFormatted = dt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                  } catch {}

                  return (
                    <tr key={cost.id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-3.5 sm:px-4 font-bold text-zinc-900 whitespace-nowrap text-xs">
                        {dateFormatted}
                      </td>

                      {/* Ingredient Cost */}
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-extrabold text-xs sm:text-sm border border-red-200/80">
                          <span>Rs.</span>
                          <span>{Number(cost.amount || 0).toLocaleString()}</span>
                        </span>
                      </td>

                      {/* Sales on that Date */}
                      <td className="py-3 px-3 sm:px-4 hidden md:table-cell whitespace-nowrap text-zinc-700 font-bold">
                        {daySales > 0 ? (
                          <span className="text-zinc-900">{formatPrice(daySales)}</span>
                        ) : (
                          <span className="text-zinc-400 font-normal">Rs. 0</span>
                        )}
                      </td>

                      {/* Est. Net Profit on Date */}
                      <td className="py-3 px-3 sm:px-4 hidden md:table-cell whitespace-nowrap font-bold">
                        {daySales > 0 ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${
                            isProfitable
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {isProfitable ? '+' : ''}{formatPrice(dayProfit)}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-normal text-[11px]">-</span>
                        )}
                      </td>

                      {/* Notes / Details */}
                      <td className="py-3 px-3.5 sm:px-4 text-zinc-600 max-w-xs truncate">
                        {cost.note && cost.note.trim() ? (
                          <span title={cost.note} className="text-xs">
                            {cost.note}
                          </span>
                        ) : (
                          <span className="text-zinc-400 italic text-[11px]">Total ingredients used</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 sm:px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(cost)}
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer active:scale-90"
                            title="Edit Cost"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCost(cost)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer active:scale-90"
                            title="Delete Cost"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 mx-auto flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-800">No Cost Records in {periodLabel}</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-0.5">
                {search ? 'No daily cost entries matched your search query.' : `No ingredient cost recorded for ${periodLabel}.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddModal(activeDate)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Record Cost for {periodLabel}</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. ADD / EDIT COST MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-zinc-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-zinc-900 leading-tight">
                    {editingCost ? 'Edit Daily Cost' : 'Record Daily Ingredient Cost'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Enter the total lump sum cost for the day
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCost} className="p-4 sm:p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Date Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                  Cost Date *
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-50"
                  />
                  {/* Quick date shortcuts */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(0)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        formData.date === todayStr
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate(1)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-all cursor-pointer"
                    >
                      Yesterday
                    </button>
                  </div>
                </div>
              </div>

              {/* Total Cost Amount Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                  Total Ingredient Cost (Rs.) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-zinc-500">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 14500"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Enter the total sum of all ingredients used (chicken, cheese, sauces, buns, etc.)
                </p>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="e.g. 15kg Chicken, 5kg Cheese, 80 Buns, Sauces & Oil"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-50 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingCost ? 'Update Cost' : 'Save Daily Cost'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      {deletingCost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-zinc-200 p-5 space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-zinc-900">Delete Cost Entry?</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Are you sure you want to remove the cost entry of <span className="font-bold text-red-600">Rs. {Number(deletingCost.amount || 0).toLocaleString()}</span> for <span className="font-bold text-zinc-800">{deletingCost.date}</span>?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCost(null)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteCost}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
