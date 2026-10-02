import React, { useState, useMemo } from 'react';
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
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { apiUrl } from '../../config/api';
import { formatPrice, getLocalDateStr, formatToDDMMYY } from '../../utils/formatters';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CostsManager({
  costs = [],
  orders = [],
  onRefresh
}) {
  const todayStr = useMemo(() => getLocalDateStr(new Date()), []);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'this_month' | 'specific_date'
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCost, setEditingCost] = useState(null);
  const [deletingCost, setDeletingCost] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    date: todayStr,
    amount: '',
    note: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delivered orders map by date (YYYY-MM-DD) for instant daily profit comparison
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

  // Available Years from costs & orders
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const set = new Set([currentYear, currentYear - 1]);
    costs.forEach(c => {
      if (c.date) {
        const y = new Date(c.date).getFullYear();
        if (!isNaN(y)) set.add(y);
      }
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [costs]);

  // Overall Statistics Calculation
  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    let todayTotal = 0;
    let thisMonthTotal = 0;
    let allTimeTotal = 0;

    costs.forEach(c => {
      const amt = Number(c.amount) || 0;
      allTimeTotal += amt;

      if (c.date === todayStr) {
        todayTotal += amt;
      }

      if (c.date) {
        const dt = new Date(c.date);
        if (dt.getFullYear() === currentYear && dt.getMonth() === currentMonth) {
          thisMonthTotal += amt;
        }
      }
    });

    const uniqueDatesCount = new Set(costs.map(c => c.date)).size;
    const avgDailyCost = uniqueDatesCount > 0 ? Math.round(allTimeTotal / uniqueDatesCount) : 0;

    return {
      todayTotal,
      thisMonthTotal,
      allTimeTotal,
      totalEntries: costs.length,
      avgDailyCost,
      uniqueDays: uniqueDatesCount
    };
  }, [costs, todayStr]);

  // Filtered Costs List
  const filteredCosts = useMemo(() => {
    return costs.filter(c => {
      // 1. Filter by time mode
      if (filterMode === 'this_month') {
        if (!c.date) return false;
        const dt = new Date(c.date);
        if (dt.getMonth() !== Number(selectedMonth) || dt.getFullYear() !== Number(selectedYear)) {
          return false;
        }
      }

      // 2. Search query filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesNote = (c.note || '').toLowerCase().includes(q);
        const matchesDate = (c.date || '').includes(q);
        const matchesAmount = String(c.amount || '').includes(q);
        if (!matchesNote && !matchesDate && !matchesAmount) return false;
      }

      return true;
    });
  }, [costs, filterMode, selectedMonth, selectedYear, search]);

  // Open Add Modal
  const handleOpenAddModal = (initialDate = todayStr) => {
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
      date: cost.date || todayStr,
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
                  {costs.length} {costs.length === 1 ? 'entry' : 'entries'}
                </span>
              </h2>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                Record total daily ingredients used to calculate accurate net profit in business reports
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddModal(todayStr)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record Daily Cost</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Today's Cost */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Today's Cost</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base sm:text-xl font-extrabold text-red-600 leading-none">
            {formatPrice(stats.todayTotal)}
          </div>
          <div className="text-[10.5px] text-zinc-400 font-semibold mt-1">
            {stats.todayTotal > 0 ? (
              <span className="text-emerald-600 font-bold">
                Daily Sales: {formatPrice(dailyDeliveredSalesMap[todayStr] || 0)}
              </span>
            ) : (
              'No cost recorded for today'
            )}
          </div>
        </div>

        {/* This Month's Cost */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">This Month</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base sm:text-xl font-extrabold text-red-600 leading-none">
            {formatPrice(stats.thisMonthTotal)}
          </div>
          <div className="text-[10.5px] text-zinc-400 font-semibold mt-1 truncate">
            {MONTH_NAMES[new Date().getMonth()]} total expenses
          </div>
        </div>

        {/* All-Time Total Costs */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">All-Time Total</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base sm:text-xl font-extrabold text-zinc-900 leading-none">
            {formatPrice(stats.allTimeTotal)}
          </div>
          <div className="text-[10.5px] text-zinc-400 font-semibold mt-1">
            Across {stats.uniqueDays} active days
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
          <div className="text-[10.5px] text-zinc-400 font-semibold mt-1">
            Average expense per day
          </div>
        </div>
      </div>

      {/* 3. FILTER & SEARCH CONTROLS */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-zinc-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Filter Mode Tabs */}
          <div className="inline-flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 shrink-0">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All Recorded
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('this_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'this_month'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              By Month
            </button>
          </div>

          {/* Month / Year Selectors when 'this_month' is active */}
          {filterMode === 'this_month' && (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs font-bold text-zinc-800 bg-zinc-50 border border-zinc-300 rounded-xl py-1.5 px-3 outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs font-bold text-zinc-800 bg-zinc-50 border border-zinc-300 rounded-xl py-1.5 px-3 outline-none cursor-pointer"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by notes or date (YYYY-MM-DD)..."
              className="w-full pl-9 pr-3.5 py-1.5 sm:py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-zinc-50"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. COSTS LIST TABLE & CARDS */}
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

                  // Date label formatting
                  let dateFormatted = cost.date;
                  let dayName = '';
                  try {
                    const [y, m, d] = (cost.date || '').split('-').map(Number);
                    const dt = new Date(y, m - 1, d);
                    dateFormatted = dt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    dayName = dt.toLocaleDateString('en-US', { weekday: 'short' });
                  } catch {}

                  return (
                    <tr key={cost.id} className="hover:bg-zinc-50/80 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-3.5 sm:px-4 font-bold text-zinc-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-7 py-0.5 rounded text-[10px] font-extrabold uppercase text-center bg-zinc-100 text-zinc-700">
                            {dayName || 'Day'}
                          </span>
                          <span className="text-xs font-bold text-zinc-900">{dateFormatted}</span>
                          {cost.date === todayStr && (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                              Today
                            </span>
                          )}
                        </div>
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
              <h3 className="text-sm font-bold text-zinc-800">No Cost Records Found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-0.5">
                {search ? 'No daily cost entries matched your search query.' : 'You haven\'t recorded any daily ingredients costs yet.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAddModal(todayStr)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Record Today's Cost</span>
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
