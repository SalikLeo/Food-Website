import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  Wallet,
  Package,
  Search,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Clock,
  Flame,
  PieChart,
  X
} from 'lucide-react';
import { formatPrice } from '../../utils/formatters';
import CustomSelect from '../Common/CustomSelect';

export default function ItemSalesManager({
  orders = [],
  products = [],
  deals = [],
  familyDeal = null
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('qty_desc');
  const [includeUnsold, setIncludeUnsold] = useState(false);

  // Only consider orders with 'Delivered' status as completed sales
  const filteredOrders = useMemo(() => {
    return orders.filter(o => o.status === 'Delivered');
  }, [orders]);

  // Aggregate item sales
  const salesData = useMemo(() => {
    const map = {};

    // 1. Process orders items
    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = (item.name || 'Unknown').trim();
        if (!map[key]) {
          map[key] = {
            name: key,
            category: item.category || 'menu',
            image: item.image,
            totalQty: 0,
            totalRevenue: 0,
            ordersCount: 0,
            sizes: {},
            lastSoldAt: order.createdAt
          };
        }

        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;

        map[key].totalQty += qty;
        map[key].totalRevenue += price * qty;
        map[key].ordersCount += 1;

        if (item.size) {
          map[key].sizes[item.size] = (map[key].sizes[item.size] || 0) + qty;
        }

        if (!map[key].image && item.image) {
          map[key].image = item.image;
        }

        if (new Date(order.createdAt) > new Date(map[key].lastSoldAt || 0)) {
          map[key].lastSoldAt = order.createdAt;
        }
      });
    });

    // 2. Optionally merge unsold items from catalog so admin can see zero-sale items
    if (includeUnsold) {
      // Products
      (products || []).forEach(p => {
        const key = p.name.trim();
        if (!map[key]) {
          map[key] = {
            name: key,
            category: p.category || 'menu',
            image: p.image,
            totalQty: 0,
            totalRevenue: 0,
            ordersCount: 0,
            sizes: {},
            lastSoldAt: null
          };
        }
      });

      // Deals
      (deals || []).forEach(d => {
        const key = d.name.trim();
        if (!map[key]) {
          map[key] = {
            name: key,
            category: 'deals',
            image: d.image,
            totalQty: 0,
            totalRevenue: 0,
            ordersCount: 0,
            sizes: {},
            lastSoldAt: null
          };
        }
      });

      // Family Deal
      if (familyDeal && !map[familyDeal.name.trim()]) {
        const key = familyDeal.name.trim();
        map[key] = {
          name: key,
          category: 'deals',
          image: familyDeal.image,
          totalQty: 0,
          totalRevenue: 0,
          ordersCount: 0,
          sizes: {},
          lastSoldAt: null
        };
      }
    }

    // Attach product images if missing
    Object.values(map).forEach(item => {
      if (!item.image) {
        const matchedProd = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
        if (matchedProd && matchedProd.image) {
          item.image = matchedProd.image;
          if (matchedProd.category) item.category = matchedProd.category;
        }
      }
    });

    return Object.values(map);
  }, [filteredOrders, products, deals, familyDeal, includeUnsold]);

  // Overall statistics
  const stats = useMemo(() => {
    let totalUnits = 0;
    let totalRev = 0;
    let topSeller = null;
    let topEarner = null;

    salesData.forEach(item => {
      totalUnits += item.totalQty;
      totalRev += item.totalRevenue;

      if (!topSeller || item.totalQty > topSeller.totalQty) {
        topSeller = item;
      }
      if (!topEarner || item.totalRevenue > topEarner.totalRevenue) {
        topEarner = item;
      }
    });

    return {
      totalUnits,
      totalRev,
      uniqueSold: salesData.filter(i => i.totalQty > 0).length,
      topSeller: topSeller?.totalQty > 0 ? topSeller : null,
      topEarner: topEarner?.totalRevenue > 0 ? topEarner : null
    };
  }, [salesData]);

  // Filtered and Sorted list
  const displayItems = useMemo(() => {
    let list = [...salesData];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter(item => item.category === selectedCategory);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'qty_desc') return b.totalQty - a.totalQty;
      if (sortBy === 'rev_desc') return b.totalRevenue - a.totalRevenue;
      if (sortBy === 'orders_desc') return b.ordersCount - a.ordersCount;
      if (sortBy === 'qty_asc') return a.totalQty - b.totalQty;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [salesData, search, selectedCategory, sortBy]);

  // Max units sold by any single item for the relative popularity progress bar
  const maxQty = useMemo(() => {
    return Math.max(1, ...salesData.map(i => i.totalQty));
  }, [salesData]);

  // Extract distinct categories available
  const availableCategories = useMemo(() => {
    const set = new Set();
    salesData.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [salesData]);

  return (
    <div className="space-y-6">
      
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Top Seller */}
        <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
              #1 Best Seller
            </span>
            <span className="font-bold text-zinc-900 text-sm block truncate" title={stats.topSeller?.name || 'None yet'}>
              {stats.topSeller ? stats.topSeller.name : 'No sales yet'}
            </span>
            <span className="text-xs text-orange-600 font-bold">
              {stats.topSeller ? `${stats.topSeller.totalQty} units sold` : '—'}
            </span>
          </div>
        </div>

        {/* Card 2: Top Earning Item */}
        <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
              Highest Revenue Item
            </span>
            <span className="font-bold text-zinc-900 text-sm block truncate" title={stats.topEarner?.name || 'None yet'}>
              {stats.topEarner ? stats.topEarner.name : 'No sales yet'}
            </span>
            <span className="text-xs text-emerald-700 font-bold">
              {stats.topEarner ? `Rs. ${formatPrice(stats.topEarner.totalRevenue)}` : '—'}
            </span>
          </div>
        </div>

        {/* Card 3: Total Food Units Sold */}
        <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
              Total Food Items Sold
            </span>
            <span className="font-sans text-2xl text-zinc-900 font-bold block leading-tight">
              {formatPrice(stats.totalUnits)}
            </span>
            <span className="text-[11px] text-zinc-500 block">
              across {filteredOrders.length} orders
            </span>
          </div>
        </div>

        {/* Card 4: Total Food Sales */}
        <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block">
              Food Sales Revenue
            </span>
            <span className="font-sans text-2xl text-orange-600 font-bold block leading-tight">
              Rs. {formatPrice(stats.totalRev)}
            </span>
            <span className="text-[11px] text-zinc-500 block">
              {stats.uniqueSold} distinct dishes ordered
            </span>
          </div>
        </div>

      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search item name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-2xs"
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

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Category Filter */}
            <CustomSelect
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...availableCategories.map(cat => ({ value: cat, label: cat }))
              ]}
              buttonClassName="py-2 px-3 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 focus:outline-none focus:border-orange-500 shadow-2xs capitalize cursor-pointer font-medium"
              menuClassName="w-44"
            />

            {/* Sort Dropdown */}
            <CustomSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'qty_desc', label: 'Sort: Most Sold (Units)' },
                { value: 'rev_desc', label: 'Sort: Highest Revenue (Rs.)' },
                { value: 'orders_desc', label: 'Sort: Most Frequent Orders' },
                { value: 'qty_asc', label: 'Sort: Least Sold' },
                { value: 'name_asc', label: 'Sort: Item Name (A-Z)' }
              ]}
              buttonClassName="py-2 px-3 rounded-xl bg-white border border-zinc-300 text-xs text-zinc-900 focus:outline-none focus:border-orange-500 shadow-2xs cursor-pointer font-medium"
              menuClassName="w-56"
            />
          </div>
        </div>

        {/* Sub-bar: show unsold items checkbox */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-zinc-600 select-none">
            <input
              type="checkbox"
              checked={includeUnsold}
              onChange={(e) => setIncludeUnsold(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-orange-600 focus:ring-orange-500 border-zinc-300 cursor-pointer"
            />
            <span>Include 0 sales items</span>
          </label>

          <span className="text-zinc-400 font-medium text-[11px]">
            {displayItems.length} Items
          </span>
        </div>
      </div>

      {/* Sales Leaderboard Table */}
      {displayItems.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-zinc-200 shadow-2xs">
          <Package className="w-10 h-10 mx-auto text-zinc-400 mb-2" />
          <p className="text-zinc-600 font-medium">No sales data found matching the selected filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700">
              <thead className="bg-zinc-50 text-zinc-500 uppercase text-[10px] tracking-wider border-b border-zinc-200 font-bold">
                <tr className="divide-x divide-zinc-200/80">
                  <th className="px-4 py-3.5 text-center w-14">Rank</th>
                  <th className="px-4 py-3.5">Item Name</th>
                  <th className="px-4 py-3.5">Size</th>
                  <th className="px-4 py-3.5 text-center">Popularity</th>
                  <th className="px-4 py-3.5 text-center">Sold</th>
                  <th className="px-5 py-3.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {displayItems.map((item, index) => {
                  const rank = index + 1;
                  const percentOfTop = maxQty > 0 ? Math.round((item.totalQty / maxQty) * 100) : 0;
                  const percentOfTotal = stats.totalUnits > 0 ? ((item.totalQty / stats.totalUnits) * 100).toFixed(1) : 0;

                  return (
                    <tr key={item.name} className="divide-x divide-zinc-100 hover:bg-zinc-50/80 transition-colors">
                      {/* Rank */}
                      <td className="px-4 py-3.5 text-center">
                        {rank === 1 && item.totalQty > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs shadow-2xs" title="#1 Best Seller">
                            🥇
                          </span>
                        ) : rank === 2 && item.totalQty > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-200 text-zinc-800 border border-zinc-300 font-extrabold text-xs shadow-2xs" title="#2 Best Seller">
                            🥈
                          </span>
                        ) : rank === 3 && item.totalQty > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-900 border border-orange-300 font-extrabold text-xs shadow-2xs" title="#3 Best Seller">
                            🥉
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 text-zinc-600 font-bold text-[11px]">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Item Details */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image || '/assets/images/cat-special-CdXGKIOV.jpg'}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover bg-zinc-100 border border-zinc-200 flex-shrink-0"
                            onError={(e) => {
                              e.target.src = '/assets/deal-family.png';
                            }}
                          />
                          <div>
                            <span className="font-bold text-zinc-900 block text-[13px]">
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Size */}
                      <td className="px-4 py-3.5">
                        {Object.keys(item.sizes).length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.keys(item.sizes).map((sz) => (
                              <span
                                key={sz}
                                className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-800 text-[10px] font-semibold"
                              >
                                {sz}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-[11px] italic">Standard</span>
                        )}
                      </td>

                      {/* Popularity Visual Bar */}
                      <td className="px-4 py-3.5 text-center min-w-[140px]">
                        <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              rank === 1
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : 'bg-gradient-to-r from-orange-500 to-amber-500'
                            }`}
                            style={{ width: `${Math.max(item.totalQty > 0 ? 5 : 0, percentOfTop)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-400 mt-1 block">
                          {item.totalQty > 0 ? `${percentOfTotal}% of sales` : '0%'}
                        </span>
                      </td>

                      {/* Units Sold */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="font-sans text-base font-bold text-zinc-900 block leading-tight">
                          {formatPrice(item.totalQty)}
                        </span>
                      </td>

                      {/* Total Revenue */}
                      <td className="px-5 py-3.5 text-right">
                        <span className="font-sans text-sm font-semibold text-orange-600 block leading-tight">
                          Rs. {formatPrice(item.totalRevenue)}
                        </span>
                        {item.totalQty > 0 && (
                          <span className="text-[10px] text-zinc-400">
                            Rs. {formatPrice(Math.round(item.totalRevenue / item.totalQty))}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
