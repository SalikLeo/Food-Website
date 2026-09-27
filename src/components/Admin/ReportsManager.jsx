import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  TrendingUp,
  Wallet,
  ShoppingBag,
  Package,
  Award,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Percent
} from 'lucide-react';
import { formatPrice, getLocalDateStr, formatToDDMMYY } from '../../utils/formatters';
import CustomSelect from '../Common/CustomSelect';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ReportsManager({
  orders = [],
  products = [],
  deals = [],
  familyDeal = null,
  settings = { deliveryFee: 100 }
}) {
  const [reportType, setReportType] = useState('daily'); // 'daily' | 'monthly' | 'annual'
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const dateInputRef = useRef(null);

  // Available Years from all order records
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set([currentYear, currentYear - 1, currentYear - 2]);
    (orders || []).forEach(o => {
      if (o && o.createdAt) {
        const y = new Date(o.createdAt).getFullYear();
        if (!isNaN(y)) yearSet.add(y);
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [orders]);

  // Quick navigation handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(getLocalDateStr(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(getLocalDateStr(d));
  };

  const handleToday = () => {
    setSelectedDate(getLocalDateStr(new Date()));
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  };

  const handlePrevYear = () => {
    setSelectedYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };

  const handleCurrentYear = () => {
    setSelectedYear(new Date().getFullYear());
  };

  // Filter orders based on report type and selected timeframe
  const filteredOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];

    return orders.filter(order => {
      if (!order || !order.createdAt) return false;
      const orderDate = new Date(order.createdAt);
      if (isNaN(orderDate.getTime())) return false;

      const orderDateStr = getLocalDateStr(orderDate);

      if (reportType === 'daily') {
        return orderDateStr === selectedDate;
      }

      if (reportType === 'monthly') {
        return (
          orderDate.getMonth() === Number(selectedMonth) &&
          orderDate.getFullYear() === Number(selectedYear)
        );
      }

      if (reportType === 'annual') {
        return orderDate.getFullYear() === Number(selectedYear);
      }

      return true;
    });
  }, [orders, reportType, selectedDate, selectedMonth, selectedYear]);

  // Aggregate stats from filtered orders
  const reportStats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    let deliveredOrders = 0;
    let pendingOrders = 0;
    let preparingOrders = 0;
    let outForDeliveryOrders = 0;
    let cancelledOrders = 0;

    let totalGrossRevenue = 0;
    let totalDeliveryFees = 0;
    let totalFoodSubtotal = 0;

    let codOrdersCount = 0;
    let codRevenue = 0;
    let onlineOrdersCount = 0;
    let onlineRevenue = 0;

    const itemSalesMap = {};

    filteredOrders.forEach(order => {
      const status = (order.status || '').toLowerCase();
      const isDelivered = status === 'delivered';
      const isCancelled = status === 'cancelled';

      if (isDelivered) {
        deliveredOrders += 1;
      } else if (isCancelled) {
        cancelledOrders += 1;
      } else if (status === 'preparing') {
        preparingOrders += 1;
      } else if (status === 'out for delivery' || status === 'on the way') {
        outForDeliveryOrders += 1;
      } else {
        pendingOrders += 1;
      }

      const orderTotal = Number(order.total) || 0;
      const orderDeliveryFee = Number(order.deliveryFee) || 0;
      const orderSubtotal = Number(order.subtotal) || (orderTotal - orderDeliveryFee);

      // Only count revenue for delivered orders (standard accounting)
      if (isDelivered) {
        totalGrossRevenue += orderTotal;
        totalDeliveryFees += orderDeliveryFee;
        totalFoodSubtotal += Math.max(0, orderSubtotal);

        const isOnline = (order.paymentMethod || '').toLowerCase().includes('online') ||
                         (order.paymentMethod || '').toLowerCase().includes('transfer') ||
                         (order.paymentMethod || '').toLowerCase().includes('bank');

        if (isOnline) {
          onlineOrdersCount += 1;
          onlineRevenue += orderTotal;
        } else {
          codOrdersCount += 1;
          codRevenue += orderTotal;
        }
      }

      // Track item sales (from delivered orders)
      if (isDelivered && Array.isArray(order.items)) {
        order.items.forEach(it => {
          const name = (it.name || 'Unknown Item').trim();
          const qty = Number(it.quantity) || 1;
          const price = Number(it.price) || 0;

          if (!itemSalesMap[name]) {
            itemSalesMap[name] = {
              name,
              qty: 0,
              revenue: 0,
              ordersCount: 0
            };
          }

          itemSalesMap[name].qty += qty;
          itemSalesMap[name].revenue += price * qty;
          itemSalesMap[name].ordersCount += 1;
        });
      }
    });

    const avgOrderValue = deliveredOrders > 0 ? Math.round(totalGrossRevenue / deliveredOrders) : 0;

    // Top 5 Best-Selling Items
    const sortedItems = Object.values(itemSalesMap).sort((a, b) => {
      if (b.qty !== a.qty) return b.qty - a.qty;
      return b.revenue - a.revenue;
    });

    const top5Items = sortedItems.slice(0, 5);
    const totalItemsSold = Object.values(itemSalesMap).reduce((sum, it) => sum + it.qty, 0);

    return {
      totalOrders,
      deliveredOrders,
      pendingOrders,
      preparingOrders,
      outForDeliveryOrders,
      inProgressOrders: pendingOrders + preparingOrders + outForDeliveryOrders,
      cancelledOrders,
      totalGrossRevenue,
      totalDeliveryFees,
      totalFoodSubtotal,
      avgOrderValue,
      codOrdersCount,
      codRevenue,
      onlineOrdersCount,
      onlineRevenue,
      top5Items,
      totalItemsSold
    };
  }, [filteredOrders]);

  // Report Period Label
  const periodLabel = useMemo(() => {
    if (reportType === 'daily') {
      try {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      } catch {
        return selectedDate;
      }
    }

    if (reportType === 'monthly') {
      return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    }

    if (reportType === 'annual') {
      return `Year ${selectedYear}`;
    }

    return 'All Time';
  }, [reportType, selectedDate, selectedMonth, selectedYear]);

  // Print Thermal Report Handler
  const handlePrintReport = () => {
    const reportWindow = window.open('', '_blank', 'width=450,height=750');
    if (!reportWindow) {
      alert('Please allow popups to print the business report.');
      return;
    }

    const generatedAtStr = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sales Report - ${periodLabel} - Salik Fast Food</title>
  <style>
    @page { size: 80mm auto; margin: 0mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      width: 72mm; max-width: 72mm; margin: 0 auto;
      padding: 3mm 1.5mm 10mm 1.5mm; color: #000; background: #fff;
      font-size: 10px; line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-container { width: 72mm; max-width: 72mm; margin: 0 auto; }
    .header { text-align: center; padding-bottom: 6px; border-bottom: 1px dashed #000; }
    .header h1 { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #000; }
    .header p { font-size: 9.5px; color: #000; font-weight: 600; margin-top: 1px; }
    .badge {
      display: inline-block; margin-top: 4px; padding: 2px 6px;
      border: 1px solid #000; font-size: 9px; font-weight: 800; text-transform: uppercase;
    }
    .meta { padding: 5px 0; border-bottom: 1px dashed #000; font-size: 9.5px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .section-title {
      font-weight: 800; text-transform: uppercase; font-size: 9.5px;
      margin-top: 6px; margin-bottom: 3px; padding-bottom: 2px;
      border-bottom: 1px solid #000;
    }
    table { width: 100%; border-collapse: collapse; margin: 4px 0; border: 1px solid #000; font-size: 9px; }
    th { background: #eee; padding: 2.5px 2px; border: 1px solid #000; font-weight: 700; text-transform: uppercase; }
    td { padding: 2.5px 2px; border: 1px solid #000; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .totals { padding: 5px 0; border-bottom: 1px dashed #000; font-size: 9.5px; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .totals-divider { height: 1.5px; background: #000; width: 100%; margin: 4px 0 3px 0; }
    .grand-total {
      display: flex; justify-content: space-between; font-weight: 800;
      font-size: 11.5px; padding-top: 1px;
    }
    .footer { text-align: center; padding-top: 6px; font-size: 9px; }
    @media print {
      @page { size: 80mm auto; margin: 0mm; }
      html, body { width: 72mm !important; max-width: 72mm !important; margin: 0 auto !important; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <h1>SALIK FAST FOOD</h1>
      <p style="font-weight: 700; text-transform: uppercase;">Taste That You Need</p>
      <p>Wah Model Town, Wah Cantt • 0309-5369472</p>
      <div class="badge">${reportType.toUpperCase()} SALES REPORT</div>
    </div>

    <div class="meta">
      <div class="meta-row">
        <span style="font-weight:700;">Period:</span>
        <span style="font-weight:700;">${periodLabel}</span>
      </div>
      <div class="meta-row">
        <span>Generated:</span>
        <span>${generatedAtStr}</span>
      </div>
      <div class="meta-row">
        <span>Total Orders:</span>
        <span style="font-weight:700;">${reportStats.totalOrders}</span>
      </div>
      <div class="meta-row">
        <span>Delivered (Completed):</span>
        <span style="font-weight:700;">${reportStats.deliveredOrders}</span>
      </div>
    </div>

    <div class="section-title">Financial Summary</div>
    <div class="totals">
      <div class="totals-row">
        <span>Items Net Subtotal:</span>
        <span style="font-weight:700;">Rs. ${reportStats.totalFoodSubtotal.toLocaleString()}</span>
      </div>
      <div class="totals-row">
        <span>Delivery Fees Collected:</span>
        <span style="font-weight:700;">Rs. ${reportStats.totalDeliveryFees.toLocaleString()}</span>
      </div>
      <div class="totals-divider"></div>
      <div class="grand-total">
        <span>GROSS REVENUE:</span>
        <span>Rs. ${reportStats.totalGrossRevenue.toLocaleString()}</span>
      </div>
      <div class="totals-row" style="margin-top: 3px;">
        <span>Average Order Value:</span>
        <span style="font-weight:700;">Rs. ${reportStats.avgOrderValue.toLocaleString()}</span>
      </div>
    </div>

    <div class="section-title">Payment Breakdown</div>
    <div class="meta" style="border-bottom: 1px dashed #000;">
      <div class="meta-row">
        <span>Cash On Delivery (COD):</span>
        <span style="font-weight:700;">${reportStats.codOrdersCount} (Rs. ${reportStats.codRevenue.toLocaleString()})</span>
      </div>
      <div class="meta-row">
        <span>Online / Bank Transfer:</span>
        <span style="font-weight:700;">${reportStats.onlineOrdersCount} (Rs. ${reportStats.onlineRevenue.toLocaleString()})</span>
      </div>
    </div>

    <div class="section-title">Top 5 Best-Selling Items</div>
    <table>
      <thead>
        <tr>
          <th style="width: 16px;" class="text-center">#</th>
          <th>Item Name</th>
          <th style="width: 28px;" class="text-center">Qty</th>
          <th style="width: 55px;" class="text-right">Revenue</th>
        </tr>
      </thead>
      <tbody>
        ${reportStats.top5Items.length > 0 ? reportStats.top5Items.map((item, idx) => `
          <tr>
            <td class="text-center" style="font-weight:700;">${idx + 1}</td>
            <td style="font-weight:600;">${item.name}</td>
            <td class="text-center" style="font-weight:700;">${item.qty}</td>
            <td class="text-right" style="font-weight:700;">Rs. ${item.revenue.toLocaleString()}</td>
          </tr>
        `).join('') : `
          <tr>
            <td colspan="4" class="text-center" style="padding: 6px;">No items sold during this period.</td>
          </tr>
        `}
      </tbody>
    </table>

    <div class="section-title">Order Status Summary</div>
    <div class="meta" style="border-bottom: 1px dashed #000;">
      <div class="meta-row">
        <span>Delivered (Completed):</span>
        <span style="font-weight:700;">${reportStats.deliveredOrders}</span>
      </div>
      <div class="meta-row">
        <span>Pending / In Progress:</span>
        <span style="font-weight:700;">${reportStats.inProgressOrders}</span>
      </div>
      <div class="meta-row">
        <span>Cancelled / Rejected:</span>
        <span style="font-weight:700;">${reportStats.cancelledOrders}</span>
      </div>
      <div class="meta-row">
        <span>Total Items Sold:</span>
        <span style="font-weight:700;">${reportStats.totalItemsSold}</span>
      </div>
    </div>

    <div class="footer">
      <p style="font-weight:700;">*** END OF REPORT ***</p>
      <p style="margin-top: 2px;">Salik Fast Food Admin Management</p>
      <p style="margin-top: 1px; font-size: 8px; color: #555;">Printed on ${generatedAtStr}</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & RANGE CONTROLLER */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/90 shadow-xs space-y-4">
        {/* Title & Print Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
                Sales & Business Reports
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                Daily, monthly, and annual financial performance receipts
              </p>
            </div>
          </div>

          {/* Thermal Print Button */}
          <button
            type="button"
            onClick={handlePrintReport}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Thermal Report</span>
          </button>
        </div>

        {/* Report Mode Tabs: Daily | Monthly | Annual */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="inline-flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button
              type="button"
              onClick={() => setReportType('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === 'daily'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Daily Report
            </button>
            <button
              type="button"
              onClick={() => setReportType('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === 'monthly'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Monthly Report
            </button>
            <button
              type="button"
              onClick={() => setReportType('annual')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                reportType === 'annual'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Annual Report
            </button>
          </div>

          {/* Time Picker Controls based on active mode */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* DAILY MODE CONTROLS */}
            {reportType === 'daily' && (
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  title="Previous Day"
                  className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Native Date Input with Calendar Icon */}
                <div className="relative flex items-center">
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value || getLocalDateStr(new Date()))}
                    className="text-xs font-bold text-zinc-800 bg-transparent py-1 px-2 border-0 outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleToday}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-zinc-200 hover:bg-zinc-300 text-zinc-700 transition-colors cursor-pointer"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={handleNextDay}
                  title="Next Day"
                  className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* MONTHLY MODE CONTROLS */}
            {reportType === 'monthly' && (
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs font-bold text-zinc-800 bg-white border border-zinc-200 rounded-lg py-1 px-2 outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-bold text-zinc-800 bg-white border border-zinc-200 rounded-lg py-1 px-2 outline-none cursor-pointer"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleCurrentMonth}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-zinc-200 hover:bg-zinc-300 text-zinc-700 transition-colors cursor-pointer"
                >
                  This Month
                </button>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Next Month"
                  className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ANNUAL MODE CONTROLS */}
            {reportType === 'annual' && (
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={handlePrevYear}
                  title="Previous Year"
                  className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs font-bold text-zinc-800 bg-white border border-zinc-200 rounded-lg py-1 px-3 outline-none cursor-pointer"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleCurrentYear}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-zinc-200 hover:bg-zinc-300 text-zinc-700 transition-colors cursor-pointer"
                >
                  This Year
                </button>

                <button
                  type="button"
                  onClick={handleNextYear}
                  title="Next Year"
                  className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. STATS SUMMARY PILLS (Dashboard Overview) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-extrabold text-emerald-600">
            {formatPrice(reportStats.totalGrossRevenue)}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium mt-0.5">
            From {reportStats.deliveredOrders} delivered orders
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Orders</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-extrabold text-zinc-900">
            {reportStats.totalOrders}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium mt-0.5 flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">{reportStats.deliveredOrders} done</span>
            <span>•</span>
            <span className="text-amber-600 font-bold">{reportStats.inProgressOrders} active</span>
          </div>
        </div>

        {/* Items Sold */}
        <div className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Items Sold</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-extrabold text-zinc-900">
            {reportStats.totalItemsSold}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium mt-0.5">
            Food & deal portions
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Avg Order</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-extrabold text-zinc-900">
            {formatPrice(reportStats.avgOrderValue)}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium mt-0.5">
            Per completed order
          </div>
        </div>
      </div>

      {/* 3. DEDICATED THERMAL RECEIPT REPORT (Matching exact Customer Receipt font & style) */}
      <div className="flex justify-center pt-2">
        <div 
          className="w-full max-w-[480px] bg-white text-black rounded-2xl shadow-xl border border-zinc-300 font-sans text-xs leading-relaxed p-6 sm:p-7"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif" }}
        >
          {/* Store Header */}
          <div className="text-center pb-3 border-b border-dashed border-zinc-400 font-sans">
            <h2 className="text-lg font-extrabold tracking-wider uppercase text-black">SALIK FAST FOOD</h2>
            <p className="text-[11px] text-black uppercase font-bold tracking-wide">Taste That You Need</p>
            <p className="text-[10.5px] text-black font-semibold mt-0.5">
              Wah Model Town, Wah Cantt<br />
              Phone: 0309-5369472
            </p>
            <div className="mt-2.5 inline-flex items-center justify-center px-3.5 py-1 border border-black font-extrabold uppercase tracking-wider text-[11px] leading-none">
              <span>{reportType.toUpperCase()} SALES REPORT</span>
            </div>
          </div>

          {/* Report Metadata */}
          <div className="py-2.5 border-b border-dashed border-zinc-400 space-y-1 font-sans text-xs">
            <div className="flex justify-between">
              <span className="font-bold">Report Period:</span>
              <span className="font-bold">{periodLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Generated At:</span>
              <span className="font-semibold text-zinc-800">
                {new Date().toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Total Orders Processed:</span>
              <span className="font-bold">{reportStats.totalOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Delivered (Completed):</span>
              <span className="font-bold">{reportStats.deliveredOrders}</span>
            </div>
          </div>

          {/* Financial Totals Breakdown */}
          <div className="py-3 border-b border-dashed border-zinc-400 space-y-1.5 font-sans text-xs">
            <div className="font-extrabold uppercase tracking-wide text-[11px] pb-1 border-b border-black">
              Financial Breakdown
            </div>
            <div className="flex justify-between pt-1">
              <span>Items Net Subtotal:</span>
              <span className="font-bold">{formatPrice(reportStats.totalFoodSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Charges Collected:</span>
              <span className="font-bold">{formatPrice(reportStats.totalDeliveryFees)}</span>
            </div>
            <div className="my-1.5 h-[1.5px] bg-black w-full" />
            <div className="flex justify-between font-extrabold text-sm text-black">
              <span>GROSS REVENUE:</span>
              <span>{formatPrice(reportStats.totalGrossRevenue)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-zinc-700 pt-0.5">
              <span>Average Order Value (AOV):</span>
              <span className="font-bold text-black">{formatPrice(reportStats.avgOrderValue)}</span>
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="py-3 border-b border-dashed border-zinc-400 space-y-1.5 font-sans text-xs">
            <div className="font-extrabold uppercase tracking-wide text-[11px] pb-1 border-b border-black">
              Payment Methods Summary
            </div>
            <div className="flex justify-between pt-1">
              <span>Cash on Delivery (COD):</span>
              <span className="font-bold">
                {reportStats.codOrdersCount} orders ({formatPrice(reportStats.codRevenue)})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Online / Bank Transfer:</span>
              <span className="font-bold">
                {reportStats.onlineOrdersCount} orders ({formatPrice(reportStats.onlineRevenue)})
              </span>
            </div>
          </div>

          {/* Top 5 Best-Selling Items Table (Matching receipt table design) */}
          <div className="py-3 border-b border-dashed border-zinc-400 font-sans">
            <div className="flex items-center justify-between font-extrabold uppercase tracking-wide text-[11px] pb-1 border-b border-black">
              <span>Top 5 Best-Selling Items</span>
              <span className="text-[10px] font-bold">Qty / Amount</span>
            </div>

            <table className="w-full text-left border-collapse border border-black text-xs mt-2">
              <thead>
                <tr className="bg-zinc-100 font-sans font-bold text-[10.5px] uppercase tracking-wide border-b border-black text-black">
                  <th className="py-1 px-1.5 border-r border-black w-6 text-center">#</th>
                  <th className="py-1 px-2 border-r border-black">Item</th>
                  <th className="py-1 px-1.5 border-r border-black text-center w-10">Qty</th>
                  <th className="py-1 px-2 text-right w-16">Total</th>
                </tr>
              </thead>
              <tbody>
                {reportStats.top5Items.length > 0 ? (
                  reportStats.top5Items.map((item, idx) => (
                    <tr key={idx} className="align-top border-b border-black">
                      <td className="py-1 px-1.5 border-r border-black text-center font-bold text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 border-r border-black font-semibold text-xs text-black">
                        {item.name}
                      </td>
                      <td className="py-1 px-1.5 border-r border-black text-center font-bold text-xs text-black">
                        {item.qty}
                      </td>
                      <td className="py-1 px-2 text-right font-bold text-xs text-black whitespace-nowrap">
                        {formatPrice(item.revenue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-zinc-500 font-medium">
                      No delivered item sales recorded for this timeframe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Order Status Breakdown */}
          <div className="py-3 border-b border-dashed border-zinc-400 space-y-1 font-sans text-xs">
            <div className="font-extrabold uppercase tracking-wide text-[11px] pb-1 border-b border-black">
              Orders Status Breakdown
            </div>
            <div className="flex justify-between pt-1">
              <span>Delivered (Completed):</span>
              <span className="font-bold">{reportStats.deliveredOrders}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending Confirmation:</span>
              <span className="font-bold">{reportStats.pendingOrders}</span>
            </div>
            <div className="flex justify-between">
              <span>In Kitchen / Preparing:</span>
              <span className="font-bold">{reportStats.preparingOrders}</span>
            </div>
            <div className="flex justify-between">
              <span>Out For Delivery:</span>
              <span className="font-bold">{reportStats.outForDeliveryOrders}</span>
            </div>
            <div className="flex justify-between">
              <span>Cancelled / Rejected:</span>
              <span className="font-bold">{reportStats.cancelledOrders}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-dotted border-zinc-400 font-bold">
              <span>Total Items Sold:</span>
              <span>{reportStats.totalItemsSold}</span>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="text-center pt-3 text-[10.5px] font-sans space-y-0.5">
            <p className="font-extrabold uppercase tracking-wide">*** END OF REPORT ***</p>
            <p className="font-semibold text-zinc-700">Salik Fast Food Business Management System</p>
            <p className="text-[9.5px] text-zinc-500">Thank you for your hard work!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
