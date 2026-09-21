import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  ShoppingBag,
  Flame,
  DollarSign,
  Clock,
  LogOut,
  ArrowLeft,
  RefreshCw,
  Store,
  Truck,
  TrendingUp,
  Star,
  Settings
} from 'lucide-react';
import ProductManager from './ProductManager';
import OrdersManager from './OrdersManager';
import DealsManager from './DealsManager';
import DeliverySettingsManager from './DeliverySettingsManager';
import ItemSalesManager from './ItemSalesManager';
import ReviewManager from './ReviewManager';
import { apiUrl, APP_MODE } from '../../config/api';

export default function AdminDashboard({ onLogout, onBackToStore }) {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [deals, setDeals] = useState([]);
  const [familyDeal, setFamilyDeal] = useState(null);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState({ deliveryFee: 100, minOrder: 500 });
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalDeals: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [statsTimeFilter, setStatsTimeFilter] = useState('today'); // 'today' | 'monthly' | 'all'

  // Format local date string YYYY-MM-DD
  const getLocalDateStr = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filteredOrdersForStats = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (statsTimeFilter === 'today') {
      return orders.filter(o => o.createdAt && getLocalDateStr(o.createdAt) === todayStr);
    }
    if (statsTimeFilter === 'monthly') {
      return orders.filter(o => o.createdAt && getLocalDateStr(o.createdAt).slice(0, 7) === thisMonthStr);
    }
    return orders;
  }, [orders, statsTimeFilter]);

  const displayStats = useMemo(() => {
    if (statsTimeFilter === 'all') {
      return {
        totalProducts: stats.totalProducts || products.length,
        totalDeals: stats.totalDeals || (deals.length + (familyDeal ? 1 : 0)),
        totalOrders: stats.totalOrders || orders.length,
        pendingOrders: orders.filter(o => o.status === 'Pending').length,
        totalRevenue: stats.totalRevenue || orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + (Number(o.total) || 0), 0)
      };
    }

    const totalOrders = filteredOrdersForStats.length;
    const pendingOrders = filteredOrdersForStats.filter(o => o.status === 'Pending').length;
    const totalRevenue = filteredOrdersForStats
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    return {
      totalProducts: stats.totalProducts || products.length,
      totalDeals: stats.totalDeals || (deals.length + (familyDeal ? 1 : 0)),
      totalOrders,
      pendingOrders,
      totalRevenue
    };
  }, [statsTimeFilter, filteredOrdersForStats, stats, products.length, deals.length, familyDeal, orders]);

  // Derived counts for tab buttons
  const pendingOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'Pending').length;
  }, [orders]);

  const totalDealsCount = useMemo(() => {
    return stats.totalDeals || (deals.length + (familyDeal ? 1 : 0));
  }, [stats.totalDeals, deals.length, familyDeal]);

  const totalItemsSold = useMemo(() => {
    return orders
      .filter(o => o.status === 'Delivered')
      .reduce((sum, o) => {
        const itemQty = (o.items || []).reduce((q, item) => q + (Number(item.quantity) || 1), 0);
        return sum + itemQty;
      }, 0);
  }, [orders]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowLogoutConfirm(false);
      }
    };
    if (showLogoutConfirm) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutConfirm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodsRes, catsRes, dealsRes, ordersRes, statsRes, settingsRes, reviewsRes] = await Promise.all([
        fetch(apiUrl('/api/products')).then(r => r.json()),
        fetch(apiUrl('/api/categories')).then(r => r.json()),
        fetch(apiUrl('/api/deals')).then(r => r.json()),
        fetch(apiUrl('/api/orders')).then(r => r.json()),
        fetch(apiUrl('/api/stats')).then(r => r.json()),
        fetch(apiUrl('/api/settings')).then(r => r.json()).catch(() => ({ deliveryFee: 100 })),
        fetch(apiUrl('/api/reviews')).then(r => r.json()).catch(() => [])
      ]);

      setProducts(prodsRes || []);
      setCategories(catsRes || []);
      setDeals(dealsRes?.deals || []);
      setFamilyDeal(dealsRes?.familyDeal || null);
      setOrders(ordersRes || []);
      setStats(statsRes || {});
      setReviews(reviewsRes || []);
      if (settingsRes && typeof settingsRes.deliveryFee === 'number') {
        setSettings(settingsRes);
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll orders every 20 seconds
    const interval = setInterval(() => {
      fetch(apiUrl('/api/orders'))
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setOrders(data);
        })
        .catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#d5d8de] text-zinc-900 admin-app-container">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-zinc-300/80 text-zinc-900 sticky top-0 z-30 shadow-xs mobile-app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/salik-logo.png"
              alt="Salik Fast Food"
              className="h-10 w-auto object-contain"
            />
            <div>
              <h1 className="font-display tracking-wider text-xl uppercase leading-none text-zinc-900">
                Salik Fast Food Management Panel
              </h1>
              <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">
                Store Administrator
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : ''}`} />
            </button>

            {APP_MODE !== 'admin' && (
              <button
                onClick={onBackToStore}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-xs font-semibold text-zinc-800 transition-colors cursor-pointer"
              >
                <Store className="w-4 h-4 text-orange-600" />
                <span className="hidden sm:inline">Storefront</span>
              </button>
            )}

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-semibold text-red-700 transition-colors cursor-pointer"
              title="Logout of Admin Panel"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* Stats Section with Time Filter Buttons */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                Performance Overview
              </h2>
            </div>

            {/* Time Filter Buttons: Today, Monthly, All Time */}
            <div className="flex items-center gap-1 p-1 bg-white border border-zinc-300/80 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setStatsTimeFilter('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  statsTimeFilter === 'today'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setStatsTimeFilter('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  statsTimeFilter === 'monthly'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setStatsTimeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  statsTimeFilter === 'all'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                All Time
              </button>
            </div>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            
            <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                  Total Products
                </span>
                <span className="font-sans text-2xl text-zinc-900 font-bold block leading-tight">
                  {displayStats.totalProducts}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                  Total Deals
                </span>
                <span className="font-sans text-2xl text-zinc-900 font-bold block leading-tight">
                  {displayStats.totalDeals}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                  {statsTimeFilter === 'today' ? 'Today Orders' : statsTimeFilter === 'monthly' ? 'Monthly Orders' : 'Total Orders'}
                </span>
                <span className="font-sans text-2xl text-zinc-900 font-bold block leading-tight">
                  {displayStats.totalOrders}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                  Pending Orders
                </span>
                <span className="font-sans text-2xl text-amber-600 font-bold block leading-tight">
                  {displayStats.pendingOrders}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs flex items-center gap-3.5 col-span-2 lg:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
                  {statsTimeFilter === 'today' ? 'Today Revenue' : statsTimeFilter === 'monthly' ? 'Monthly Revenue' : 'Total Revenue'}
                </span>
                <span className="font-sans text-xl font-bold text-emerald-700 block leading-tight">
                  Rs. {displayStats.totalRevenue.toLocaleString()}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:items-center gap-2 sm:gap-2.5 border-b border-zinc-300/80 pb-3 w-full">
          <button
            onClick={() => setActiveTab('products')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'products'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <Package className="w-4 h-4 flex-shrink-0" />
            <span>Menu ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <ShoppingBag className="w-4 h-4 flex-shrink-0" />
            <span>Orders ({pendingOrdersCount})</span>
            {pendingOrdersCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('deals')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'deals'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <Flame className="w-4 h-4 flex-shrink-0" />
            <span>Deals ({totalDealsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            <span>Sales ({totalItemsSold})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <Star className="w-4 h-4 flex-shrink-0" />
            <span>Reviews ({reviews.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`col-span-1 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'settings' || activeTab === 'delivery'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-2xs'
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Settings</span>
          </button>
        </div>

        {/* Tab Content with Smooth Fade-in Transition */}
        <div key={activeTab} className="animate-fade-in">
          {activeTab === 'products' && (
            <ProductManager
              products={products}
              categories={categories}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersManager
              orders={orders}
              products={products}
              deals={deals}
              familyDeal={familyDeal}
              settings={settings}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'deals' && (
            <DealsManager
              deals={deals}
              familyDeal={familyDeal}
              products={products}
              categories={categories}
              onRefresh={fetchData}
            />
          )}

          {activeTab === 'sales' && (
            <ItemSalesManager
              orders={orders}
              products={products}
              deals={deals}
              familyDeal={familyDeal}
            />
          )}

          {activeTab === 'reviews' && (
            <ReviewManager
              reviews={reviews}
              onRefresh={fetchData}
            />
          )}

          {(activeTab === 'settings' || activeTab === 'delivery') && (
            <DeliverySettingsManager
              onRefresh={fetchData}
            />
          )}
        </div>

      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95 duration-150 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-900">
                Confirm Logout
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Are you sure you want to log out of the Salik Fast Food Management Panel?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Yes, Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
