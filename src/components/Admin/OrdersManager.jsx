import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Phone, MapPin, Clock, CheckCircle, CheckCircle2, Truck, AlertTriangle, Printer, Search, Edit3, Plus, Minus, Trash2, X, ShoppingBag, Check, ChevronDown, Calendar, ArrowLeft } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { apiUrl } from '../../config/api';

// Helper to format date to local YYYY-MM-DD
const getLocalDateStr = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format to DD/MM/YY (e.g. 18/09/26)
const formatToDDMMYY = (d) => {
  if (!d) return '';
  const date = new Date(typeof d === 'string' && d.includes('-') && !d.includes('T') ? `${d}T00:00:00` : d);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

// Format order date & time: DD/MM/YY, hh:mm am/pm
const formatOrderDateTime = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const timeStr = d.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();
  return `${day}/${month}/${year}, ${timeStr}`;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function OrdersManager({
  orders = [],
  products = [],
  deals = [],
  familyDeal = null,
  settings = {},
  onRefresh
}) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Date / Period Filter State (defaults to 'today' for Daily Orders)
  const [datePreset, setDatePreset] = useState('today'); // 'today' | 'yesterday' | 'this_month' | 'month' | 'annual' | 'custom_date' | 'all'
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth()); // 0 - 11
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [customDate, setCustomDate] = useState(() => getLocalDateStr(new Date())); // 'YYYY-MM-DD'
  const dateInputRef = useRef(null);

  // Track expanded state for minimized delivered orders
  const [expandedOrderIds, setExpandedOrderIds] = useState({});

  const toggleOrderExpand = (orderId) => {
    setExpandedOrderIds(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Modify / Add Items State
  const [modifyingOrder, setModifyingOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editNotes, setEditNotes] = useState('');
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedItemKey, setSelectedItemKey] = useState('');
  const [selectedSize, setSelectedSize] = useState(null);
  const [addQty, setAddQty] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const comboboxRef = useRef(null);

  // In-App Receipt Modal State
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState(null);

  // Sync modal state with AdminDashboard back handler
  useEffect(() => {
    window.__salikAdminModalOpen = Boolean(viewingReceiptOrder || modifyingOrder);
    return () => {
      window.__salikAdminModalOpen = false;
    };
  }, [viewingReceiptOrder, modifyingOrder]);

  // Native Android hardware/gesture back button listener (Capacitor)
  useEffect(() => {
    let backHandle = null;

    const setupCapacitorBack = async () => {
      try {
        backHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
          if (viewingReceiptOrder) {
            setViewingReceiptOrder(null);
            return;
          }
          if (modifyingOrder) {
            setModifyingOrder(null);
            return;
          }
        });
      } catch {
        // Not running in native Capacitor shell
      }
    };

    setupCapacitorBack();

    return () => {
      if (backHandle && typeof backHandle.remove === 'function') {
        backHandle.remove();
      }
    };
  }, [viewingReceiptOrder, modifyingOrder]);


  // Browser / WebView history popstate handler
  useEffect(() => {
    if (viewingReceiptOrder) {
      window.history.pushState({ modal: 'salik-receipt' }, '');
      const handlePop = () => {
        setViewingReceiptOrder(null);
      };
      window.addEventListener('popstate', handlePop);
      return () => {
        window.removeEventListener('popstate', handlePop);
      };
    }
  }, [viewingReceiptOrder]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
        setIsComboboxOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableItems = useMemo(() => {
    const list = [];

    // Products
    (products || []).forEach(p => {
      if (p.inStock !== false) {
        list.push({
          key: `prod-${p.id}`,
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.sizes?.[0]?.price || p.price,
          sizes: p.sizes || [],
          image: p.image,
          isDeal: false
        });
      }
    });

    // Deals
    (deals || []).forEach(d => {
      list.push({
        key: `deal-${d.id}`,
        id: d.id,
        name: d.name + (d.description ? ` (${d.description})` : ''),
        category: 'deals',
        price: Number(d.price) || 0,
        sizes: [],
        image: d.image,
        isDeal: true
      });
    });

    // Family Deal
    if (familyDeal) {
      list.push({
        key: `family-deal`,
        id: familyDeal.id,
        name: familyDeal.name,
        category: 'deals',
        price: Number(familyDeal.price) || 0,
        sizes: [],
        image: familyDeal.image,
        isDeal: true
      });
    }

    return list;
  }, [products, deals, familyDeal]);

  const selectedItem = useMemo(() => {
    return availableItems.find(i => i.key === selectedItemKey) || null;
  }, [availableItems, selectedItemKey]);

  const filteredAvailableItems = useMemo(() => {
    const q = menuSearch.toLowerCase().trim();
    if (!q) return availableItems;
    if (selectedItem && selectedItem.name.toLowerCase() === q) {
      return availableItems;
    }
    return availableItems.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  }, [availableItems, menuSearch, selectedItem]);

  const handleOpenModifyModal = (order) => {
    setModifyingOrder(order);
    setEditItems((order.items || []).map(it => ({ ...it })));
    setEditNotes(order.notes || '');
    setMenuSearch('');
    setSelectedItemKey('');
    setSelectedSize(null);
    setAddQty(1);
    setIsComboboxOpen(false);
  };

  const handleCloseModifyModal = () => {
    setModifyingOrder(null);
    setEditItems([]);
    setEditNotes('');
    setIsComboboxOpen(false);
  };

  const handleSelectMenuItem = (key) => {
    setSelectedItemKey(key);
    const item = availableItems.find(i => i.key === key);
    if (item && item.sizes && item.sizes.length > 0) {
      setSelectedSize(item.sizes[0]);
    } else {
      setSelectedSize(null);
    }
    setAddQty(1);
  };

  const handleUpdateItemQty = (index, delta) => {
    setEditItems(prev => {
      const next = [...prev];
      const newQty = (next[index].quantity || 1) + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = { ...next[index], quantity: newQty };
      }
      return next;
    });
  };

  const handleRemoveItem = (index) => {
    setEditItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddSelectedItem = () => {
    if (!selectedItem) return;
    const sizeLabel = selectedSize ? selectedSize.label : null;
    const price = selectedSize ? Number(selectedSize.price) : Number(selectedItem.price);
    const cleanName = selectedItem.isDeal
      ? selectedItem.name.split(' (')[0]
      : selectedItem.name;

    setEditItems(prev => {
      const existingIdx = prev.findIndex(it =>
        it.name === cleanName && (it.size || null) === (sizeLabel || null)
      );
      if (existingIdx !== -1) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + addQty
        };
        return next;
      } else {
        return [
          ...prev,
          {
            name: cleanName,
            size: sizeLabel,
            price,
            quantity: addQty,
            image: selectedItem.image || '/assets/deal-family.png'
          }
        ];
      }
    });

    setSelectedItemKey('');
    setMenuSearch('');
    setSelectedSize(null);
    setAddQty(1);
    setIsComboboxOpen(false);
  };

  const calcSubtotal = useMemo(() => {
    return editItems.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity || 1)), 0);
  }, [editItems]);

  const freeDeliveryEnabled = settings?.freeDeliveryEnabled === true && Number(settings?.freeDeliveryThreshold || 0) > 0;
  const baseDeliveryEnabled = settings?.baseDeliveryEnabled !== false;
  const freeThreshold = freeDeliveryEnabled ? Number(settings.freeDeliveryThreshold) : 0;
  const baseDeliveryFee = baseDeliveryEnabled ? Number(settings?.deliveryFee ?? 100) : 0;
  const isFree = (!baseDeliveryEnabled) || (freeDeliveryEnabled && calcSubtotal >= freeThreshold);
  const calcDeliveryFee = calcSubtotal > 0 ? (isFree ? 0 : baseDeliveryFee) : 0;
  const calcTotal = calcSubtotal + calcDeliveryFee;

  const handleSaveModifiedOrder = async () => {
    if (!modifyingOrder || editItems.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/orders/${modifyingOrder.id}/items`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editItems,
          subtotal: calcSubtotal,
          deliveryFee: calcDeliveryFee,
          total: calcTotal,
          notes: editNotes
        })
      });
      if (res.ok) {
        setModifyingOrder(null);
        onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to update order');
      }
    } catch {
      alert('Error updating order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert('Failed to update status');
      }
    } catch {
      alert('Error updating status');
    }
  };

  const generateReceiptHtml = (order) => {
    const orderDate = formatOrderDateTime(order.createdAt);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${order.id} - Salik Fast Food</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      width: 74mm;
      max-width: 74mm;
      margin: 0 auto;
      padding: 4px 2px 12px 2px;
      color: #000;
      background: #fff;
      font-size: 10px;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .bold { font-weight: 600; }

    /* Header */
    .receipt-header {
      text-align: center;
      padding-bottom: 7px;
      border-bottom: 1px dashed #000;
    }
    .brand-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 1px;
    }
    .brand-tagline {
      font-size: 9px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .contact-info {
      font-size: 9px;
      margin-bottom: 4px;
    }
    .order-badge {
      display: inline-block;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      border: 1px solid #000;
      padding: 1px 5px;
      border-radius: 2px;
    }

    /* Meta Info Box */
    .meta-box {
      padding: 6px 0;
      border-bottom: 1px dashed #000;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-bottom: 2px;
    }
    .meta-label { font-weight: 600; }
    .meta-value { text-align: right; }

    .address-block {
      margin-top: 3px;
      font-size: 9.5px;
    }
    .address-text {
      margin-top: 1px;
      word-break: break-word;
    }

    .notes-box {
      margin-top: 3px;
      font-size: 9px;
      padding: 2px 4px;
      border-left: 2px solid #000;
      background: #fdfdfd;
    }

    /* Items Table - Tabular Design with Solid Grid Borders */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      border: 1px solid #000;
    }
    .items-table th {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      text-align: left;
      padding: 4px 4px;
      background: #f4f4f5;
      border-bottom: 1px solid #000;
      border-right: 1px solid #000;
      color: #000;
    }
    .items-table th:last-child {
      border-right: none;
    }
    .items-table td {
      padding: 4px 4px;
      vertical-align: top;
      border-bottom: 1px solid #000;
      border-right: 1px solid #000;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 9px;
      color: #000;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .items-table td:last-child {
      border-right: none;
    }
    .items-table .col-num { width: 16px; text-align: center; }
    .items-table .col-qty { width: 22px; text-align: center; font-weight: 700; }
    .items-table .col-price { width: 38px; text-align: right; }
    .items-table .col-total { width: 44px; text-align: right; font-weight: 700; }
    
    .item-name {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-weight: 600;
      font-size: 9px;
      color: #000;
    }
    .item-size {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 8px;
      font-weight: 500;
      color: #3f3f46;
      margin-top: 1px;
    }

    /* Totals Box */
    .totals-box {
      padding: 6px 0;
      border-bottom: 1px dashed #000;
      font-size: 10.5px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .grand-total-row {
      display: flex;
      justify-content: space-between;
      font-size: 12.5px;
      font-weight: 700;
      padding-top: 4px;
      border-top: 1px solid #000;
      margin-top: 2px;
    }

    /* Footer */
    .receipt-footer {
      text-align: center;
      padding-top: 8px;
      font-size: 9px;
    }
    .cut-line {
      margin-top: 8px;
      font-size: 8px;
      text-align: center;
      letter-spacing: 2px;
      color: #666;
    }

    @media print {
      body {
        width: 100%;
        max-width: 100%;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="receipt-header">
    <div class="brand-title">SALIK FAST FOOD</div>
    <div class="brand-tagline">Taste That You Need</div>
    <div class="contact-info">
      Wah Model Town, Wah Cantt<br>
      Phone: 0309-5369472
    </div>
    <div class="order-badge">
      ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'CASH ON DELIVERY'}
    </div>
  </div>

  <!-- Order Meta Information Box -->
  <div class="meta-box">
    <div class="meta-row">
      <span class="meta-label">Order ID:</span>
      <span class="meta-value">#${order.id}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Date & Time:</span>
      <span class="meta-value">${orderDate}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Customer:</span>
      <span class="meta-value">${order.customerName || 'Walk-in Customer'}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Phone:</span>
      <span class="meta-value">${order.phone || '-'}</span>
    </div>

    ${order.address ? `
      <div class="address-block">
        <span class="meta-label">Delivery Address:</span>
        <div class="address-text">${order.address}</div>
      </div>
    ` : ''}

    ${order.notes ? `
      <div class="notes-box">
        <strong>Notes:</strong> ${order.notes}
      </div>
    ` : ''}
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-item">Item Description</th>
        <th class="col-qty">Qty</th>
        <th class="col-price">Rate</th>
        <th class="col-total">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${(order.items || []).map((it, idx) => `
        <tr>
          <td class="col-num">${idx + 1}</td>
          <td class="col-item">
            <div class="item-name">${it.name}</div>
            ${it.size ? `<div class="item-size">Size: ${it.size}</div>` : ''}
          </td>
          <td class="col-qty">${it.quantity}</td>
          <td class="col-price">${Number(it.price).toLocaleString()}</td>
          <td class="col-total">${(Number(it.price) * Number(it.quantity)).toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Order Totals Box -->
  <div class="totals-box">
    <div class="totals-row">
      <span>Subtotal</span>
      <span class="bold">Rs. ${(order.subtotal || 0).toLocaleString()}</span>
    </div>
    <div class="totals-row">
      <span>Delivery Charges</span>
      <span class="bold">
        ${Number(order.deliveryFee) === 0 ? 'FREE' : `Rs. ${Number(order.deliveryFee).toLocaleString()}`}
      </span>
    </div>
    <div class="grand-total-row">
      <span>TOTAL PAYABLE</span>
      <span>Rs. ${(order.total || 0).toLocaleString()}</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="receipt-footer">
    <div class="bold" style="font-size: 10.5px; margin-bottom: 3px; text-transform: uppercase; font-family: 'Inter', sans-serif;">Thank you for ordering!</div>
    <div class="cut-line">✂ - - - - - - - - - - - - - - - - - - - - -</div>
  </div>

</body>
</html>`;
  };

  const handlePrintReceipt = (order) => {
    try {
      let iframe = document.getElementById('receipt-print-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'receipt-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(generateReceiptHtml(order));
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.error('Print error:', e);
        }
      }, 250);
    } catch (e) {
      console.error('Print iframe error:', e);
    }
  };

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  // Active selected day string (always a valid YYYY-MM-DD for current day view)
  const activeDayStr = useMemo(() => {
    if (datePreset === 'today') {
      return getLocalDateStr(new Date());
    }
    if (datePreset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return getLocalDateStr(y);
    }
    if (datePreset === 'custom_date' && customDate) {
      return customDate;
    }
    return customDate || getLocalDateStr(new Date());
  }, [datePreset, customDate]);

  // Available Years from orders (plus current and last 2 years)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set([currentYear, currentYear - 1, currentYear - 2]);
    (orders || []).forEach(o => {
      if (o.createdAt) {
        const y = new Date(o.createdAt).getFullYear();
        if (!isNaN(y)) yearSet.add(y);
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [orders]);

  // Date Filtered Orders
  const dateFilteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateStr(now);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    return orders.filter(o => {
      if (!o.createdAt) return true;
      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return true;
      const orderDateStr = getLocalDateStr(orderDate);

      if (datePreset === 'today') {
        return orderDateStr === todayStr;
      } else if (datePreset === 'yesterday') {
        return orderDateStr === yesterdayStr;
      } else if (datePreset === 'this_month') {
        return orderDateStr.slice(0, 7) === currentYearMonth;
      } else if (datePreset === 'month') {
        return orderDate.getFullYear() === Number(selectedYear) && orderDate.getMonth() === Number(selectedMonth);
      } else if (datePreset === 'annual') {
        return orderDate.getFullYear() === Number(selectedYear);
      } else if (datePreset === 'custom_date') {
        return customDate ? orderDateStr === customDate : true;
      } else if (datePreset === 'all') {
        return true;
      }
      return true;
    });
  }, [orders, datePreset, customDate, selectedMonth, selectedYear]);

  // Period description label
  const periodDescription = useMemo(() => {
    const now = new Date();
    if (datePreset === 'today') {
      return `Today (${formatToDDMMYY(now)})`;
    }
    if (datePreset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return `Yesterday (${formatToDDMMYY(y)})`;
    }
    if (datePreset === 'this_month') {
      return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
    }
    if (datePreset === 'month') {
      return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    }
    if (datePreset === 'annual') {
      return `Annual ${selectedYear} (Full Year)`;
    }
    if (datePreset === 'custom_date' && customDate) {
      return `Day (${formatToDDMMYY(customDate)})`;
    }
    if (datePreset === 'all') {
      return 'All Time Orders';
    }
    return 'Selected Period';
  }, [datePreset, customDate, selectedMonth, selectedYear]);

  const salesLabel = useMemo(() => {
    if (datePreset === 'annual') return 'Annual Sales:';
    if (datePreset === 'month' || datePreset === 'this_month') return 'Monthly Sales:';
    if (datePreset === 'today' || datePreset === 'yesterday' || datePreset === 'custom_date') return 'Daily Sales:';
    return 'Total Revenue:';
  }, [datePreset]);

  const dateFilteredRevenue = useMemo(() => {
    return dateFilteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [dateFilteredOrders]);

  // Check if there are pending orders in prior days when viewing today
  const pendingOutsideTodayCount = useMemo(() => {
    if (datePreset !== 'today') return 0;
    const todayStr = getLocalDateStr(new Date());
    return orders.filter(o => o.status === 'Pending' && getLocalDateStr(o.createdAt) !== todayStr).length;
  }, [orders, datePreset]);

  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter(o => {
      const matchStatus = statusFilter === 'All' || o.status === statusFilter;
      const q = search.toLowerCase().trim();
      const matchSearch = !q || 
        o.id.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.phone?.includes(q);
      return matchStatus && matchSearch;
    });
  }, [dateFilteredOrders, statusFilter, search]);

  return (
    <div className="space-y-6">
      
      {/* Date, Month & Year Period Filter Card */}
      <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>Period:</span>
            </span>

            <button
              onClick={() => {
                setDatePreset('today');
                setCustomDate(getLocalDateStr(new Date()));
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'today'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              Today (Daily)
            </button>

            <button
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setDatePreset('yesterday');
                setCustomDate(getLocalDateStr(y));
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'yesterday'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              Yesterday
            </button>

            <button
              onClick={() => {
                const now = new Date();
                setSelectedMonth(now.getMonth());
                setSelectedYear(now.getFullYear());
                setDatePreset('this_month');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'this_month'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              This Month
            </button>

            {/* Annual Preset Button */}
            <button
              onClick={() => {
                setDatePreset('annual');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                datePreset === 'annual'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
              title={`View annual sales & orders for ${selectedYear}`}
            >
              <span>Annual ({selectedYear})</span>
            </button>

            <button
              onClick={() => {
                setDatePreset('all');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === 'all'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Selectors: Day (DD/MM/YY), Month Dropdown & Year Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Specific Day Picker with DD/MM/YY Display */}
            <div
              onClick={handleOpenDatePicker}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all cursor-pointer select-none ${
                datePreset === 'custom_date' || datePreset === 'today' || datePreset === 'yesterday'
                  ? 'bg-orange-50 border-orange-300 text-orange-950 shadow-2xs font-bold'
                  : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
              }`}
              title="Click to choose a specific day"
            >
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Day:</span>
              <span className="font-semibold text-zinc-900 min-w-[65px] text-center">
                {formatToDDMMYY(activeDayStr)}
              </span>
              <Calendar className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 ml-0.5" />
              <input
                ref={dateInputRef}
                type="date"
                value={activeDayStr}
                onChange={(e) => {
                  if (e.target.value) {
                    setCustomDate(e.target.value);
                    setDatePreset('custom_date');
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Select a specific day (DD/MM/YY)"
              />
            </div>

            {/* Dedicated Month Dropdown */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all ${
              datePreset === 'month'
                ? 'bg-orange-50 border-orange-300 text-orange-950 shadow-2xs font-bold'
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
            }`}>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Month:</span>
              <select
                value={datePreset === 'month' ? selectedMonth : ''}
                onChange={(e) => {
                  if (e.target.value !== '') {
                    setSelectedMonth(Number(e.target.value));
                    setDatePreset('month');
                    setCustomDate('');
                  }
                }}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-1 text-zinc-900"
              >
                <option value="">Select Month</option>
                {MONTH_NAMES.map((mName, idx) => (
                  <option key={idx} value={idx}>
                    {mName}
                  </option>
                ))}
              </select>
            </div>

            {/* Years Dropdown */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-all ${
              datePreset === 'annual'
                ? 'bg-orange-50 border-orange-400 text-orange-950 shadow-2xs font-bold ring-1 ring-orange-500/20'
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700'
            }`}>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setDatePreset('annual');
                  setCustomDate('');
                }}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-1 text-zinc-900"
                title="Select year to view Annual Sales"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Filter Summary & Reconciliation Bar */}
        <div className="pt-2.5 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-zinc-600">
              Period: <strong className="text-zinc-900 font-bold">{periodDescription}</strong>
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-600">
              Orders: <strong className="text-orange-600 font-bold">{dateFilteredOrders.length}</strong>
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-600">
              {salesLabel} <strong className="text-emerald-600 font-bold">Rs. {dateFilteredRevenue.toLocaleString()}</strong>
            </span>
          </div>

          {datePreset !== 'today' && (
            <button
              onClick={() => {
                setDatePreset('today');
                setCustomDate(getLocalDateStr(new Date()));
              }}
              className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
            >
              Reset to Today (Daily)
            </button>
          )}
        </div>

        {/* Prior Pending Orders Alert Banner */}
        {pendingOutsideTodayCount > 0 && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Notice: You have <strong>{pendingOutsideTodayCount} pending {pendingOutsideTodayCount === 1 ? 'order' : 'orders'}</strong> from prior dates that require attention.
              </span>
            </div>
            <button
              onClick={() => {
                setDatePreset('all');
                setStatusFilter('Pending');
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase tracking-wider flex-shrink-0 transition-colors cursor-pointer"
            >
              View Pending Orders
            </button>
          </div>
        )}
      </div>

      {/* Status Filters Bar & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {['All', 'Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 shadow-2xs'
              }`}
            >
              {st}
              {st === 'Pending' && dateFilteredOrders.filter(o => o.status === 'Pending').length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px]">
                  {dateFilteredOrders.filter(o => o.status === 'Pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by order ID, name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-zinc-200 shadow-2xs p-6">
          <Clock className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
          <h4 className="text-zinc-900 font-bold text-base">No orders found</h4>
          <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto">
            No orders match the selected period ({periodDescription}){statusFilter !== 'All' ? ` with status "${statusFilter}"` : ''}{search ? ` and search "${search}"` : ''}.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2.5 flex-wrap">
            {datePreset !== 'all' && (
              <button
                onClick={() => setDatePreset('all')}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                View All Time Orders ({orders.length})
              </button>
            )}
            {datePreset !== 'today' && (
              <button
                onClick={() => {
                  setDatePreset('today');
                  setStatusFilter('All');
                  setSearch('');
                }}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Reset to Today (Daily)
              </button>
            )}
            {statusFilter !== 'All' && (
              <button
                onClick={() => setStatusFilter('All')}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Clear Status Filter
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const isDelivered = order.status === 'Delivered';
            const isExpanded = expandedOrderIds[order.id] !== undefined
              ? Boolean(expandedOrderIds[order.id])
              : !isDelivered; // Delivered defaults to collapsed (minimized); active orders default to expanded

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isDelivered
                    ? 'border-emerald-200/90 hover:border-emerald-300 shadow-2xs'
                    : 'border-zinc-200/90 hover:border-zinc-300 shadow-2xs'
                }`}
              >
                {/* Minimized Single-Row Strip for Delivered Orders */}
                {isDelivered ? (
                  <div>
                    <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 bg-white">
                      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span className="font-mono font-bold text-xs sm:text-sm text-zinc-900">
                          #{order.id}
                        </span>
                        <span className="text-[11px] sm:text-xs text-zinc-500 font-medium">
                          {formatOrderDateTime(order.createdAt)}
                        </span>
                        <span className="text-zinc-300 hidden sm:inline">•</span>
                        <span className="text-xs font-bold text-zinc-900">
                          {order.customerName}
                        </span>
                        <a
                          href={`tel:${order.phone}`}
                          className="text-xs text-orange-600 hover:underline hidden sm:inline font-medium"
                        >
                          ({order.phone})
                        </a>
                        <span className="text-zinc-300 hidden md:inline">•</span>
                        <span className="text-xs text-zinc-500 hidden md:inline">
                          {order.items?.reduce((acc, it) => acc + (it.quantity || 1), 0)} items
                        </span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="text-right">
                          <span className="text-[11px] text-zinc-500 mr-1.5 hidden sm:inline">Total:</span>
                          <span className="font-medium text-sm sm:text-base text-orange-600">
                            Rs. {order.total?.toLocaleString()}
                          </span>
                        </div>

                        {/* Status Dropdown */}
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="px-2.5 py-1 rounded-full text-xs font-bold border focus:outline-none bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Preparing">Preparing</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>

                        {/* View Receipt Modal */}
                        <button
                          onClick={() => setViewingReceiptOrder(order)}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                          title="View Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Smooth Dropdown Toggle Button */}
                        <button
                          onClick={() => toggleOrderExpand(order.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 hover:text-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
                          title={isExpanded ? 'Collapse Details' : 'View Details'}
                        >
                          <span className="hidden sm:inline">{isExpanded ? 'Hide' : 'Details'}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Smooth Accordion Body for Delivered Orders */}
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="p-4 sm:p-5 pt-3 border-t border-zinc-100 bg-zinc-50/50 space-y-4">
                          {/* Customer Info & Address */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-700">
                            <div>
                              <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block mb-1">Customer:</span>
                              <span className="font-bold text-zinc-900 block text-sm">{order.customerName}</span>
                              <a
                                href={`tel:${order.phone}`}
                                className="inline-flex items-center gap-1 text-orange-600 hover:underline mt-1 font-medium"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{order.phone}</span>
                              </a>
                            </div>

                            <div>
                              <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block mb-1">Delivery Address:</span>
                              <div className="flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mt-0.5" />
                                <span className="leading-relaxed text-zinc-800">{order.address}</span>
                              </div>
                              {order.notes && (
                                <div className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-2.5 py-1.5 font-medium">
                                  Note: {order.notes}
                                </div>
                              )}
                            </div>

                            <div className="md:text-right space-y-1">
                              <div>
                                <span className="text-zinc-500 text-[11px]">Payment: </span>
                                <span className="font-semibold text-zinc-800">{order.paymentMethod}</span>
                              </div>

                              <div className="flex items-center justify-start md:justify-end gap-2 text-xs text-zinc-500">
                                <span>Subtotal: Rs. {(order.subtotal || 0).toLocaleString()}</span>
                                <span>•</span>
                                <span>
                                  Delivery:{' '}
                                  <strong className={Number(order.deliveryFee) === 0 ? 'text-emerald-600 font-semibold' : 'text-zinc-800'}>
                                    {Number(order.deliveryFee) === 0 ? 'FREE' : `Rs. ${(order.deliveryFee || 0).toLocaleString()}`}
                                  </strong>
                                </span>
                              </div>

                              <div className="pt-0.5 flex items-center justify-start md:justify-end gap-1.5">
                                <span className="text-zinc-500 font-medium text-xs">Total:</span>
                                <span className="text-base sm:text-lg text-orange-600 font-medium">
                                  Rs. {order.total?.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Ordered Items List */}
                          <div className="p-3 bg-white rounded-xl border border-zinc-200/90 text-xs">
                            <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block mb-2">
                              Items Ordered:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {(order.items || []).map((it, idx) => (
                                <div key={idx} className="flex justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                                  <div>
                                    <span className="font-bold text-zinc-900">{it.quantity}× {it.name}</span>
                                    {it.size && <span className="text-orange-600 ml-1 font-semibold">({it.size})</span>}
                                  </div>
                                  <span className="font-bold text-zinc-800">
                                    Rs. {(it.price * it.quantity).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Card for Active / Non-Delivered Orders */
                  <div className="p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-orange-600">
                          #{order.id}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium">
                          {formatOrderDateTime(order.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {(order.status === 'Pending' || order.status === 'Preparing') && (
                          <button
                            onClick={() => handleOpenModifyModal(order)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs font-semibold transition-colors"
                            title="Edit items in this order"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Order</span>
                          </button>
                        )}

                        {/* Status Dropdown */}
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border focus:outline-none cursor-pointer ${
                            order.status === 'Pending'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : order.status === 'Preparing'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : order.status === 'Out for Delivery'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : order.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Preparing">Preparing</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>

                        <button
                          onClick={() => setViewingReceiptOrder(order)}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                          title="View Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Customer Info & Address */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-700">
                      <div>
                        <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block mb-1">Customer:</span>
                        <span className="font-bold text-zinc-900 block text-sm">{order.customerName}</span>
                        <a
                          href={`tel:${order.phone}`}
                          className="inline-flex items-center gap-1 text-orange-600 hover:underline mt-1 font-medium"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{order.phone}</span>
                        </a>
                      </div>

                      <div>
                        <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block mb-1">Delivery Address:</span>
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mt-0.5" />
                          <span className="leading-relaxed text-zinc-800">{order.address}</span>
                        </div>
                        {order.notes && (
                          <div className="mt-2 text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-2.5 py-1.5 font-medium">
                            Note: {order.notes}
                          </div>
                        )}
                      </div>

                      <div className="md:text-right space-y-1">
                        <div>
                          <span className="text-zinc-500 text-[11px]">Payment: </span>
                          <span className="font-semibold text-zinc-800">{order.paymentMethod}</span>
                        </div>

                        <div className="flex items-center justify-start md:justify-end gap-2 text-xs text-zinc-500">
                          <span>Subtotal: Rs. {(order.subtotal || 0).toLocaleString()}</span>
                          <span>•</span>
                          <span>
                            Delivery:{' '}
                            <strong className={Number(order.deliveryFee) === 0 ? 'text-emerald-600 font-semibold' : 'text-zinc-800'}>
                              {Number(order.deliveryFee) === 0 ? 'FREE' : `Rs. ${(order.deliveryFee || 0).toLocaleString()}`}
                            </strong>
                          </span>
                        </div>

                        <div className="pt-0.5 flex items-center justify-start md:justify-end gap-1.5">
                          <span className="text-zinc-500 font-medium text-xs">Total:</span>
                          <span className="text-base sm:text-lg text-orange-600 font-medium">
                            Rs. {order.total?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ordered Items List */}
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/90 text-xs">
                      <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] block mb-2">
                        Items:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {(order.items || []).map((it, idx) => (
                          <div key={idx} className="flex justify-between bg-white p-2.5 rounded-lg border border-zinc-200 shadow-2xs">
                            <div>
                              <span className="font-bold text-zinc-900">{it.quantity}× {it.name}</span>
                              {it.size && <span className="text-orange-600 ml-1 font-semibold">({it.size})</span>}
                            </div>
                            <span className="font-bold text-zinc-800">
                              Rs. {(it.price * it.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modify / Add Items Modal (Light Theme) */}
      {modifyingOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl uppercase tracking-wider text-zinc-900">
                    Edit Order
                  </span>
                  <span className="font-mono font-bold text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                    #{modifyingOrder.id}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Customer: <strong className="text-zinc-900">{modifyingOrder.customerName}</strong> • {modifyingOrder.phone}
                </p>
              </div>
              <button
                onClick={handleCloseModifyModal}
                className="w-8 h-8 rounded-full border border-zinc-200 hover:border-zinc-300 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-white">
              
              {/* Current Items in Order */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                    <span>Current Items in Order ({editItems.reduce((acc, it) => acc + (it.quantity || 1), 0)})</span>
                  </h4>
                  <span className="text-[11px] text-zinc-500">Adjust quantity or delete</span>
                </div>

                {editItems.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 bg-zinc-50 rounded-2xl border border-zinc-200 text-xs">
                    No items in this order. Add at least one item below.
                  </div>
                ) : (
                  <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-3 divide-y divide-zinc-200 space-y-2">
                    {editItems.map((item, index) => (
                      <div key={index} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Quantity Stepper */}
                          <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-2xs flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(index, -1)}
                              className="px-2 py-1 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 font-bold text-zinc-900 min-w-[20px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(index, 1)}
                              className="px-2 py-1 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
                              title="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="min-w-0">
                            <span className="font-bold text-zinc-900 block truncate">{item.name}</span>
                            {item.size && (
                              <span className="text-[10px] text-orange-600 font-semibold">Size: {item.size}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-bold text-zinc-900">
                            Rs. {(item.price * item.quantity).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-zinc-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Item Section */}
              <div className="p-4 bg-orange-50/40 rounded-2xl border border-orange-200/80 space-y-3">
                <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Add Menu Item or Deal to Order</span>
                </h4>

                {/* Unified Searchable Combobox Dropdown */}
                <div ref={comboboxRef} className="relative w-full">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search or choose item to add..."
                      value={menuSearch}
                      onFocus={() => setIsComboboxOpen(true)}
                      onClick={() => setIsComboboxOpen(true)}
                      onChange={(e) => {
                        setMenuSearch(e.target.value);
                        if (!isComboboxOpen) setIsComboboxOpen(true);
                        if (selectedItemKey && e.target.value !== selectedItem?.name) {
                          setSelectedItemKey('');
                          setSelectedSize(null);
                        }
                      }}
                      className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-white border border-zinc-300 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs cursor-text transition-all"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {menuSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuSearch('');
                            setSelectedItemKey('');
                            setSelectedSize(null);
                            setIsComboboxOpen(true);
                          }}
                          className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsComboboxOpen(prev => !prev)}
                        className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                        title={isComboboxOpen ? "Close list" : "Browse list"}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isComboboxOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Menu List */}
                  {isComboboxOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl border border-zinc-200 shadow-xl max-h-60 overflow-y-auto divide-y divide-zinc-100 text-xs">
                      {filteredAvailableItems.length === 0 ? (
                        <div className="p-4 text-center text-zinc-500 font-medium">
                          No food items or deals match "{menuSearch}"
                        </div>
                      ) : (
                        filteredAvailableItems.map(item => {
                          const isSelected = selectedItemKey === item.key;
                          return (
                            <div
                              key={item.key}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectMenuItem(item.key);
                                setMenuSearch(item.name);
                                setIsComboboxOpen(false);
                              }}
                              className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-orange-50 text-orange-950 font-bold'
                                  : 'hover:bg-zinc-50 text-zinc-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                {item.isDeal ? (
                                  <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-extrabold uppercase tracking-wider flex-shrink-0">
                                    DEAL
                                  </span>
                                ) : item.category ? (
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                                    {item.category}
                                  </span>
                                ) : null}
                                <span className="truncate">{item.name}</span>
                              </div>
                              <span className="font-semibold text-zinc-900 flex-shrink-0 text-[11px]">
                                {item.sizes && item.sizes.length > 0 ? `from Rs. ${item.price}` : `Rs. ${item.price}`}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* If item selected, show size options (if any), qty & Add Button */}
                {selectedItem && (
                  <div className="p-3 bg-white rounded-xl border border-orange-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-1.5">
                      <span className="font-bold text-zinc-900 text-xs block">{selectedItem.name}</span>
                      {selectedItem.sizes && selectedItem.sizes.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-zinc-500">Select Size:</span>
                          {selectedItem.sizes.map(s => (
                            <button
                              key={s.label}
                              type="button"
                              onClick={() => setSelectedSize(s)}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                                selectedSize?.label === s.label
                                  ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                                  : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                              }`}
                            >
                              {s.label} (Rs. {s.price})
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-orange-600 font-semibold">
                          Price: Rs. {selectedItem.price}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setAddQty(Math.max(1, addQty - 1))}
                          className="px-2 py-1 hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-zinc-900 min-w-[20px] text-center">
                          {addQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAddQty(addQty + 1)}
                          className="px-2 py-1 hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddSelectedItem}
                        className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Order</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Notes (Customer call instructions) */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Order Notes / Customer Call Instruction:
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Customer called to add 2x Fries and 1x Drink..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
                />
              </div>

              {/* Live Recalculated Summary Card */}
              <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-zinc-900">Rs. {calcSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Delivery Fee</span>
                  <span className={calcDeliveryFee === 0 ? 'text-emerald-600 font-bold' : 'font-semibold text-zinc-900'}>
                    {calcDeliveryFee === 0 ? 'FREE (Threshold Met)' : `Rs. ${calcDeliveryFee.toLocaleString()}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-zinc-200 flex justify-between items-baseline">
                  <span className="font-display text-base text-zinc-900 font-bold uppercase tracking-wider">
                    Updated Total:
                  </span>
                  <span className="text-xl text-orange-600 font-medium">
                    Rs. {calcTotal.toLocaleString()}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleCloseModifyModal}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-xs font-bold text-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSaving || editItems.length === 0}
                onClick={handleSaveModifiedOrder}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-xs font-bold text-white uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save & Update Order</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* IN-APP RECEIPT MODAL */}
      {viewingReceiptOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 pb-32 sm:pb-36 animate-tab-fade">
          
          {/* Top Control Bar with Back and Print */}
          <div className="w-full max-w-[420px] bg-zinc-900 text-white rounded-2xl p-3 mb-3 flex items-center justify-between shadow-2xl border border-white/10 sticky top-2 z-10">
            <button
              type="button"
              onClick={() => setViewingReceiptOrder(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-orange-500" />
              <span>Back to Orders</span>
            </button>

            <span className="text-xs font-bold text-zinc-300">
              Receipt #{viewingReceiptOrder.id}
            </span>

            <button
              type="button"
              onClick={() => handlePrintReceipt(viewingReceiptOrder)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>

          {/* Thermal Receipt Paper Card */}
          <div className="w-full max-w-[420px] bg-white text-black p-5 sm:p-6 rounded-2xl shadow-2xl border border-zinc-300 font-mono text-[11px] leading-relaxed mb-8">
            
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-black">
              <h2 className="text-lg font-black tracking-wider uppercase">SALIK FAST FOOD</h2>
              <p className="text-[10px] text-zinc-600 uppercase font-semibold">Taste That You Need</p>
              <p className="text-[10px] text-zinc-600 mt-1">
                Wah Model Town, Wah Cantt<br />
                Phone: 0309-5369472
              </p>
              <div className="mt-2 inline-block px-3 py-0.5 border border-black font-bold uppercase tracking-wider text-[10px]">
                {viewingReceiptOrder.paymentMethod ? viewingReceiptOrder.paymentMethod.toUpperCase() : 'CASH ON DELIVERY'}
              </div>
            </div>

            {/* Order Metadata Box */}
            <div className="py-3 border-b border-dashed border-black space-y-1">
              <div className="flex justify-between">
                <span className="font-bold">Order ID:</span>
                <span>#{viewingReceiptOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Date & Time:</span>
                <span>{formatOrderDateTime(viewingReceiptOrder.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Customer:</span>
                <span>{viewingReceiptOrder.customerName || 'Walk-in Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Phone:</span>
                <span>{viewingReceiptOrder.phone || '-'}</span>
              </div>
              {viewingReceiptOrder.address && (
                <div className="pt-1">
                  <span className="font-bold block">Delivery Address:</span>
                  <span className="block text-[10px] leading-tight text-zinc-800">{viewingReceiptOrder.address}</span>
                </div>
              )}
              {viewingReceiptOrder.notes && (
                <div className="pt-1 text-[10px] italic">
                  <span className="font-bold not-italic">Notes:</span> {viewingReceiptOrder.notes}
                </div>
              )}
            </div>

            {/* Items Table - Proper Tabular Grid Design */}
            <div className="py-3 border-b border-dashed border-black">
              <table className="w-full text-left border-collapse border border-black">
                <thead>
                  <tr className="bg-zinc-100 font-sans font-bold text-[13px] uppercase tracking-wide border-b border-black text-black">
                    <th className="py-1.5 px-1.5 border-r border-black w-7 text-center">#</th>
                    <th className="py-1.5 px-2 border-r border-black">Item</th>
                    <th className="py-1.5 px-1.5 border-r border-black text-center w-9">Qty</th>
                    <th className="py-1.5 px-1.5 border-r border-black text-right w-14">Rate</th>
                    <th className="py-1.5 px-2 text-right w-16">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingReceiptOrder.items || []).map((it, idx) => (
                    <tr key={idx} className="align-top border-b border-black">
                      <td className="py-1.5 px-1.5 border-r border-black text-center font-sans text-xs text-zinc-600">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-2 border-r border-black font-sans font-semibold text-xs text-black">
                        <div>{it.name}</div>
                        {it.size && (
                          <span className="inline-block font-sans font-medium text-[11px] text-zinc-700 mt-0.5">
                            Size: {it.size}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-1.5 border-r border-black text-center font-sans font-bold text-xs text-black">
                        {it.quantity}
                      </td>
                      <td className="py-1.5 px-1.5 border-r border-black text-right font-sans text-xs text-zinc-800">
                        {Number(it.price).toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-right font-sans font-bold text-xs text-black">
                        {(Number(it.price) * Number(it.quantity)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="py-3 border-b border-dashed border-black space-y-1 font-bold">
              <div className="flex justify-between text-zinc-700">
                <span>Subtotal</span>
                <span>Rs. {(viewingReceiptOrder.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zinc-700">
                <span>Delivery Charges</span>
                <span>{Number(viewingReceiptOrder.deliveryFee) === 0 ? 'FREE' : `Rs. ${Number(viewingReceiptOrder.deliveryFee).toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1 border-t border-black text-black">
                <span>TOTAL PAYABLE</span>
                <span>Rs. {(viewingReceiptOrder.total || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[11px] space-y-1 text-zinc-700 font-sans">
              <p className="font-bold text-black text-xs uppercase tracking-wide">Thank you for ordering!</p>
              <p className="text-zinc-500 pt-1 tracking-widest font-mono text-[10px]">✂ - - - - - - - - - - - - - - - - - - - - -</p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
