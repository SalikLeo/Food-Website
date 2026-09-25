import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Phone, MapPin, Clock, CheckCircle, CheckCircle2, Truck, AlertTriangle, Printer, Search, Edit3, Plus, Minus, Trash2, X, ShoppingBag, Check, ChevronDown, Calendar, ArrowLeft, Download, MessageCircle, Loader2, Bike, ReceiptText } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { apiUrl } from '../../config/api';
import { formatPrice, formatPaymentMethod, formatReceiptPaymentBadge, cleanDealInclusions, formatDealDescription, isMarketingDealDescription } from '../../utils/formatters';
import { downloadReceiptImage, shareReceiptImageWhatsApp, printReceiptDocument } from '../../services/receiptImageService';

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

export default function OrdersManager({
  orders = [],
  allOrders = [],
  totalPendingCount,
  pendingOutsideTodayCount = 0,
  onResetToAllPending,
  products = [],
  categories = [],
  deals = [],
  familyDeal = null,
  settings = {},
  riders = [],
  onRefresh,
  onReceiptOpenChange
}) {

  const totalPendingOrders = typeof totalPendingCount === 'number'
    ? totalPendingCount
    : (allOrders && allOrders.length > 0 ? allOrders : orders).filter(o => o.status === 'Pending').length;

  const totalPreparingOrders = (allOrders && allOrders.length > 0 ? allOrders : orders).filter(o => o.status === 'Preparing').length;

  const totalOutForDeliveryOrders = (allOrders && allOrders.length > 0 ? allOrders : orders).filter(o => o.status === 'Out for Delivery').length;

  const resolveCategoryLabel = (rawCategory) => {
    if (!rawCategory) return '';
    const clean = String(rawCategory).toLowerCase().trim();
    const found = (categories || []).find(c => c.id === clean || c.label?.toLowerCase() === clean);
    if (found && found.label) return found.label;

    const map = {
      pizza: 'Pizza',
      burgers: 'Burgers',
      burger: 'Burgers',
      shawarma: 'Shawarma',
      sandwiches: 'Sandwiches',
      sandwich: 'Sandwiches',
      fries: 'Fries',
      wings: 'Hot Wings',
      hotwings: 'Hot Wings',
      nuggets: 'Nuggets',
      special: 'Special Items',
      beverages: 'Beverages',
      sauces: 'Sauces'
    };
    if (map[clean]) return map[clean];

    return clean
      .split(/[\s_-]+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const resolveItemDealItems = (item) => {
    if (!item) return null;

    const rawItemName = (item.name || '').split(' (')[0].trim().toLowerCase();
    const isDeal = item.category === 'deals' ||
                   String(item.id || '').startsWith('deal-') ||
                   String(item.id || '') === 'family-deal' ||
                   rawItemName.includes('deal') ||
                   rawItemName.includes('family') ||
                   (deals || []).some(d => (d.name || '').split(' (')[0].trim().toLowerCase() === rawItemName) ||
                   (familyDeal && (familyDeal.name || '').split(' (')[0].trim().toLowerCase() === rawItemName);

    if (!isDeal) return null;

    // 1. Direct includes array/string on item
    if (item.includes && (Array.isArray(item.includes) ? item.includes.length > 0 : String(item.includes).trim())) {
      const items = formatDealDescription(item.includes);
      if (items) return items;
    }

    // 2. Match familyDeal from state/db
    if (familyDeal && familyDeal.name) {
      const famName = (familyDeal.name || '').split(' (')[0].trim().toLowerCase();
      if (famName === rawItemName || rawItemName.includes('family')) {
        if (familyDeal.includes && (Array.isArray(familyDeal.includes) ? familyDeal.includes.length > 0 : String(familyDeal.includes).trim())) {
          const items = formatDealDescription(familyDeal.includes);
          if (items) return items;
        }
      }
    }

    // 3. Match from deals list
    if (rawItemName) {
      const matched = (deals || []).find(d => {
        const dName = (d.name || '').split(' (')[0].trim().toLowerCase();
        return dName === rawItemName || d.id === item.id;
      });
      if (matched && matched.includes && (Array.isArray(matched.includes) ? matched.includes.length > 0 : String(matched.includes).trim())) {
        const items = formatDealDescription(matched.includes);
        if (items) return items;
      }
    }

    // 4. Fallback: only if item.description is an items list (NOT an editorial marketing description)
    if (item.description && !isMarketingDealDescription(item.description)) {
      const desc = formatDealDescription(item.description);
      if (desc) return desc;
    }

    return null;
  };

  // Resolves the subtitle for an order item:
  // - For deals: shows the deal items (inclusions)
  // - For regular items: shows their category instead of description
  const resolveItemSubtitle = (item) => {
    if (!item) return null;

    const dealItems = resolveItemDealItems(item);
    if (dealItems) return dealItems;

    let cat = item.category;
    const rawName = (item.name || '').split(' (')[0].trim().toLowerCase();
    if (!cat || cat === 'menu') {
      const p = (products || []).find(prod => 
        prod.id === item.id || (prod.name || '').split(' (')[0].trim().toLowerCase() === rawName
      );
      if (p && p.category) cat = p.category;
    }

    if (cat && cat !== 'menu' && cat !== 'deals') {
      return resolveCategoryLabel(cat);
    }

    return null;
  };

  const resolveItemDealDescription = resolveItemSubtitle;

  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [activeStatusDropdownOrderId, setActiveStatusDropdownOrderId] = useState(null);
  const [activeDropdownAlign, setActiveDropdownAlign] = useState('left');

  // Click-and-drag to scroll order status filters
  const statusScrollRef = useRef(null);
  const isStatusDownRef = useRef(false);
  const statusStartXRef = useRef(0);
  const statusScrollLeftRef = useRef(0);
  const statusHasMovedRef = useRef(false);
  const [isStatusGrabbing, setIsStatusGrabbing] = useState(false);

  const handleStatusMouseDown = (e) => {
    if (e.button !== 0) return; // Only primary left-click
    const slider = statusScrollRef.current;
    if (!slider) return;

    isStatusDownRef.current = true;
    statusHasMovedRef.current = false;
    statusStartXRef.current = e.pageX - slider.offsetLeft;
    statusScrollLeftRef.current = slider.scrollLeft;
    setIsStatusGrabbing(true);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!isStatusDownRef.current) return;
      const slider = statusScrollRef.current;
      if (!slider) return;

      const x = e.pageX - slider.offsetLeft;
      const walk = (x - statusStartXRef.current) * 1.5;
      if (Math.abs(walk) > 4) {
        statusHasMovedRef.current = true;
      }
      slider.scrollLeft = statusScrollLeftRef.current - walk;
    };

    const handleGlobalMouseUp = () => {
      if (isStatusDownRef.current) {
        isStatusDownRef.current = false;
        setIsStatusGrabbing(false);
        setTimeout(() => {
          statusHasMovedRef.current = false;
        }, 50);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleStatusWheel = (e) => {
    const slider = statusScrollRef.current;
    if (slider && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      slider.scrollLeft += e.deltaY;
    }
  };

  const handleStatusSelect = (st) => {
    if (statusHasMovedRef.current) return;
    const count = st === 'Pending'
      ? totalPendingOrders
      : st === 'Preparing'
      ? totalPreparingOrders
      : st === 'Out for Delivery'
      ? totalOutForDeliveryOrders
      : null;

    if (typeof count === 'number' && count > 0 && typeof onResetToAllPending === 'function') {
      onResetToAllPending();
    }
    setStatusFilter(st);
  };

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

  // Track prepared items per order: { [`${orderId}-${itemIdx}`]: true }
  const [preparedItems, setPreparedItems] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_prepared_items');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleItemPrepared = (orderId, idx) => {
    setPreparedItems(prev => {
      const key = `${orderId}-${idx}`;
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('salik_prepared_items', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const getOrderPreparedCount = (order) => {
    const items = order.items || [];
    if (items.length === 0) return { prepared: 0, total: 0, isAllDone: false };
    let prepared = 0;
    items.forEach((_, idx) => {
      if (preparedItems[`${order.id}-${idx}`]) {
        prepared += 1;
      }
    });
    return {
      prepared,
      total: items.length,
      isAllDone: prepared === items.length && items.length > 0
    };
  };

  // In-App Receipt Modal State
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState(null);
  const receiptPaperRef = useRef(null);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);

  // Status Change Confirmation Modal State (for Delivered Orders)
  const [statusChangeConfirmModal, setStatusChangeConfirmModal] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // In-App Rider Assignment Modal State (replaces native select dialog)
  const [assigningRiderOrder, setAssigningRiderOrder] = useState(null);

  // Delete Order Confirmation Modal State
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  const handleDeleteOrder = async () => {
    if (!deleteConfirmOrder || isDeletingOrder) return;
    try {
      setIsDeletingOrder(true);
      const res = await fetch(apiUrl(`/api/orders/${deleteConfirmOrder.id}`), {
        method: 'DELETE'
      });
      if (res.ok) {
        setDeleteConfirmOrder(null);
        if (typeof onRefresh === 'function') onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete order');
      }
    } catch (e) {
      console.error('Delete order error:', e);
      alert('Network error while deleting order');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Sync receipt state with AdminDashboard header visibility and modal stack
  useEffect(() => {
    if (typeof onReceiptOpenChange === 'function') {
      onReceiptOpenChange(Boolean(viewingReceiptOrder));
    }
    if (viewingReceiptOrder) {
      const closer = () => setViewingReceiptOrder(null);
      window.__salikModalStack = window.__salikModalStack || [];
      window.__salikModalStack.push(closer);
      return () => {
        window.__salikModalStack = (window.__salikModalStack || []).filter(fn => fn !== closer);
      };
    }
  }, [viewingReceiptOrder, onReceiptOpenChange]);

  useEffect(() => {
    if (modifyingOrder) {
      const closer = () => setModifyingOrder(null);
      window.__salikModalStack = window.__salikModalStack || [];
      window.__salikModalStack.push(closer);
      return () => {
        window.__salikModalStack = (window.__salikModalStack || []).filter(fn => fn !== closer);
      };
    }
  }, [modifyingOrder]);

  // Sync status change confirm modal with modal stack
  useEffect(() => {
    if (statusChangeConfirmModal) {
      const closer = () => setStatusChangeConfirmModal(null);
      window.__salikModalStack = window.__salikModalStack || [];
      window.__salikModalStack.push(closer);
      return () => {
        window.__salikModalStack = (window.__salikModalStack || []).filter(fn => fn !== closer);
      };
    }
  }, [statusChangeConfirmModal]);

  // Sync assigning rider modal with modal stack
  useEffect(() => {
    if (assigningRiderOrder) {
      const closer = () => setAssigningRiderOrder(null);
      window.__salikModalStack = window.__salikModalStack || [];
      window.__salikModalStack.push(closer);
      return () => {
        window.__salikModalStack = (window.__salikModalStack || []).filter(fn => fn !== closer);
      };
    }
  }, [assigningRiderOrder]);

  // Sync delete order modal with modal stack
  useEffect(() => {
    if (deleteConfirmOrder) {
      const closer = () => setDeleteConfirmOrder(null);
      window.__salikModalStack = window.__salikModalStack || [];
      window.__salikModalStack.push(closer);
      return () => {
        window.__salikModalStack = (window.__salikModalStack || []).filter(fn => fn !== closer);
      };
    }
  }, [deleteConfirmOrder]);

  // Sync modal state with AdminDashboard back handler
  useEffect(() => {
    window.__salikAdminModalOpen = Boolean(viewingReceiptOrder || modifyingOrder || statusChangeConfirmModal || assigningRiderOrder || deleteConfirmOrder);
    return () => {
      window.__salikAdminModalOpen = false;
    };
  }, [viewingReceiptOrder, modifyingOrder, statusChangeConfirmModal, assigningRiderOrder, deleteConfirmOrder]);

  // Handle desktop ESC key to dismiss topmost modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (deleteConfirmOrder) {
          setDeleteConfirmOrder(null);
        } else if (assigningRiderOrder) {
          setAssigningRiderOrder(null);
        } else if (statusChangeConfirmModal) {
          setStatusChangeConfirmModal(null);
        } else if (viewingReceiptOrder) {
          setViewingReceiptOrder(null);
        } else if (modifyingOrder) {
          handleCloseModifyModal();
        }
      }
    };
    if (assigningRiderOrder || statusChangeConfirmModal || viewingReceiptOrder || modifyingOrder || deleteConfirmOrder) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [assigningRiderOrder, statusChangeConfirmModal, viewingReceiptOrder, modifyingOrder, deleteConfirmOrder]);

  // Native Android hardware/gesture back button listener (Capacitor)
  useEffect(() => {
    let backHandle = null;

    const setupCapacitorBack = async () => {
      try {
        backHandle = await CapApp.addListener('backButton', ({ canGoBack }) => {
          if (statusChangeConfirmModal) {
            setStatusChangeConfirmModal(null);
            return;
          }
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
  }, [viewingReceiptOrder, modifyingOrder, statusChangeConfirmModal]);



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
      const itemsSummary = d.includes && d.includes.length > 0
        ? cleanDealInclusions(d.includes).join(', ')
        : (d.description && !isMarketingDealDescription(d.description) ? cleanDealInclusions(d.description) : '');
      list.push({
        key: `deal-${d.id}`,
        id: d.id,
        name: d.name + (itemsSummary ? ` (${itemsSummary})` : ''),
        category: 'deals',
        price: Number(d.price) || 0,
        sizes: [],
        image: d.image,
        isDeal: true,
        includes: d.includes,
        description: itemsSummary || d.description
      });
    });

    // Family Deal
    if (familyDeal) {
      const famSummary = familyDeal.includes && familyDeal.includes.length > 0
        ? cleanDealInclusions(familyDeal.includes).join(', ')
        : (familyDeal.description && !isMarketingDealDescription(familyDeal.description) ? cleanDealInclusions(familyDeal.description) : '');
      list.push({
        key: `family-deal`,
        id: familyDeal.id,
        name: familyDeal.name + (famSummary ? ` (${famSummary})` : ''),
        category: 'deals',
        price: Number(familyDeal.price) || 0,
        sizes: [],
        image: familyDeal.image,
        isDeal: true,
        includes: familyDeal.includes,
        description: famSummary || familyDeal.description
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
    const dealItems = selectedItem.isDeal
      ? formatDealDescription(selectedItem.includes || selectedItem.description)
      : undefined;

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
            image: selectedItem.image || '/assets/deal-family.png',
            ...(dealItems ? { description: dealItems } : {}),
            ...(selectedItem.includes ? { includes: selectedItem.includes } : {})
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

  const handleStatusChange = async (orderId, newStatus, riderData = null) => {
    try {
      const payload = { status: newStatus };
      if (riderData) {
        payload.riderId = riderData.riderId;
        payload.riderName = riderData.riderName;
        payload.riderPhone = riderData.riderPhone;
      } else if (newStatus === 'Out for Delivery' || newStatus === 'Preparing' || newStatus === 'Pending') {
        payload.riderId = null;
        payload.riderName = null;
        payload.riderPhone = null;
      }
      const res = await fetch(apiUrl(`/api/orders/${orderId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onRefresh();

        // 1. Immediately update localStorage cache if this order is in local recent orders
        try {
          const cleanId = String(orderId).replace(/^#/, '');
          const saved = localStorage.getItem('salik_recent_orders');
          if (saved) {
            const list = JSON.parse(saved);
            const updated = list.map(o => {
              if (String(o.id).replace(/^#/, '') === cleanId) {
                const upd = { ...o, status: newStatus, updatedAt: new Date().toISOString() };
                if (riderData) {
                  upd.riderId = riderData.riderId;
                  upd.riderName = riderData.riderName;
                  upd.riderPhone = riderData.riderPhone;
                } else if (newStatus === 'Out for Delivery' || newStatus === 'Preparing' || newStatus === 'Pending') {
                  upd.riderId = null;
                  upd.riderName = null;
                  upd.riderPhone = null;
                }
                return upd;
              }
              return o;
            });
            localStorage.setItem('salik_recent_orders', JSON.stringify(updated));
          }
        } catch (e) {
          console.error(e);
        }

        // 2. Dispatch instant global events across all views and open modals
        window.dispatchEvent(new CustomEvent('salik_sync_orders'));
        window.dispatchEvent(new CustomEvent('salik_order_status_updated', { detail: { id: orderId, status: newStatus } }));
        window.dispatchEvent(new Event('storage'));
      } else {
        alert('Failed to update status');
      }
    } catch {
      alert('Error updating status');
    }
  };

  const handleAssignRider = async (orderId, riderId) => {
    try {
      const selectedRider = (riders || []).find(r => r.id === riderId);
      const res = await fetch(apiUrl(`/api/orders/${orderId}/rider`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riderId: riderId || null,
          riderName: selectedRider ? selectedRider.name : null,
          riderPhone: selectedRider ? selectedRider.phone : null
        })
      });
      if (res.ok) {
        onRefresh();
        // Update local cache
        try {
          const cleanId = String(orderId).replace(/^#/, '');
          const saved = localStorage.getItem('salik_recent_orders');
          if (saved) {
            const list = JSON.parse(saved);
            const updated = list.map(o => {
              if (String(o.id).replace(/^#/, '') === cleanId) {
                return {
                  ...o,
                  riderId: riderId || null,
                  riderName: selectedRider ? selectedRider.name : null,
                  riderPhone: selectedRider ? selectedRider.phone : null,
                  updatedAt: new Date().toISOString()
                };
              }
              return o;
            });
            localStorage.setItem('salik_recent_orders', JSON.stringify(updated));
          }
        } catch (e) {}

        window.dispatchEvent(new CustomEvent('salik_sync_orders'));
        window.dispatchEvent(new Event('storage'));
      } else {
        alert('Failed to assign rider');
      }
    } catch {
      alert('Error assigning rider');
    }
  };

  const onSelectStatus = (order, newStatus) => {
    if (!order || order.status === newStatus) return;
    if (String(order.status || '').toLowerCase() === 'delivered') {
      alert('Once an order is delivered, its status cannot be changed further.');
      return;
    }
    setStatusChangeConfirmModal({ order, newStatus });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusChangeConfirmModal || isUpdatingStatus) return;
    const { order, newStatus } = statusChangeConfirmModal;
    setIsUpdatingStatus(true);
    try {
      let riderData = null;
      if (newStatus === 'Out for Delivery' || newStatus === 'Preparing' || newStatus === 'Pending') {
        riderData = { riderId: null, riderName: null, riderPhone: null };
      }
      await handleStatusChange(order.id, newStatus, riderData);
      setStatusChangeConfirmModal(null);
    } finally {
      setIsUpdatingStatus(false);
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
      margin: 0mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      width: 72mm;
      max-width: 72mm;
      margin: 0 auto;
      padding: 2mm 1.5mm 10mm 1.5mm;
      color: #000;
      background: #fff;
      font-size: 10px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .receipt-container {
      width: 72mm;
      max-width: 72mm;
      margin: 0 auto;
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
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      color: #000;
    }
    .contact-info {
      font-size: 9.5px;
      font-weight: 600;
      margin-bottom: 4px;
      color: #000;
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
    .items-table .col-num { width: 16px; text-align: center; font-weight: 600; color: #000; }
    .items-table .col-qty { width: 22px; text-align: center; font-weight: 700; }
    .items-table .col-price { width: 38px; text-align: right; font-weight: 600; color: #000; }
    .items-table .col-total { width: 44px; text-align: right; font-weight: 700; }
    
    .item-name {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-weight: 600;
      font-size: 9px;
      color: #000;
    }
    .item-size {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 8.5px;
      font-weight: 600;
      color: #000;
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
    .totals-divider {
      height: 1.5px;
      background: #000;
      width: 100%;
      margin: 5px 0 4px 0;
    }
    .grand-total-row {
      display: flex;
      justify-content: space-between;
      font-size: 12.5px;
      font-weight: 700;
      padding-top: 1px;
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
      @page {
        size: 80mm auto;
        margin: 0mm;
      }
      html, body {
        width: 72mm !important;
        max-width: 72mm !important;
        margin: 0 auto !important;
        padding: 2mm 1mm 6mm 1mm !important;
      }
      .receipt-container {
        width: 72mm !important;
        max-width: 72mm !important;
        margin: 0 auto !important;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
  <!-- Header -->
  <div class="receipt-header">
    <div class="brand-title">SALIK FAST FOOD</div>
    <div class="brand-tagline">Taste That You Need</div>
    <div class="contact-info">
      Wah Model Town, Wah Cantt<br>
      Phone: 0309-5369472
    </div>
    <div class="order-badge">
      ${formatReceiptPaymentBadge(order.paymentMethod)}
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
          <td class="col-price">${formatPrice(it.price)}</td>
          <td class="col-total">${formatPrice(Number(it.price) * Number(it.quantity))}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Order Totals Box -->
  <div class="totals-box">
    <div class="totals-row">
      <span>Subtotal</span>
      <span class="bold">Rs. ${formatPrice(order.subtotal || 0)}</span>
    </div>
    <div class="totals-row">
      <span>Delivery Charges</span>
      <span class="bold">
        ${Number(order.deliveryFee) === 0 ? 'FREE' : `Rs. ${formatPrice(order.deliveryFee)}`}
      </span>
    </div>
    <div class="totals-divider"></div>
    <div class="grand-total-row">
      <span>TOTAL AMOUNT</span>
      <span>Rs. ${formatPrice(order.total || 0)}</span>
    </div>
  </div>

  <!-- Footer -->
  <div class="receipt-footer">
    <div class="bold" style="font-size: 10.5px; margin-bottom: 3px; text-transform: uppercase; font-family: 'Inter', sans-serif;">Thank you for ordering!</div>
    <div class="cut-line">✂ - - - - - - - - - - - - - - - - - - - - -</div>
  </div>

  </div><!-- /.receipt-container -->
</body>
</html>`;
  };

  const handlePrintReceipt = async (order) => {
    if (!order || isPrintingReceipt) return;
    try {
      setIsPrintingReceipt(true);
      const html = generateReceiptHtml(order);
      await printReceiptDocument(html, `Receipt-ORD-${order.id}`);
    } catch (e) {
      console.error('Print receipt error:', e);
      alert('Could not start printing: ' + (e?.message || e));
    } finally {
      setIsPrintingReceipt(false);
    }
  };

  const handleDownloadReceipt = async (order) => {
    if (!order || isDownloadingReceipt) return;
    try {
      setIsDownloadingReceipt(true);
      await downloadReceiptImage(receiptPaperRef.current, order);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (e) {
      console.error('Download receipt image failed:', e);
      alert('Could not download receipt image: ' + (e?.message || e));
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  const handleShareWhatsApp = async (order) => {
    if (!order || isSharingWhatsApp) return;
    try {
      setIsSharingWhatsApp(true);
      await shareReceiptImageWhatsApp(receiptPaperRef.current, order);
    } catch (e) {
      console.error('WhatsApp share error:', e);
      alert('Could not share receipt to WhatsApp: ' + (e?.message || e));
    } finally {
      setIsSharingWhatsApp(false);
    }
  };


  const filteredOrders = useMemo(() => {
    return (orders || []).filter(o => {
      const matchStatus = statusFilter === 'All' || o.status === statusFilter;
      const q = search.toLowerCase().trim();
      const matchSearch = !q || 
        o.id.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.phone?.includes(q);
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, search]);

  return (
    <div className="space-y-3 sm:space-y-5">
      
      {/* Pending Orders Alert Banner (shown until there are no pending orders left) */}
      {totalPendingOrders > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              You have <strong>{totalPendingOrders} pending {totalPendingOrders === 1 ? 'order' : 'orders'}</strong>
            </span>
          </div>
          <button
            onClick={() => {
              if (typeof onResetToAllPending === 'function') onResetToAllPending();
              setStatusFilter('Pending');
            }}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider flex-shrink-0 transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            View All Pending
          </button>
        </div>
      )}

      {/* Status Filters Bar & Search with Click-to-Drag & Wheel Scroll */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4">
        <div
          ref={statusScrollRef}
          onMouseDown={handleStatusMouseDown}
          onWheel={handleStatusWheel}
          className={`flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 select-none category-scroll ${
            isStatusGrabbing ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {['All', 'Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'].map(st => {
            const count = st === 'Pending'
              ? totalPendingOrders
              : st === 'Preparing'
              ? totalPreparingOrders
              : st === 'Out for Delivery'
              ? totalOutForDeliveryOrders
              : null;
            const isSelected = statusFilter === st;

            return (
              <button
                key={st}
                type="button"
                onDragStart={(e) => e.preventDefault()}
                onClick={() => handleStatusSelect(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all select-none inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 shadow-2xs'
                }`}
              >
                <span>{st}</span>
                {typeof count === 'number' && count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none ${
                      isSelected
                        ? 'bg-white text-orange-600'
                        : st === 'Pending'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : st === 'Preparing'
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : 'bg-purple-100 text-purple-900 border border-purple-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80 md:w-96 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by order ID, name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-zinc-200 shadow-2xs p-6">
          <Clock className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
          <h4 className="text-zinc-900 font-bold text-base">No orders found</h4>
          <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto">
            No orders match the current filter{statusFilter !== 'All' ? ` with status "${statusFilter}"` : ''}{search ? ` and search "${search}"` : ''}.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2.5 flex-wrap">
            {typeof onResetToAllPending === 'function' && (
              statusFilter === 'Pending' && totalPendingOrders > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    onResetToAllPending();
                    setStatusFilter('Pending');
                    setSearch('');
                  }}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  View Pending Orders ({totalPendingOrders})
                </button>
              ) : statusFilter === 'Preparing' && totalPreparingOrders > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    onResetToAllPending();
                    setStatusFilter('Preparing');
                    setSearch('');
                  }}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  View Preparing Orders ({totalPreparingOrders})
                </button>
              ) : statusFilter === 'Out for Delivery' && totalOutForDeliveryOrders > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    onResetToAllPending();
                    setStatusFilter('Out for Delivery');
                    setSearch('');
                  }}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  View Out for Delivery Orders ({totalOutForDeliveryOrders})
                </button>
              ) : null
            )}
            {(statusFilter !== 'All' || search) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('All');
                  setSearch('');
                }}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Reset Search & Status
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
                className={`bg-white rounded-2xl border transition-all ${
                  isDelivered
                    ? 'border-emerald-200/90 hover:border-emerald-300 shadow-2xs overflow-hidden'
                    : 'border-zinc-200/90 hover:border-zinc-300 shadow-2xs'
                }`}
              >
                {/* Minimized Single-Row Strip for Delivered Orders */}
                {isDelivered ? (
                  <div>
                    <div className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 bg-white">
                      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
                        <span className="font-sans font-bold text-xs sm:text-sm text-zinc-900">
                          #{order.id}
                        </span>
                        <span className="text-[11px] sm:text-xs text-zinc-500 font-medium">
                          {formatOrderDateTime(order.createdAt)}
                        </span>
                        <span className="text-zinc-300 hidden md:inline">•</span>
                        <span className="text-xs text-zinc-500 hidden md:inline">
                          {order.items?.reduce((acc, it) => acc + (it.quantity || 1), 0)} items
                        </span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="text-right">
                          <span className="text-[11px] text-zinc-500 mr-1.5 hidden sm:inline">Total:</span>
                          <span className="font-medium text-sm sm:text-base text-orange-600">
                            Rs. {formatPrice(order.total)}
                          </span>
                        </div>

                        {/* Status Badge (Immutable once Delivered) */}
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 select-none inline-flex items-center gap-1"
                          title="Delivered orders are final"
                        >
                          <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                          <span>Delivered</span>
                        </span>

                        {/* View Receipt Modal */}
                        <button
                          type="button"
                          onClick={() => setViewingReceiptOrder(order)}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 hover:text-indigo-800 shadow-2xs active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                          title="View & Print Receipt"
                          aria-label="View & Print Receipt"
                        >
                          <ReceiptText className="w-4 h-4" />
                        </button>

                        {/* Smooth Dropdown Toggle Button */}
                        <button
                          onClick={() => toggleOrderExpand(order.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 hover:text-zinc-900 text-xs font-semibold transition-colors cursor-pointer active:scale-95"
                          title={isExpanded ? 'Collapse Details' : 'View Details'}
                        >
                          <span>{isExpanded ? 'Hide' : 'View'}</span>
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
                          {/* Delivered by Rider Info */}
                          {order.riderName && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
                              <Bike className="w-4 h-4 text-purple-600 shrink-0" />
                              <span>Delivered by Rider: <strong>{order.riderName}</strong> {order.riderPhone && `(${order.riderPhone})`}</span>
                            </div>
                          )}

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
                                <span className="font-semibold text-zinc-800">{formatPaymentMethod(order.paymentMethod)}</span>
                              </div>

                              <div className="flex items-center justify-start md:justify-end gap-2 text-xs text-zinc-500">
                                <span>
                                  Subtotal:{' '}
                                  <strong className="text-zinc-800 font-semibold">
                                    Rs. {formatPrice(order.subtotal || 0)}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Delivery:{' '}
                                  <strong className={Number(order.deliveryFee) === 0 ? 'text-emerald-600 font-semibold' : 'text-zinc-800 font-semibold'}>
                                    {Number(order.deliveryFee) === 0 ? 'FREE' : `Rs. ${formatPrice(order.deliveryFee || 0)}`}
                                  </strong>
                                </span>
                              </div>

                              <div className="pt-0.5 flex items-center justify-start md:justify-end gap-1.5">
                                <span className="text-zinc-500 font-medium text-xs">Total:</span>
                                <span className="text-base sm:text-lg text-orange-600 font-medium">
                                  Rs. {formatPrice(order.total)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Ordered Items List */}
                          <div className="p-3 bg-white rounded-xl border border-zinc-200/90 text-xs">
                            <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                              <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                                Items Ordered:
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {(order.items || []).map((it, idx) => {
                                const itemSubtitle = resolveItemSubtitle(it);
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-start justify-between p-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-900 shadow-2xs select-none gap-2"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center flex-wrap gap-1">
                                        <span className="font-bold text-zinc-900 text-xs">
                                          {it.quantity}× {it.name}
                                        </span>
                                        {it.size && (
                                          <span className="font-semibold text-xs text-orange-600">
                                            ({it.size})
                                          </span>
                                        )}
                                      </div>
                                      {itemSubtitle && (
                                        <p className="text-[11px] text-zinc-500 font-medium mt-1 leading-snug break-words" title={itemSubtitle}>
                                          {itemSubtitle}
                                        </p>
                                      )}
                                    </div>
                                    <span className="font-bold flex-shrink-0 text-xs text-zinc-800 pt-0.5">
                                      Rs. {formatPrice(it.price * it.quantity)}
                                    </span>
                                  </div>
                                );
                              })}
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
                        <span className="font-sans font-bold text-sm text-orange-600">
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

                        {/* Delivery Rider Selector Button with Out for Delivery */}
                        {order.status === 'Out for Delivery' && (
                          <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                            <button
                              type="button"
                              onClick={() => setAssigningRiderOrder(order)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs max-w-[170px] sm:max-w-[220px] truncate active:scale-95 cursor-pointer ${
                                order.riderName
                                  ? 'bg-purple-100 hover:bg-purple-200/80 border-purple-300 text-purple-900'
                                  : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700'
                              }`}
                              title={order.riderName ? `Assigned: ${order.riderName} (${order.riderPhone || 'No phone'}) - Tap to change` : 'Tap to select rider'}
                            >
                              <span className="truncate">
                                {order.riderName ? order.riderName : 'Select Rider'}
                              </span>
                              <ChevronDown className="w-3.5 h-3.5 text-purple-600 shrink-0 opacity-70 ml-0.5" />
                            </button>

                            {order.riderPhone && (
                              <a
                                href={`tel:${order.riderPhone}`}
                                className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-colors flex items-center justify-center shrink-0 active:scale-95"
                                title={`Call Rider ${order.riderName || ''} (${order.riderPhone})`}
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Custom In-App Status Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              // If button's left edge is closer than 220px to viewport left edge (e.g. on mobile or wrapped header), align left-0.
                              // Otherwise align right-0 so it expands inward into the card
                              const alignLeft = rect.left < 220;
                              setActiveDropdownAlign(alignLeft ? 'left' : 'right');
                              setActiveStatusDropdownOrderId(activeStatusDropdownOrderId === order.id ? null : order.id);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer select-none shadow-2xs active:scale-95 ${
                              order.status === 'Pending'
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                : order.status === 'Preparing'
                                ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                                : order.status === 'Out for Delivery'
                                ? 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
                                : order.status === 'Delivered'
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200'
                            }`}
                          >
                            <span>{order.status}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 opacity-70 ${activeStatusDropdownOrderId === order.id ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Custom Dropdown Menu Popover */}
                          {activeStatusDropdownOrderId === order.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-40 bg-black/10 sm:bg-transparent" 
                                onClick={() => setActiveStatusDropdownOrderId(null)} 
                              />
                              <div 
                                className={`absolute top-full mt-1.5 w-48 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-zinc-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                                  activeDropdownAlign === 'left' ? 'left-0' : 'right-0 max-sm:left-0'
                                }`}
                              >
                                <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 mb-1">
                                  Update Order Status
                                </div>
                                {[
                                  { label: 'Pending', color: 'text-amber-800 hover:bg-amber-50', dot: 'bg-amber-500' },
                                  { label: 'Preparing', color: 'text-blue-800 hover:bg-blue-50', dot: 'bg-blue-500' },
                                  { label: 'Out for Delivery', color: 'text-purple-800 hover:bg-purple-50', dot: 'bg-purple-500' },
                                  { label: 'Delivered', color: 'text-emerald-800 hover:bg-emerald-50', dot: 'bg-emerald-500' },
                                  { label: 'Cancelled', color: 'text-red-800 hover:bg-red-50', dot: 'bg-red-500' },
                                ].map((st) => (
                                  <button
                                    key={st.label}
                                    type="button"
                                    onClick={() => {
                                      setActiveStatusDropdownOrderId(null);
                                      onSelectStatus(order, st.label);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-left transition-colors cursor-pointer ${st.color} ${
                                      order.status === st.label ? 'bg-zinc-100/90 font-bold' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`w-2.5 h-2.5 rounded-full ${st.dot} flex-shrink-0 shadow-xs`} />
                                      <span>{st.label}</span>
                                    </div>
                                    {order.status === st.label && (
                                      <Check className="w-3.5 h-3.5 text-zinc-700 stroke-[2.5]" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setViewingReceiptOrder(order)}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 hover:text-indigo-800 shadow-2xs active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                          title="View & Print Receipt"
                          aria-label="View & Print Receipt"
                        >
                          <ReceiptText className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmOrder(order)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 shadow-2xs active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                          title="Delete Order Permanently"
                          aria-label="Delete Order Permanently"
                        >
                          <Trash2 className="w-4 h-4" />
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
                          <span className="font-semibold text-zinc-800">{formatPaymentMethod(order.paymentMethod)}</span>
                        </div>

                        <div className="flex items-center justify-start md:justify-end gap-2 text-xs text-zinc-500">
                          <span>
                            Subtotal:{' '}
                            <strong className="text-zinc-800 font-semibold">
                              Rs. {formatPrice(order.subtotal || 0)}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Delivery:{' '}
                            <strong className={Number(order.deliveryFee) === 0 ? 'text-emerald-600 font-semibold' : 'text-zinc-800 font-semibold'}>
                              {Number(order.deliveryFee) === 0 ? 'FREE' : `Rs. ${formatPrice(order.deliveryFee || 0)}`}
                            </strong>
                          </span>
                        </div>

                        <div className="pt-0.5 flex items-center justify-start md:justify-end gap-1.5">
                          <span className="text-zinc-500 font-medium text-xs">Total:</span>
                          <span className="text-base sm:text-lg text-orange-600 font-medium">
                            Rs. {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ordered Items List */}
                    {(() => {
                      const isPreparationActive = order.status === 'Preparing';
                      return (
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/90 text-xs">
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-zinc-900">
                                {(order.items || []).length} {(order.items || []).length === 1 ? 'Item' : 'Items'}
                              </span>
                            </div>
                            {isPreparationActive && (() => {
                              const { prepared, total, isAllDone } = getOrderPreparedCount(order);
                              if (total === 0) return null;
                              if (isAllDone) {
                                return (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                                    <Check className="w-3 h-3 stroke-[3]" /> All Prepared ({prepared}/{total})
                                  </span>
                                );
                              }
                              if (prepared > 0) {
                                return (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100/90 px-2 py-0.5 rounded-full border border-orange-200">
                                    {prepared}/{total} Prepared • {total - prepared} left
                                  </span>
                                );
                              }
                              return (
                                <span className="text-[10px] text-zinc-400 font-medium">
                                  (Tap to mark prepared)
                                </span>
                              );
                            })()}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {(order.items || []).map((it, idx) => {
                              const itemSubtitle = resolveItemSubtitle(it);

                              if (!isPreparationActive) {
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-start justify-between p-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-2xs select-none gap-2"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center flex-wrap gap-1">
                                        <span className="font-bold text-xs text-zinc-900">
                                          {it.quantity}× {it.name}
                                        </span>
                                        {it.size && (
                                          <span className="font-semibold text-xs text-orange-600">
                                            ({it.size})
                                          </span>
                                        )}
                                      </div>
                                      {itemSubtitle && (
                                        <p className="text-[11px] text-zinc-500 font-medium mt-1 leading-snug break-words" title={itemSubtitle}>
                                          {itemSubtitle}
                                        </p>
                                      )}
                                    </div>
                                    <span className="font-bold flex-shrink-0 text-xs text-zinc-800 pt-0.5">
                                      Rs. {formatPrice(it.price * it.quantity)}
                                    </span>
                                  </div>
                                );
                              }

                              const isPrepared = Boolean(preparedItems[`${order.id}-${idx}`]);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => toggleItemPrepared(order.id, idx)}
                                  className={`flex items-start justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none group gap-2 ${
                                    isPrepared
                                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs'
                                      : 'bg-white hover:bg-zinc-50/90 border-zinc-200 text-zinc-900 shadow-2xs'
                                  }`}
                                  title={isPrepared ? "Item prepared! Click to unmark" : "Click to mark as prepared"}
                                >
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleItemPrepared(order.id, idx);
                                      }}
                                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all cursor-pointer mt-0.5 ${
                                        isPrepared
                                          ? 'bg-emerald-600 border border-emerald-700 text-white shadow-2xs active:scale-90'
                                          : 'bg-white border border-zinc-300 hover:border-emerald-500 hover:bg-emerald-50 text-transparent active:scale-90'
                                      }`}
                                      aria-label={isPrepared ? "Marked as prepared" : "Mark as prepared"}
                                    >
                                      <Check className={`w-3.5 h-3.5 stroke-[3] ${isPrepared ? 'opacity-100' : 'opacity-0 group-hover:opacity-40 group-hover:text-emerald-600'}`} />
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center flex-wrap gap-1">
                                        <span className="font-bold text-xs text-zinc-900">
                                          {it.quantity}× {it.name}
                                        </span>
                                        {it.size && (
                                          <span className="font-semibold text-xs text-orange-600">
                                            ({it.size})
                                          </span>
                                        )}
                                      </div>
                                      {itemSubtitle && (
                                        <p className={`text-[11px] font-medium mt-1 leading-snug break-words ${isPrepared ? 'text-emerald-700/90' : 'text-zinc-500'}`} title={itemSubtitle}>
                                          {itemSubtitle}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`font-bold flex-shrink-0 text-xs pt-0.5 ${isPrepared ? 'text-emerald-800' : 'text-zinc-800'}`}>
                                    Rs. {formatPrice(it.price * it.quantity)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
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
                  <span className="font-sans font-bold text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
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
                              <span className="text-[10px] text-orange-600 font-semibold block">Size: {item.size}</span>
                            )}
                            {resolveItemSubtitle(item) && (
                              <span className="text-[10px] text-zinc-500 font-medium block mt-0.5 break-words">
                                {resolveItemSubtitle(item)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-bold text-zinc-900">
                            Rs. {formatPrice(item.price * item.quantity)}
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
                  <span className="font-semibold text-zinc-900">Rs. {formatPrice(calcSubtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Delivery Fee</span>
                  <span className={calcDeliveryFee === 0 ? 'text-emerald-600 font-bold' : 'font-semibold text-zinc-900'}>
                    {calcDeliveryFee === 0 ? 'FREE (Threshold Met)' : `Rs. ${formatPrice(calcDeliveryFee)}`}
                  </span>
                </div>
                <div className="pt-2 border-t border-zinc-200 flex justify-between items-baseline">
                  <span className="font-display text-base text-zinc-900 font-bold uppercase tracking-wider">
                    Updated Total:
                  </span>
                  <span className="text-xl text-orange-600 font-medium">
                    Rs. {formatPrice(calcTotal)}
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
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-tab-fade"
          onClick={() => setViewingReceiptOrder(null)}
        >
          
          {/* Thermal Receipt Paper Card */}
          <div 
            className="relative w-full max-w-[400px] max-h-[92vh] max-h-[92dvh] bg-white text-black rounded-2xl shadow-2xl border border-zinc-300 font-sans text-xs leading-relaxed overflow-hidden flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Small Cross Button on Top Right to Close */}
            <button
              type="button"
              onClick={() => setViewingReceiptOrder(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-600 hover:text-black flex items-center justify-center cursor-pointer active:scale-90 transition-all shadow-2xs z-20"
              title="Close Receipt"
              aria-label="Close Receipt"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Printable Receipt Paper Area (Captured by html2canvas / direct renderer) */}
            <div 
              ref={receiptPaperRef} 
              id="admin-printable-receipt" 
              className="flex-1 overflow-y-auto overscroll-contain custom-dropdown-scroll bg-white text-black p-5 sm:p-6 font-sans text-xs leading-relaxed w-full"
              style={{ fontFamily: "'Plus Jakarta Sans', 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif" }}
            >
              {/* Store Header */}
              <div className="text-center pb-3 border-b border-dashed border-zinc-400 font-sans">
                <h2 className="text-base font-extrabold tracking-wider uppercase text-black">SALIK FAST FOOD</h2>
                <p className="text-[11px] text-black uppercase font-bold tracking-wide">Taste That You Need</p>
                <p className="text-[10.5px] text-black font-semibold mt-0.5">
                  Wah Model Town, Wah Cantt<br />
                  Phone: 0309-5369472
                </p>
                <div className="mt-2 inline-block px-3 py-1 border border-black font-bold uppercase tracking-wider text-[10px] leading-tight text-center">
                  <span>{formatReceiptPaymentBadge(viewingReceiptOrder.paymentMethod)}</span>
                </div>
              </div>

              {/* Order Metadata Box */}
              <div className="py-2.5 border-b border-dashed border-zinc-400 space-y-1 font-sans text-xs">
                <div className="flex justify-between">
                  <span className="font-bold">Order ID:</span>
                  <span className="font-bold">#{viewingReceiptOrder.id && viewingReceiptOrder.id.startsWith('#') ? viewingReceiptOrder.id.slice(1) : viewingReceiptOrder.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Date & Time:</span>
                  <span className="font-bold">{formatOrderDateTime(viewingReceiptOrder.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Customer:</span>
                  <span className="font-bold">{viewingReceiptOrder.customerName || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Phone:</span>
                  <span className="font-bold">{viewingReceiptOrder.phone || '-'}</span>
                </div>
                {viewingReceiptOrder.address && (
                  <div className="pt-0.5">
                    <span className="font-bold block">Delivery Address:</span>
                    <span className="block text-[11px] leading-tight text-zinc-700">{viewingReceiptOrder.address}</span>
                  </div>
                )}
                {viewingReceiptOrder.notes && (
                  <div className="pt-0.5 text-[11px] italic">
                    <span className="font-bold not-italic">Notes:</span> {viewingReceiptOrder.notes}
                  </div>
                )}
              </div>

              {/* Items Table - Proper Tabular Grid Design */}
              <div className="py-2.5">
                <table className="w-full text-left border-collapse border border-black text-xs">
                  <thead>
                    <tr className="font-sans font-bold text-[11px] uppercase tracking-wide border-b border-black text-black">
                      <th className="py-1 px-1.5 border-r border-black w-6 text-center">#</th>
                      <th className="py-1 px-2 border-r border-black">Item</th>
                      <th className="py-1 px-1.5 border-r border-black text-center w-8">Qty</th>
                      <th className="py-1 px-1.5 border-r border-black text-right w-12">Rate</th>
                      <th className="py-1 px-2 text-right w-14">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingReceiptOrder.items || []).map((it, idx) => (
                      <tr key={idx} className="align-top border-b border-black">
                        <td className="py-1 px-1.5 border-r border-black text-center text-xs font-semibold text-black">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-2 border-r border-black font-medium text-xs text-black">
                          <div>{it.name}</div>
                          {it.size && (
                            <span className="inline-block text-[10.5px] font-semibold text-black">
                              Size: {typeof it.size === 'string' ? it.size : it.size?.label}
                            </span>
                          )}
                        </td>
                        <td className="py-1 px-1.5 border-r border-black text-center font-bold text-xs text-black">
                          {it.quantity}
                        </td>
                        <td className="py-1 px-1.5 border-r border-black text-right text-xs font-semibold text-black">
                          {formatPrice(it.price)}
                        </td>
                        <td className="py-1 px-2 text-right font-bold text-xs text-black">
                          {formatPrice(Number(it.price) * Number(it.quantity))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="py-2.5 border-t border-dashed border-zinc-400 space-y-1 font-sans text-xs">
                <div className="flex justify-between text-zinc-700">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-bold">Rs. {formatPrice(viewingReceiptOrder.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between text-zinc-700">
                  <span className="font-medium">Delivery Charges</span>
                  <span className="font-bold">{Number(viewingReceiptOrder.deliveryFee) === 0 ? 'FREE' : `Rs. ${formatPrice(viewingReceiptOrder.deliveryFee)}`}</span>
                </div>
                <div className="my-1.5 h-[1.5px] bg-black w-full" />
                <div className="flex justify-between text-sm font-extrabold text-black">
                  <span>TOTAL AMOUNT</span>
                  <span>Rs. {formatPrice(viewingReceiptOrder.total || 0)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-2.5 border-t border-dashed border-zinc-400 text-[11px] space-y-1 text-zinc-700 font-sans">
                <p className="font-bold text-black uppercase tracking-wide">Thank you for ordering!</p>
                <p className="text-zinc-400 font-mono text-[9.5px]">✂ - - - - - - - - - - - - - - - - - - - - -</p>
              </div>
            </div>

            {/* Bottom Actions: Download Image, WhatsApp Share Image, Print */}
            <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-3 border-t border-dashed border-zinc-300 bg-zinc-50/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleDownloadReceipt(viewingReceiptOrder)}
                disabled={isDownloadingReceipt}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-xs disabled:opacity-60"
              >
                {isDownloadingReceipt ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : downloadSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-orange-400" />
                    <span>Download</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleShareWhatsApp(viewingReceiptOrder)}
                disabled={isSharingWhatsApp}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-xs disabled:opacity-60"
              >
                {isSharingWhatsApp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    <span>Sharing...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                    <span>WhatsApp</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handlePrintReceipt(viewingReceiptOrder)}
                disabled={isPrintingReceipt}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-xs disabled:opacity-60"
                title="Print Receipt via System Print / Printer"
              >
                {isPrintingReceipt ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Printer className="w-3.5 h-3.5 text-white" />
                )}
                <span className="hidden sm:inline">{isPrintingReceipt ? 'Printing...' : 'Print'}</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* CONFIRM STATUS CHANGE MODAL */}
      {statusChangeConfirmModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isUpdatingStatus) setStatusChangeConfirmModal(null);
          }}
        >
          <div
            className="relative bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95 duration-150 text-left my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <button
              type="button"
              disabled={isUpdatingStatus}
              onClick={() => setStatusChangeConfirmModal(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center cursor-pointer transition-colors active:scale-95 disabled:opacity-50"
              title="Close"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon + Title */}
            <div className="flex items-start gap-3.5 pr-6">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">
                  {statusChangeConfirmModal.order.status === 'Delivered' ? 'Change Delivered Order Status?' : 'Change Order Status?'}
                </h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {statusChangeConfirmModal.order.status === 'Delivered' ? (
                    <>This order has already been marked as <strong className="text-emerald-700 font-semibold">Delivered</strong>. Are you sure you want to change its status?</>
                  ) : (
                    <>Are you sure you want to change the status of order <strong className="text-zinc-900 font-semibold">#{statusChangeConfirmModal.order.id}</strong> to <strong className="text-orange-600 font-semibold">{statusChangeConfirmModal.newStatus}</strong>?</>
                  )}
                </p>
              </div>
            </div>

            {/* Order Details Preview Box */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60">
                <span className="text-zinc-500 font-medium">Order ID:</span>
                <span className="font-sans font-bold text-zinc-900 text-sm">
                  #{statusChangeConfirmModal.order.id}
                </span>
              </div>

              {statusChangeConfirmModal.order.customerName && (
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60">
                  <span className="text-zinc-500 font-medium">Customer:</span>
                  <span className="font-semibold text-zinc-900">
                    {statusChangeConfirmModal.order.customerName}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60">
                <span className="text-zinc-500 font-medium">Total Amount:</span>
                <span className="font-semibold text-orange-600 text-sm">
                  Rs. {formatPrice(statusChangeConfirmModal.order.total)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <span className="text-zinc-500 font-medium">Status Change:</span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    statusChangeConfirmModal.order.status === 'Pending'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : statusChangeConfirmModal.order.status === 'Preparing'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : statusChangeConfirmModal.order.status === 'Out for Delivery'
                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                      : statusChangeConfirmModal.order.status === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }`}>
                    {statusChangeConfirmModal.order.status}
                  </span>
                  <span className="text-zinc-400 font-bold">→</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    statusChangeConfirmModal.newStatus === 'Pending'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : statusChangeConfirmModal.newStatus === 'Preparing'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : statusChangeConfirmModal.newStatus === 'Out for Delivery'
                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                      : statusChangeConfirmModal.newStatus === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }`}>
                    {statusChangeConfirmModal.newStatus}
                  </span>
                </div>
              </div>
            </div>



            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => setStatusChangeConfirmModal(null)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {statusChangeConfirmModal.order.status === 'Delivered' ? 'No, Keep Delivered' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleConfirmStatusChange}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Yes, Change Status</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom In-App Rider Assignment Modal */}
      {assigningRiderOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setAssigningRiderOrder(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/15 text-white backdrop-blur-xs">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    Select Delivery Rider
                  </h3>
                  <p className="text-xs text-purple-200 font-medium">
                    Order #{assigningRiderOrder.id} • {assigningRiderOrder.customerName || 'Customer'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningRiderOrder(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-purple-100 hover:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-zinc-100">
              {riders.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Bike className="w-10 h-10 text-purple-300 mx-auto" />
                  <p className="text-sm font-bold text-zinc-700">No Riders Added Yet</p>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Please go to the Riders tab in the admin panel to add your delivery riders first.
                  </p>
                </div>
              ) : (
                <>
                  {/* Option: Unassign Rider */}
                  <div className="pb-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await handleAssignRider(assigningRiderOrder.id, '');
                        setAssigningRiderOrder(null);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                        !assigningRiderOrder.riderId
                          ? 'bg-purple-50/90 border-purple-300 ring-2 ring-purple-200 text-purple-950 shadow-xs'
                          : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          !assigningRiderOrder.riderId ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                        }`}>
                          ✕
                        </div>
                        <div>
                          <span className="block font-bold text-zinc-900">Unassigned (No Rider)</span>
                          <span className={`text-[11px] ${!assigningRiderOrder.riderId ? 'text-purple-700 font-medium' : 'text-zinc-500'}`}>
                            Do not assign any rider to this parcel
                          </span>
                        </div>
                      </div>
                      {!assigningRiderOrder.riderId && <Check className="w-4 h-4 text-purple-700 stroke-[2.5]" />}
                    </button>
                  </div>

                  {/* Rider Cards */}
                  <div className="pt-2 space-y-2">
                    {riders.map(r => {
                      const isCurrent = assigningRiderOrder.riderId === r.id;
                      const activeCount = (allOrders && allOrders.length > 0 ? allOrders : orders).filter(
                        o => o.riderId === r.id && o.status === 'Out for Delivery'
                      ).length;

                      return (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isCurrent
                              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-300 shadow-xs'
                              : 'bg-white hover:bg-purple-50/50 border-zinc-200'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={async () => {
                              await handleAssignRider(assigningRiderOrder.id, r.id);
                              setAssigningRiderOrder(null);
                            }}
                            className="flex-1 flex items-center gap-3 text-left cursor-pointer"
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                              isCurrent ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'
                            }`}>
                              <Bike className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-zinc-900 truncate">{r.name}</span>
                                {r.phone && (
                                  <span className="text-xs text-zinc-500 font-medium">
                                    • {r.phone}
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-600 text-white shadow-2xs">
                                    Assigned
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[11px] font-semibold ${
                                  activeCount > 0 ? 'text-amber-600' : 'text-emerald-600'
                                }`}>
                                  {activeCount > 0 ? `${activeCount} parcel${activeCount > 1 ? 's' : ''} on way` : 'Available'}
                                </span>
                              </div>
                            </div>
                          </button>

                          {r.phone && (
                            <a
                              href={`tel:${r.phone}`}
                              className="ml-2 p-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors shrink-0 active:scale-95"
                              title={`Call ${r.name}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Tap rider to assign immediately</span>
              <button
                type="button"
                onClick={() => setAssigningRiderOrder(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation Modal */}
      {deleteConfirmOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => !isDeletingOrder && setDeleteConfirmOrder(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-extrabold text-base sm:text-lg text-zinc-900 leading-tight">
                  Delete Order Permanently?
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Are you sure you want to permanently delete order <span className="font-bold text-zinc-900">#{deleteConfirmOrder.id}</span> for <span className="font-bold text-zinc-900">{deleteConfirmOrder.customerName}</span>?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Amount:</span>
                <span className="font-bold text-zinc-900">Rs. {formatPrice(deleteConfirmOrder.total || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Current Status:</span>
                <span className="font-bold text-zinc-900">{deleteConfirmOrder.status}</span>
              </div>
              <div className="text-[11px] text-red-600 font-semibold pt-1 border-t border-zinc-200">
                ⚠️ This action cannot be undone and will erase this order from history.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={() => setDeleteConfirmOrder(null)}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={handleDeleteOrder}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {isDeletingOrder ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
