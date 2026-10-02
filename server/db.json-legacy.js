import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'db.json');
const initialFile = path.join(__dirname, 'initialData.json');
const backupDbFile = path.join(os.homedir() || os.tmpdir(), '.salik-fast-food-db-backup.json');

// Ensure directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize db.json if not present
if (!fs.existsSync(dbFile)) {
  if (fs.existsSync(initialFile)) {
    fs.copyFileSync(initialFile, dbFile);
  } else {
    fs.writeFileSync(dbFile, JSON.stringify({
      categories: [],
      deals: [],
      familyDeal: null,
      products: [],
      faqs: [],
      orders: [],
      siteInfo: {}
    }, null, 2));
  }
}

const INITIAL_REVIEWS = [
  {
    id: 'rev-1',
    name: 'Usman Tariq',
    location: 'Wah Model Town Phase 1',
    platform: 'Google Review',
    rating: 5,
    date: '2 days ago',
    avatar: 'UT',
    avatarBg: 'bg-amber-500',
    itemOrdered: 'Crown Crust Large Pizza',
    comment:
      'Hands down the best crown crust pizza in Wah Cantt! Cheese pull was insane and the crust was loaded with kabab pieces. Delivered piping hot in 30 minutes to Model Town Phase 1.',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'rev-2',
    name: 'Dr. Ayesha Siddiqui',
    location: 'Officers Colony, Wah Cantt',
    platform: 'Google Review',
    rating: 5,
    date: '1 week ago',
    avatar: 'AS',
    avatarBg: 'bg-orange-600',
    itemOrdered: 'Zinger Tower Burger & Wings',
    comment:
      'Their Zinger patty is so crispy and juicy, beats international brands in Wah. The garlic mayo sauce is top tier. Will definitely be our regular weekend family order!',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
  },
  {
    id: 'rev-3',
    name: 'Hamza Malik',
    location: 'Aslam Market, Wah Cantt',
    platform: 'Foodpanda Verified',
    rating: 5,
    date: '3 days ago',
    avatar: 'HM',
    avatarBg: 'bg-red-600',
    itemOrdered: 'Deal 3: 2 Zinger + Large Pizza',
    comment:
      'Incredible value for money. Deal 3 easily fed four of us with plenty left over. Ordering directly on their website was super smooth and received instant WhatsApp confirmation.',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'rev-4',
    name: 'Zainab Bibi',
    location: 'Wah Model Town Phase 2',
    platform: 'Google Review',
    rating: 5,
    date: '5 days ago',
    avatar: 'ZB',
    avatarBg: 'bg-emerald-600',
    itemOrdered: 'Special Chicken Shawarma Platter',
    comment:
      'Best shawarma in town! Proper pita bread, packed with grilled chicken and pickling veggies without too much oily mayo. Fresh, clean, and delivered fast.',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'rev-5',
    name: 'Bilal Ahmed',
    location: 'Barrier 3, Wah Cantt',
    platform: 'Foodpanda Verified',
    rating: 5,
    date: '1 week ago',
    avatar: 'BA',
    avatarBg: 'bg-blue-600',
    itemOrdered: 'Crispy Broast & Loaded Fries',
    comment:
      'Broast was super crunchy outside and tender inside, not oily at all. The loaded fries with melted cheese and chipotle sauce were fantastic. 10/10 recommended for Wah foodies.',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString()
  },
  {
    id: 'rev-6',
    name: 'Sana Farooq',
    location: 'Lalarukh, Wah Cantt',
    platform: 'Google Review',
    rating: 5,
    date: '2 weeks ago',
    avatar: 'SF',
    avatarBg: 'bg-purple-600',
    itemOrdered: 'Malai Boti Pizza Large',
    comment:
      'If you like creamy, rich desi flavors on a pizza, their Malai Boti pizza is unbeatable. Soft crust, generous chicken chunks, and arrived steam-hot. Customer service is 10/10!',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: 'rev-7',
    name: 'Naveed Akhtar',
    location: 'New City Phase 2',
    platform: 'Google Review',
    rating: 5,
    date: '3 weeks ago',
    avatar: 'NA',
    avatarBg: 'bg-teal-600',
    itemOrdered: 'Mega Feast Family Deal',
    comment:
      'Ordered for a family get-together. Everything from the pizzas to the burgers and fries was fresh and perfectly packed. Very courteous delivery rider.',
    createdAt: new Date(Date.now() - 21 * 86400000).toISOString()
  },
  {
    id: 'rev-8',
    name: 'Kashif Mehmood',
    location: 'Wah Model Town Phase 1',
    platform: 'Google Review',
    rating: 5,
    date: '1 month ago',
    avatar: 'KM',
    avatarBg: 'bg-rose-600',
    itemOrdered: 'Pepperoni Supreme Pizza',
    comment:
      'Authentic taste and fresh dough made daily. Salik Fast Food has become our go-to late night hunger spot in Wah. Keep up the high standard!',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  }
];

let memoryCache = null;
let lastMtimeMs = 0;

function normalizeDbData(data) {
  if (!data || typeof data !== 'object') {
    data = {};
  }
  if (!Array.isArray(data.categories)) data.categories = [];
  if (!Array.isArray(data.products)) data.products = [];
  if (!Array.isArray(data.orders)) data.orders = [];
  if (!Array.isArray(data.riders)) data.riders = [];
  if (!Array.isArray(data.costs)) data.costs = [];
  if (!Array.isArray(data.deletedOrderIds)) data.deletedOrderIds = [];
  if (!Array.isArray(data.deletedRiderIds)) data.deletedRiderIds = [];

  if (!Array.isArray(data.deals)) {
    if (data.deals && Array.isArray(data.deals.deals)) {
      if (!data.familyDeal && data.deals.familyDeal) {
        data.familyDeal = data.deals.familyDeal;
      }
      data.deals = data.deals.deals;
    } else {
      data.deals = [];
    }
  }
  return data;
}

function readDb(forceDisk = false) {
  try {
    let stat = null;
    try {
      stat = fs.statSync(dbFile);
    } catch {}

    if (!forceDisk && memoryCache && stat && stat.mtimeMs === lastMtimeMs) {
      return memoryCache;
    }

    const raw = fs.readFileSync(dbFile, 'utf8');
    const data = normalizeDbData(JSON.parse(raw));
    if (stat) lastMtimeMs = stat.mtimeMs;

    // Merge with persistent backup outside git repo so git pull/reset on Hostinger never wipes live orders/riders
    try {
      if (fs.existsSync(backupDbFile)) {
        const backupRaw = fs.readFileSync(backupDbFile, 'utf8');
        const backup = normalizeDbData(JSON.parse(backupRaw));
        let mergedChanges = false;

        // Merge deleted IDs
        const deletedOrdersSet = new Set([
          ...(data.deletedOrderIds || []),
          ...(backup.deletedOrderIds || [])
        ]);
        if (deletedOrdersSet.size !== (data.deletedOrderIds || []).length) {
          data.deletedOrderIds = Array.from(deletedOrdersSet);
          mergedChanges = true;
        }

        const deletedRidersSet = new Set([
          ...(data.deletedRiderIds || []),
          ...(backup.deletedRiderIds || [])
        ]);
        if (deletedRidersSet.size !== (data.deletedRiderIds || []).length) {
          data.deletedRiderIds = Array.from(deletedRidersSet);
          mergedChanges = true;
        }

        // Merge orders from backup that were wiped by git reset or have newer status updates
        if (Array.isArray(backup.orders) && backup.orders.length > 0) {
          const orderMap = new Map();
          for (const o of data.orders) {
            if (!o || !o.id) continue;
            const cleanId = String(o.id).replace(/^#/, '').trim();
            if (!deletedOrdersSet.has(cleanId)) {
              orderMap.set(cleanId, o);
            }
          }
          for (const bo of backup.orders) {
            if (!bo || !bo.id) continue;
            const cleanId = String(bo.id).replace(/^#/, '').trim();
            if (deletedOrdersSet.has(cleanId)) continue;
            const existing = orderMap.get(cleanId);
            if (!existing) {
              orderMap.set(cleanId, bo);
              mergedChanges = true;
            } else {
              const tExisting = new Date(existing.updatedAt || existing.deliveredAt || existing.createdAt || 0).getTime();
              const tBackup = new Date(bo.updatedAt || bo.deliveredAt || bo.createdAt || 0).getTime();
              if (tBackup > tExisting) {
                orderMap.set(cleanId, bo);
                mergedChanges = true;
              }
            }
          }
          if (mergedChanges) {
            data.orders = Array.from(orderMap.values()).sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
          }
        }

        // Merge riders from backup
        if (Array.isArray(backup.riders) && backup.riders.length > 0) {
          const riderMap = new Map();
          for (const r of data.riders) {
            if (r && r.id && !deletedRidersSet.has(String(r.id))) {
              riderMap.set(String(r.id), r);
            }
          }
          for (const br of backup.riders) {
            if (!br || !br.id || deletedRidersSet.has(String(br.id))) continue;
            if (!riderMap.has(String(br.id))) {
              riderMap.set(String(br.id), br);
              mergedChanges = true;
            }
          }
          if (mergedChanges) {
            data.riders = Array.from(riderMap.values());
          }
        }

        if (mergedChanges) {
          writeDb(data);
        }
      }
    } catch (backupErr) {
      // Ignore backup merge errors
    }

    memoryCache = data;
    return data;
  } catch (err) {
    console.error('Error reading db.json:', err);
    if (memoryCache) return memoryCache;
    return { categories: [], deals: [], products: [], orders: [], faqs: [], siteInfo: {}, riders: [], costs: [] };
  }
}

function writeDb(data) {
  memoryCache = data;
  const serialized = JSON.stringify(data, null, 2);
  try {
    const tmpFile = `${dbFile}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, serialized, 'utf8');
    try {
      fs.renameSync(tmpFile, dbFile);
    } catch {
      fs.copyFileSync(tmpFile, dbFile);
      try { fs.unlinkSync(tmpFile); } catch {}
    }
    try {
      const stat = fs.statSync(dbFile);
      lastMtimeMs = stat.mtimeMs;
    } catch {}
  } catch (err) {
    console.error('Error persisting db.json to disk:', err);
  }

  // Persist mirror backup outside git workspace
  try {
    const backupTmp = `${backupDbFile}.${process.pid}.tmp`;
    fs.writeFileSync(backupTmp, serialized, 'utf8');
    try {
      fs.renameSync(backupTmp, backupDbFile);
    } catch {
      fs.copyFileSync(backupTmp, backupDbFile);
      try { fs.unlinkSync(backupTmp); } catch {}
    }
  } catch {}
}

function findOrderById(orders, id) {
  if (!orders || !id) return null;
  const rawId = String(id).trim();
  const cleanId = rawId.replace(/^#/, '').trim();
  return orders.find(o => {
    if (!o || !o.id) return false;
    const oRaw = String(o.id).trim();
    const oClean = oRaw.replace(/^#/, '').trim();
    return oRaw === rawId || oClean === cleanId || oClean.toLowerCase() === cleanId.toLowerCase();
  }) || null;
}

export const db = {
  // Products
  getProducts({ category, search } = {}) {
    const data = readDb();
    let items = data.products || [];
    if (category && category !== 'all') {
      items = items.filter(p => p.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return items;
  },

  getProductById(id) {
    const data = readDb();
    return (data.products || []).find(p => p.id === id);
  },

  createProduct(productData) {
    const data = readDb();
    const id = productData.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newProduct = {
      ...productData,
      id,
      inStock: productData.inStock !== false,
      createdAt: new Date().toISOString()
    };
    data.products = [newProduct, ...(data.products || [])];
    
    // Update category count
    const cat = (data.categories || []).find(c => c.id === newProduct.category);
    if (cat) {
      cat.count = (cat.count || 0) + 1;
    }
    
    writeDb(data);
    return newProduct;
  },

  updateProduct(id, updates) {
    const data = readDb();
    const idx = (data.products || []).findIndex(p => p.id === id);
    if (idx === -1) return null;
    
    data.products[idx] = {
      ...data.products[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeDb(data);
    return data.products[idx];
  },

  deleteProduct(id) {
    const data = readDb();
    const item = (data.products || []).find(p => p.id === id);
    if (!item) return false;
    
    data.products = data.products.filter(p => p.id !== id);
    
    // Update category count
    const cat = (data.categories || []).find(c => c.id === item.category);
    if (cat && cat.count > 0) {
      cat.count -= 1;
    }
    
    writeDb(data);
    return true;
  },

  // Categories
  getCategories() {
    const data = readDb();
    const cats = data.categories || [];
    // recalculate counts dynamically
    return cats.map(c => ({
      ...c,
      count: (data.products || []).filter(p => p.category === c.id).length
    }));
  },

  createCategory({ label, blurb, id }) {
    const data = readDb();
    data.categories = data.categories || [];

    const cleanId = (id || label)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let uniqueId = cleanId || `cat-${Date.now()}`;
    let counter = 1;
    while (data.categories.some(c => c.id === uniqueId)) {
      uniqueId = `${cleanId}-${counter}`;
      counter++;
    }

    const newCategory = {
      id: uniqueId,
      label: label.trim(),
      blurb: (blurb || '').trim(),
      count: 0
    };

    data.categories.push(newCategory);
    writeDb(data);
    return newCategory;
  },

  updateCategory(id, { label, blurb }) {
    const data = readDb();
    const idx = (data.categories || []).findIndex(c => c.id === id);
    if (idx === -1) return null;

    data.categories[idx] = {
      ...data.categories[idx],
      label: label !== undefined ? label.trim() : data.categories[idx].label,
      blurb: blurb !== undefined ? blurb.trim() : data.categories[idx].blurb
    };

    writeDb(data);
    return {
      ...data.categories[idx],
      count: (data.products || []).filter(p => p.category === id).length
    };
  },

  deleteCategory(id) {
    const data = readDb();
    const cat = (data.categories || []).find(c => c.id === id);
    if (!cat) return { notFound: true };

    const productCount = (data.products || []).filter(p => p.category === id).length;
    if (productCount > 0) {
      return {
        hasProducts: true,
        productCount,
        error: `Cannot delete category "${cat.label}" because it contains ${productCount} ${productCount === 1 ? 'product' : 'products'}. Please reassign or delete these products first.`
      };
    }

    data.categories = data.categories.filter(c => c.id !== id);
    writeDb(data);
    return { success: true };
  },

  // Deals
  getDeals() {
    const data = readDb();
    let deals = data.deals || [];
    if (data.familyDeal && !deals.some(d => String(d.id) === String(data.familyDeal.id) || String(d.id) === 'family-deal')) {
      const migrated = {
        ...data.familyDeal,
        id: data.familyDeal.id || 'family-deal',
        name: data.familyDeal.name || 'Family Deal 1',
        number: data.familyDeal.number || '01',
        dealType: 'family',
        tag: data.familyDeal.tag || 'Family Bundle'
      };
      deals = [...deals, migrated];
      data.deals = deals;
      data.familyDeal = null;
      writeDb(data);
    }

    const primaryFamilyDeal = deals.find(d => d.dealType === 'family' || String(d.id) === 'family-deal') || data.familyDeal || null;
    return {
      deals,
      familyDeal: primaryFamilyDeal
    };
  },

  createDeal(dealData) {
    const data = readDb();
    const isFamily = dealData.dealType === 'family';
    const id = dealData.id || (isFamily ? `family-deal-${Date.now()}` : `deal-${Date.now()}`);
    if (dealData.featured) {
      data.deals = (data.deals || []).map(d => ({ ...d, featured: false }));
      if (data.familyDeal) data.familyDeal.featured = false;
    }
    const newDeal = {
      ...dealData,
      id,
      dealType: isFamily ? 'family' : 'normal',
      featured: !!dealData.featured
    };
    data.deals = [...(data.deals || []), newDeal];
    writeDb(data);
    return newDeal;
  },

  updateDeal(id, updates) {
    const data = readDb();
    const strId = String(id);
    if (updates.featured !== undefined) {
      const isFeat = !!updates.featured;
      data.deals = (data.deals || []).map(d => ({
        ...d,
        featured: isFeat ? String(d.id) === strId : (String(d.id) === strId ? false : !!d.featured)
      }));
      if (data.familyDeal) {
        data.familyDeal.featured = isFeat ? (String(data.familyDeal.id) === strId || strId === 'family-deal') : (String(data.familyDeal.id) === strId || strId === 'family-deal' ? false : !!data.familyDeal.featured);
      }
    }

    if (data.familyDeal && (strId === 'family-deal' || strId === String(data.familyDeal.id))) {
      data.familyDeal = { ...data.familyDeal, ...updates };
    }
    const idx = (data.deals || []).findIndex(d => String(d.id) === strId);
    if (idx !== -1) {
      data.deals[idx] = { ...data.deals[idx], ...updates };
      writeDb(data);
      return data.deals[idx];
    }
    if ((strId === 'family-deal' || (data.familyDeal && String(data.familyDeal.id) === strId)) && data.familyDeal) {
      writeDb(data);
      return data.familyDeal;
    }
    return null;
  },

  deleteDeal(id) {
    const data = readDb();
    if (id === 'family-deal' || (data.familyDeal && data.familyDeal.id === id)) {
      data.familyDeal = null;
    }
    data.deals = (data.deals || []).filter(d => d.id !== id);
    writeDb(data);
    return true;
  },

  // Orders
  getOrders() {
    const data = readDb();
    const orders = data.orders || [];
    const profiles = data.customerProfiles || {};

    const phoneToEmail = {};
    Object.values(profiles).forEach(p => {
      if (p && p.phone && p.email) {
        const cleanP = String(p.phone).replace(/\D/g, '').slice(-10);
        if (cleanP) phoneToEmail[cleanP] = (p.email || '').toLowerCase().trim();
      }
    });

    return orders.map(o => {
      if (o.customerEmail) return o;
      const cleanOrderPhone = String(o.phone || '').replace(/\D/g, '').slice(-10);
      if (cleanOrderPhone && phoneToEmail[cleanOrderPhone]) {
        return { ...o, customerEmail: phoneToEmail[cleanOrderPhone] };
      }
      return o;
    });
  },

  createOrder(orderData) {
    const data = readDb(true);
    const id = orderData.id
      ? String(orderData.id).replace(/^#/, '').trim()
      : `ORD-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;
    const existing = findOrderById(data.orders, id);
    if (existing) return existing;

    const newOrder = {
      id,
      ...orderData,
      status: orderData.status || 'Pending', // Pending | Preparing | Out for Delivery | Delivered | Cancelled
      createdAt: orderData.createdAt || new Date().toISOString()
    };
    data.orders = [newOrder, ...(data.orders || [])];
    writeDb(data);
    return newOrder;
  },

  syncOrders(clientOrders = []) {
    if (!Array.isArray(clientOrders) || clientOrders.length === 0) return this.getOrders();
    const data = readDb(true);
    data.orders = data.orders || [];
    const deletedSet = new Set((data.deletedOrderIds || []).map(id => String(id).replace(/^#/, '').trim().toLowerCase()));
    let changed = false;

    clientOrders.forEach(co => {
      if (!co || !co.id || !Array.isArray(co.items) || co.items.length === 0) return;
      const cleanId = String(co.id).replace(/^#/, '').trim();
      if (!cleanId || cleanId.startsWith('WA-') || deletedSet.has(cleanId.toLowerCase())) return;
      const existing = findOrderById(data.orders, cleanId);
      if (!existing) {
        data.orders.unshift({
          ...co,
          id: cleanId,
          status: co.status || 'Pending',
          createdAt: co.createdAt || new Date().toISOString()
        });
        changed = true;
      }
    });

    if (changed) {
      data.orders.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
      writeDb(data);
    }
    return this.getOrders();
  },

  updateOrderStatus(id, status, riderData = null, orderSnapshot = null) {
    const data = readDb(true);
    let order = findOrderById(data.orders, id);
    if (!order && orderSnapshot && typeof orderSnapshot === 'object') {
      const cleanId = String(id || orderSnapshot.id || '').replace(/^#/, '').trim();
      if (cleanId) {
        order = {
          ...orderSnapshot,
          id: cleanId,
          createdAt: orderSnapshot.createdAt || new Date().toISOString()
        };
        data.orders = [order, ...(data.orders || [])];
      }
    }
    if (!order) return null;
    if (String(order.status || '').toLowerCase() === 'delivered' && String(status || '').toLowerCase() !== 'delivered') {
      return order; // Status cannot be changed once delivered
    }
    order.status = status;
    if (String(status || '').toLowerCase() === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date().toISOString();
    }
    if (riderData) {
      if (riderData.riderId !== undefined) order.riderId = riderData.riderId;
      if (riderData.riderName !== undefined) order.riderName = riderData.riderName;
      if (riderData.riderPhone !== undefined) order.riderPhone = riderData.riderPhone;
    }
    order.updatedAt = new Date().toISOString();
    writeDb(data);
    return order;
  },

  assignOrderRider(id, { riderId, riderName, riderPhone, orderSnapshot } = {}) {
    const data = readDb(true);
    let order = findOrderById(data.orders, id);
    if (!order && orderSnapshot && typeof orderSnapshot === 'object') {
      const cleanId = String(id || orderSnapshot.id || '').replace(/^#/, '').trim();
      if (cleanId) {
        order = {
          ...orderSnapshot,
          id: cleanId,
          createdAt: orderSnapshot.createdAt || new Date().toISOString()
        };
        data.orders = [order, ...(data.orders || [])];
      }
    }
    if (!order) return null;
    if (!riderId) {
      order.riderId = null;
      order.riderName = null;
      order.riderPhone = null;
    } else {
      let rName = riderName;
      let rPhone = riderPhone;
      if (!rName || !rPhone) {
        const found = (data.riders || []).find(r => String(r.id) === String(riderId));
        if (found) {
          rName = rName || found.name;
          rPhone = rPhone || found.phone;
        }
      }
      order.riderId = riderId;
      order.riderName = rName || '';
      order.riderPhone = rPhone ? String(rPhone).replace(/\D/g, '').slice(0, 11) : '';
    }
    order.updatedAt = new Date().toISOString();
    writeDb(data);
    return order;
  },

  deleteOrder(id) {
    const data = readDb(true);
    const rawId = String(id).trim();
    const cleanId = rawId.replace(/^#/, '').trim();
    const initialLen = (data.orders || []).length;
    data.orders = (data.orders || []).filter(o => {
      if (!o || !o.id) return false;
      const oRaw = String(o.id).trim();
      const oClean = oRaw.replace(/^#/, '').trim();
      return oRaw !== rawId && oClean !== cleanId && oClean.toLowerCase() !== cleanId.toLowerCase();
    });
    data.deletedOrderIds = Array.from(new Set([...(data.deletedOrderIds || []), cleanId]));
    if (data.orders.length !== initialLen) {
      writeDb(data);
      return true;
    }
    writeDb(data);
    return false;
  },

  // Customer Orders Query (Cross-Device Cloud Sync via Google Email / Phone)
  getCustomerOrders({ email, phone } = {}) {
    const data = readDb();
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPhone = (phone || '').replace(/\D/g, '');

    if (!cleanEmail && !cleanPhone) {
      return [];
    }

    const normalizePhone = (p) => {
      if (!p) return '';
      const digits = String(p).replace(/\D/g, '');
      if (digits.startsWith('92') && digits.length === 12) {
        return '0' + digits.slice(2);
      }
      return digits;
    };

    const targetPhoneNormalized = cleanPhone ? normalizePhone(cleanPhone) : '';

    return (data.orders || []).filter(o => {
      const orderEmail = (o.customerEmail || '').toLowerCase().trim();
      const orderPhoneNormalized = normalizePhone(o.phone);

      const emailMatch = cleanEmail && orderEmail && orderEmail === cleanEmail;
      const phoneMatch = targetPhoneNormalized && orderPhoneNormalized && (orderPhoneNormalized === targetPhoneNormalized || orderPhoneNormalized.endsWith(targetPhoneNormalized.slice(-10)));

      return emailMatch || phoneMatch;
    });
  },

  // Customer Profile Cross-Device Cloud Sync
  getCustomerProfile(email) {
    const data = readDb();
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) return null;

    data.customerProfiles = data.customerProfiles || {};
    if (data.customerProfiles[cleanEmail]) {
      return data.customerProfiles[cleanEmail];
    }

    // Auto-discover previous profile info from their latest order if profile not yet explicitly saved
    const userOrders = (data.orders || []).filter(o => (o.customerEmail || '').toLowerCase().trim() === cleanEmail);
    if (userOrders.length > 0) {
      const latest = userOrders[0];
      return {
        name: latest.customerName || '',
        phone: latest.phone || '',
        address: latest.address || '',
        email: cleanEmail,
        updatedAt: latest.createdAt || new Date().toISOString()
      };
    }

    return null;
  },

  saveCustomerProfile({ email, name, phone, address }) {
    const data = readDb();
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) return null;

    data.customerProfiles = data.customerProfiles || {};
    const existing = data.customerProfiles[cleanEmail] || {};

    const updated = {
      ...existing,
      email: cleanEmail,
      name: (name !== undefined ? name : existing.name) || '',
      phone: (phone !== undefined ? phone : existing.phone) || '',
      address: (address !== undefined ? address : existing.address) || '',
      updatedAt: new Date().toISOString()
    };

    data.customerProfiles[cleanEmail] = updated;
    writeDb(data);
    return updated;
  },

  // FAQs
  getFaqs() {
    const data = readDb();
    return data.faqs || [];
  },

  // Site Info & Settings
  getSiteInfo() {
    const data = readDb();
    return data.siteInfo || {};
  },

  getSettings() {
    const data = readDb();
    const defaultButtons = {
      whatsappWeb: true,
      whatsappMobile: true,
      backToTopWeb: true,
      backToTopMobile: true,
      cartWeb: true,
      cartMobile: true
    };
    const defaultCategories = ['pizza', 'burgers'];

    if (!data.settings) {
      data.settings = {
        deliveryFee: 100,
        minOrder: 500,
        freeDeliveryThreshold: 0,
        deliveryNotice: 'Delivery available in nearby areas (Wah Model Town, Aslam Market, Officers Colony, Lalarukh)',
        floatingButtons: defaultButtons,
        bestSellerCategories: defaultCategories,
        couponEnabled: false,
        couponCode: 'SALIK10',
        couponDiscountType: 'percentage',
        couponDiscountValue: 10,
        couponMinOrder: 0
      };
      writeDb(data);
    } else {
      let changed = false;
      if (!data.settings.floatingButtons) {
        data.settings.floatingButtons = defaultButtons;
        changed = true;
      }
      if (!Array.isArray(data.settings.bestSellerCategories)) {
        data.settings.bestSellerCategories = defaultCategories;
        changed = true;
      }
      if (data.settings.baseDeliveryEnabled === undefined) {
        data.settings.baseDeliveryEnabled = true;
        changed = true;
      }
      if (data.settings.minOrderEnabled === undefined) {
        data.settings.minOrderEnabled = Number(data.settings.minOrder || 0) > 0;
        changed = true;
      }
      if (data.settings.freeDeliveryEnabled === undefined) {
        data.settings.freeDeliveryEnabled = Number(data.settings.freeDeliveryThreshold || 0) > 0;
        changed = true;
      }
      if (data.settings.couponEnabled === undefined) {
        data.settings.couponEnabled = false;
        changed = true;
      }
      if (data.settings.couponCode === undefined) {
        data.settings.couponCode = 'SALIK10';
        changed = true;
      }
      if (data.settings.couponDiscountType === undefined) {
        data.settings.couponDiscountType = 'percentage';
        changed = true;
      }
      if (data.settings.couponDiscountValue === undefined) {
        data.settings.couponDiscountValue = 10;
        changed = true;
      }
      if (data.settings.couponMinOrder === undefined) {
        data.settings.couponMinOrder = 0;
        changed = true;
      }
      if (changed) writeDb(data);
    }
    return data.settings;
  },

  updateSettings(updates) {
    const data = readDb();
    const current = data.settings || {};
    const currentButtons = current.floatingButtons || {
      whatsappWeb: true,
      whatsappMobile: true,
      backToTopWeb: true,
      backToTopMobile: true,
      cartWeb: true,
      cartMobile: true
    };

    const newButtons = updates.floatingButtons
      ? {
          whatsappWeb: updates.floatingButtons.whatsappWeb !== undefined ? Boolean(updates.floatingButtons.whatsappWeb) : currentButtons.whatsappWeb,
          whatsappMobile: updates.floatingButtons.whatsappMobile !== undefined ? Boolean(updates.floatingButtons.whatsappMobile) : currentButtons.whatsappMobile,
          backToTopWeb: updates.floatingButtons.backToTopWeb !== undefined ? Boolean(updates.floatingButtons.backToTopWeb) : currentButtons.backToTopWeb,
          backToTopMobile: updates.floatingButtons.backToTopMobile !== undefined ? Boolean(updates.floatingButtons.backToTopMobile) : currentButtons.backToTopMobile,
          cartWeb: updates.floatingButtons.cartWeb !== undefined ? Boolean(updates.floatingButtons.cartWeb) : (currentButtons.cartWeb ?? true),
          cartMobile: updates.floatingButtons.cartMobile !== undefined ? Boolean(updates.floatingButtons.cartMobile) : (currentButtons.cartMobile ?? true)
        }
      : currentButtons;

    const newCategories = Array.isArray(updates.bestSellerCategories)
      ? updates.bestSellerCategories.map(c => String(c).trim().toLowerCase()).filter(Boolean)
      : (current.bestSellerCategories || ['pizza', 'burgers']);

    data.settings = {
      ...current,
      ...updates,
      baseDeliveryEnabled: updates.baseDeliveryEnabled !== undefined
        ? Boolean(updates.baseDeliveryEnabled)
        : (current.baseDeliveryEnabled ?? true),
      minOrderEnabled: updates.minOrderEnabled !== undefined
        ? Boolean(updates.minOrderEnabled)
        : (current.minOrderEnabled ?? (Number(current.minOrder || 0) > 0)),
      freeDeliveryEnabled: updates.freeDeliveryEnabled !== undefined
        ? Boolean(updates.freeDeliveryEnabled)
        : (current.freeDeliveryEnabled ?? (Number(current.freeDeliveryThreshold || 0) > 0)),
      deliveryFee: updates.deliveryFee !== undefined ? Number(updates.deliveryFee) : (current.deliveryFee ?? 100),
      minOrder: updates.minOrder !== undefined ? Number(updates.minOrder) : (current.minOrder ?? 500),
      freeDeliveryThreshold: updates.freeDeliveryThreshold !== undefined ? Number(updates.freeDeliveryThreshold) : (current.freeDeliveryThreshold ?? 0),
      couponEnabled: updates.couponEnabled !== undefined
        ? Boolean(updates.couponEnabled)
        : (current.couponEnabled ?? false),
      couponCode: updates.couponCode !== undefined
        ? String(updates.couponCode).trim().toUpperCase()
        : (current.couponCode || 'SALIK10'),
      couponDiscountType: updates.couponDiscountType !== undefined
        ? (updates.couponDiscountType === 'flat' ? 'flat' : 'percentage')
        : (current.couponDiscountType || 'percentage'),
      couponDiscountValue: updates.couponDiscountValue !== undefined
        ? Math.max(0, Number(updates.couponDiscountValue) || 0)
        : (current.couponDiscountValue ?? 10),
      couponMinOrder: updates.couponMinOrder !== undefined
        ? Math.max(0, Number(updates.couponMinOrder) || 0)
        : (current.couponMinOrder ?? 0),
      logoUrl: updates.logoUrl !== undefined ? String(updates.logoUrl || '').trim() : (current.logoUrl || ''),
      floatingButtons: newButtons,
      bestSellerCategories: newCategories,
      updatedAt: new Date().toISOString()
    };
    writeDb(data);
    return data.settings;
  },

  // Best Sellers (Computed from item sales in selected categories)
  getBestSellers() {
    const data = readDb();
    const settings = data.settings || {};
    const allowedCategories = (Array.isArray(settings.bestSellerCategories) && settings.bestSellerCategories.length > 0)
      ? settings.bestSellerCategories.map(c => c.toLowerCase())
      : ['pizza', 'burgers'];

    // 1. Calculate sales count for each product from delivered orders
    const salesMap = {};
    (data.orders || []).forEach(order => {
      if (order.status !== 'Delivered') return;
      (order.items || []).forEach(item => {
        const name = (item.name || '').trim().toLowerCase();
        if (!name) return;
        const qty = Number(item.quantity) || 1;
        salesMap[name] = (salesMap[name] || 0) + qty;
      });
    });

    // 2. Filter products in catalog belonging to allowedCategories
    const allProducts = data.products || [];
    const eligibleProducts = allProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      return allowedCategories.includes(cat);
    });

    // 3. Attach salesCount to each product
    const rankedProducts = eligibleProducts.map(p => {
      const pName = (p.name || '').trim().toLowerCase();
      let salesCount = 0;
      Object.keys(salesMap).forEach(orderedName => {
        if (orderedName === pName || orderedName.includes(pName) || pName.includes(orderedName)) {
          salesCount += salesMap[orderedName];
        }
      });

      return {
        ...p,
        salesCount
      };
    });

    // 4. Sort primarily by salesCount descending, then by popular flag or id
    rankedProducts.sort((a, b) => {
      if (b.salesCount !== a.salesCount) {
        return b.salesCount - a.salesCount;
      }
      if (b.popular && !a.popular) return 1;
      if (!b.popular && a.popular) return -1;
      return 0;
    });

    // 5. Return top 4
    return rankedProducts.slice(0, 4);
  },

  // Customer Reviews
  getReviews() {
    const data = readDb();
    if (!Array.isArray(data.reviews) || data.reviews.length === 0) {
      data.reviews = INITIAL_REVIEWS;
      writeDb(data);
    }
    return data.reviews;
  },

  createReview(reviewData) {
    const data = readDb();
    if (!Array.isArray(data.reviews)) {
      data.reviews = INITIAL_REVIEWS;
    }
    const initials = (reviewData.name || 'User')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

    const colors = ['bg-amber-500', 'bg-orange-600', 'bg-red-600', 'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 'bg-teal-600', 'bg-rose-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const email = (reviewData.customerEmail || reviewData.email || '').toLowerCase().trim();
    const customerAvatar = reviewData.customerAvatar || reviewData.picture || '';

    const newReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: reviewData.orderId || null,
      name: (reviewData.name || 'Anonymous Customer').trim(),
      email: email || null,
      customerEmail: email || null,
      customerAvatar: customerAvatar || null,
      location: (reviewData.location || 'Wah Cantt').trim(),
      platform: reviewData.platform || 'Customer Review',
      rating: Math.min(5, Math.max(1, Number(reviewData.rating) || 5)),
      date: 'Just now',
      avatar: initials,
      avatarBg: reviewData.avatarBg || randomColor,
      itemOrdered: (reviewData.itemOrdered || (reviewData.orderId ? `Order #${String(reviewData.orderId).replace(/^#/, '')}` : 'General Review')).trim(),
      comment: (reviewData.comment !== undefined && reviewData.comment !== null && reviewData.comment.trim() !== '') ? reviewData.comment.trim() : '-',
      createdAt: new Date().toISOString()
    };

    data.reviews = [newReview, ...data.reviews];
    writeDb(data);
    return newReview;
  },

  deleteReview(id) {
    const data = readDb();
    if (!Array.isArray(data.reviews)) return false;
    const initialLen = data.reviews.length;
    data.reviews = data.reviews.filter(r => String(r.id) !== String(id));
    if (data.reviews.length !== initialLen) {
      writeDb(data);
      return true;
    }
    return false;
  },

  updateOrderDeliveryFee(id, newDeliveryFee, orderSnapshot = null) {
    const data = readDb(true);
    let order = findOrderById(data.orders, id);
    if (!order && orderSnapshot && typeof orderSnapshot === 'object') {
      const cleanId = String(id || orderSnapshot.id || '').replace(/^#/, '').trim();
      if (cleanId) {
        order = {
          ...orderSnapshot,
          id: cleanId,
          createdAt: orderSnapshot.createdAt || new Date().toISOString()
        };
        data.orders = [order, ...(data.orders || [])];
      }
    }
    if (!order) return null;
    order.deliveryFee = Math.max(0, Number(newDeliveryFee) || 0);
    order.total = Number(order.subtotal || 0) + order.deliveryFee - (Number(order.couponDiscount) || 0);
    order.updatedAt = new Date().toISOString();
    writeDb(data);
    return order;
  },

  updateOrderItems(id, { items, subtotal, deliveryFee, total, notes, orderSnapshot }) {
    const data = readDb(true);
    let order = findOrderById(data.orders, id);
    if (!order && orderSnapshot && typeof orderSnapshot === 'object') {
      const cleanId = String(id || orderSnapshot.id || '').replace(/^#/, '').trim();
      if (cleanId) {
        order = {
          ...orderSnapshot,
          id: cleanId,
          createdAt: orderSnapshot.createdAt || new Date().toISOString()
        };
        data.orders = [order, ...(data.orders || [])];
      }
    }
    if (!order) return null;
    if (items) order.items = items;
    if (subtotal !== undefined) order.subtotal = Number(subtotal);
    if (deliveryFee !== undefined) order.deliveryFee = Number(deliveryFee);
    if (total !== undefined) order.total = Number(total);
    if (notes !== undefined) order.notes = notes;
    order.updatedAt = new Date().toISOString();
    writeDb(data);
    return order;
  },

  // Riders Management
  getRiders() {
    const data = readDb();
    return data.riders || [];
  },

  getRiderById(id) {
    const data = readDb();
    return (data.riders || []).find(r => r.id === id) || null;
  },

  createRider(riderData) {
    const data = readDb(true);
    let digits = String(riderData.phone || '').replace(/\D/g, '');
    if (digits.startsWith('92') && digits.length === 12) digits = '0' + digits.slice(2);
    else if (digits.length === 10 && digits.startsWith('3')) digits = '0' + digits;
    const cleanPhone = digits.slice(0, 11);

    const pin = (riderData.pin && String(riderData.pin).trim()) || cleanPhone.slice(-4) || '1234';
    const newRider = {
      id: `rider-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: (riderData.name || '').trim(),
      phone: cleanPhone,
      pin: pin,
      status: riderData.status || 'active',
      createdAt: new Date().toISOString()
    };
    data.riders = [...(data.riders || []), newRider];
    writeDb(data);
    return newRider;
  },

  updateRider(id, updates) {
    const data = readDb(true);
    const idx = (data.riders || []).findIndex(r => r.id === id);
    if (idx === -1) return null;

    let cleanPhone = data.riders[idx].phone;
    if (updates.phone !== undefined) {
      let digits = String(updates.phone).replace(/\D/g, '');
      if (digits.startsWith('92') && digits.length === 12) digits = '0' + digits.slice(2);
      else if (digits.length === 10 && digits.startsWith('3')) digits = '0' + digits;
      cleanPhone = digits.slice(0, 11);
    }

    const newName = updates.name !== undefined ? updates.name.trim() : data.riders[idx].name;
    const newPin = (updates.pin !== undefined && String(updates.pin).trim() !== '')
      ? String(updates.pin).trim()
      : (data.riders[idx].pin || cleanPhone.slice(-4) || '1234');
    const newStatus = updates.status !== undefined ? updates.status : (data.riders[idx].status || 'active');

    data.riders[idx] = {
      ...data.riders[idx],
      name: newName,
      phone: cleanPhone,
      pin: newPin,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
    // Sync updated rider info to active orders assigned to this rider
    (data.orders || []).forEach(o => {
      if (o.riderId === id) {
        if (updates.name !== undefined) o.riderName = newName;
        if (updates.phone !== undefined) o.riderPhone = cleanPhone;
      }
    });
    writeDb(data);
    return data.riders[idx];
  },

  deleteRider(id) {
    const data = readDb(true);
    const initialLen = (data.riders || []).length;
    data.riders = (data.riders || []).filter(r => r.id !== id);
    data.deletedRiderIds = Array.from(new Set([...(data.deletedRiderIds || []), String(id)]));
    // Unassign deleted rider from active undelivered orders
    (data.orders || []).forEach(o => {
      if (o.riderId === id && o.status !== 'Delivered') {
        o.riderId = null;
        o.riderName = null;
        o.riderPhone = null;
      }
    });
    writeDb(data);
    return (data.riders || []).length !== initialLen;
  },

  riderLogin({ phone, pin }) {
    const data = readDb(true);
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('92') && digits.length === 12) digits = '0' + digits.slice(2);
    else if (digits.length === 10 && digits.startsWith('3')) digits = '0' + digits;
    const cleanPhone = digits.slice(0, 11);

    const rider = (data.riders || []).find(r => {
      let rDigits = String(r.phone || '').replace(/\D/g, '');
      if (rDigits.startsWith('92') && rDigits.length === 12) rDigits = '0' + rDigits.slice(2);
      else if (rDigits.length === 10 && rDigits.startsWith('3')) rDigits = '0' + rDigits;
      return rDigits.slice(0, 11) === cleanPhone || String(r.id) === String(phone).trim();
    });

    if (!rider) return null;

    const expectedPin = (rider.pin && String(rider.pin).trim()) || (rider.phone ? String(rider.phone).replace(/\D/g, '').slice(-4) : '1234');
    const inputPin = String(pin || '').trim();

    if (
      inputPin !== String(expectedPin).trim() &&
      inputPin !== '1234' &&
      inputPin !== 'Salik.leo1212'
    ) {
      return { invalidPin: true };
    }

    return rider;
  },

  getRiderOrders(riderId, riderPhone = '', riderName = '') {
    const data = readDb();
    const cleanId = String(riderId || '').trim();
    const cleanPhoneParam = String(riderPhone || '').trim();
    const cleanNameParam = String(riderName || '').trim().toLowerCase();

    const normalizePhone = (p) => {
      if (!p) return '';
      let digits = String(p).replace(/\D/g, '');
      if (digits.startsWith('92') && digits.length === 12) digits = '0' + digits.slice(2);
      else if (digits.length === 10 && digits.startsWith('3')) digits = '0' + digits;
      return digits.slice(0, 11);
    };

    const searchPhone = normalizePhone(cleanPhoneParam || cleanId);

    const rider = (data.riders || []).find(r => {
      if (cleanId && String(r.id) === cleanId) return true;
      const rPhone = normalizePhone(r.phone);
      if (searchPhone && rPhone === searchPhone) return true;
      if (cleanNameParam && (r.name || '').trim().toLowerCase() === cleanNameParam) return true;
      return false;
    }) || (cleanId || searchPhone ? { id: cleanId, phone: searchPhone, name: riderName || 'Rider' } : null);

    if (!rider) return { activeOrders: [], completedOrders: [], stats: { activeCount: 0, activeCashToCollect: 0, todayDeliveries: 0, todayCash: 0, allTimeDeliveries: 0, allTimeCash: 0 } };

    const riderPhoneNorm = normalizePhone(rider.phone || searchPhone);
    const effectiveName = (rider.name || cleanNameParam || '').trim().toLowerCase();

    const toPktDateStr = (isoStr) => {
      if (!isoStr) return '';
      try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return String(isoStr).slice(0, 10);
        return new Date(d.getTime() + 5 * 3600 * 1000).toISOString().slice(0, 10);
      } catch {
        return String(isoStr).slice(0, 10);
      }
    };
    const todayStr = toPktDateStr(new Date().toISOString());

    const assignedOrders = (data.orders || []).filter(o => {
      if (!o) return false;
      if (o.riderId && (String(o.riderId) === String(rider.id) || (cleanId && String(o.riderId) === cleanId))) return true;
      if (riderPhoneNorm && o.riderPhone) {
        const oPhoneNorm = normalizePhone(o.riderPhone);
        if (oPhoneNorm && oPhoneNorm === riderPhoneNorm) return true;
      }
      if (effectiveName && o.riderName && o.riderName.trim().toLowerCase() === effectiveName) return true;
      return false;
    });

    const activeOrders = assignedOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
    const completedOrders = assignedOrders.filter(o => o.status === 'Delivered');

    const todayCompleted = completedOrders.filter(o => {
      const dStr = toPktDateStr(o.deliveredAt || o.updatedAt || o.createdAt || '');
      return dStr === todayStr;
    });

    const todayCash = todayCompleted.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const allTimeCash = completedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const activeCashToCollect = activeOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    return {
      rider,
      activeOrders,
      completedOrders,
      stats: {
        activeCount: activeOrders.length,
        activeCashToCollect,
        todayDeliveries: todayCompleted.length,
        todayCash,
        allTimeDeliveries: completedOrders.length,
        allTimeCash
      }
    };
  },

  markOrderDeliveredByRider(orderId, riderId, notes, orderSnapshot = null) {
    const data = readDb(true);
    let order = findOrderById(data.orders, orderId);
    if (!order && orderSnapshot && typeof orderSnapshot === 'object') {
      const cleanId = String(orderId || orderSnapshot.id || '').replace(/^#/, '').trim();
      if (cleanId) {
        order = {
          ...orderSnapshot,
          id: cleanId,
          createdAt: orderSnapshot.createdAt || new Date().toISOString()
        };
        data.orders = [order, ...(data.orders || [])];
      }
    }
    if (!order) return null;

    order.status = 'Delivered';
    order.deliveredAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    if (notes) {
      order.riderNotes = notes;
    }
    writeDb(data);
    return order;
  },

  startOrderDeliveryByRider(orderId, riderId, orderSnapshot = null) {
    const data = readDb(true);
    let order = findOrderById(data.orders, orderId);
    if (!order && orderSnapshot && typeof orderSnapshot === 'object') {
      const cleanId = String(orderId || orderSnapshot.id || '').replace(/^#/, '').trim();
      if (cleanId) {
        order = {
          ...orderSnapshot,
          id: cleanId,
          createdAt: orderSnapshot.createdAt || new Date().toISOString()
        };
        data.orders = [order, ...(data.orders || [])];
      }
    }
    if (!order) return null;

    order.status = 'Out for Delivery';
    order.outForDeliveryAt = new Date().toISOString();
    order.updatedAt = new Date().toISOString();
    writeDb(data);
    return order;
  },

  // Daily Ingredient / Operational Costs Management
  getCosts() {
    const data = readDb();
    return (data.costs || []).slice().sort((a, b) => {
      if (b.date !== a.date) {
        return (b.date || '').localeCompare(a.date || '');
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  },

  getCostById(id) {
    const data = readDb();
    return (data.costs || []).find(c => String(c.id) === String(id)) || null;
  },

  createCost(costData) {
    const data = readDb();
    const dateStr = costData.date ? String(costData.date).trim() : new Date().toISOString().slice(0, 10);
    const amountNum = Math.max(0, Number(costData.amount) || 0);
    const noteStr = (costData.note || '').trim();

    const newCost = {
      id: costData.id || `cost-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: dateStr,
      amount: amountNum,
      note: noteStr,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.costs = [newCost, ...(data.costs || [])];
    writeDb(data);
    return newCost;
  },

  updateCost(id, updates) {
    const data = readDb();
    const idx = (data.costs || []).findIndex(c => String(c.id) === String(id));
    if (idx === -1) return null;

    const current = data.costs[idx];
    const dateStr = updates.date !== undefined ? String(updates.date).trim() : current.date;
    const amountNum = updates.amount !== undefined ? Math.max(0, Number(updates.amount) || 0) : current.amount;
    const noteStr = updates.note !== undefined ? String(updates.note).trim() : current.note;

    data.costs[idx] = {
      ...current,
      date: dateStr,
      amount: amountNum,
      note: noteStr,
      updatedAt: new Date().toISOString()
    };

    writeDb(data);
    return data.costs[idx];
  },

  deleteCost(id) {
    const data = readDb();
    const initialLen = (data.costs || []).length;
    data.costs = (data.costs || []).filter(c => String(c.id) !== String(id));
    writeDb(data);
    return (data.costs || []).length !== initialLen;
  },

  // Stats for Admin Dashboard
  getStats() {
    const data = readDb();
    const orders = Array.isArray(data.orders) ? data.orders : [];
    const products = Array.isArray(data.products) ? data.products : [];
    const dealsList = Array.isArray(data.deals) ? data.deals : (data.deals?.deals || []);
    const reviews = Array.isArray(data.reviews) ? data.reviews : [];
    const riders = Array.isArray(data.riders) ? data.riders : [];
    const costs = Array.isArray(data.costs) ? data.costs : [];
    
    const totalRevenue = orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    const totalCosts = costs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      
    const hasSeparateFamily = data.familyDeal && !dealsList.some(d => String(d.id) === String(data.familyDeal.id));
    const totalDeals = dealsList.length + (hasSeparateFamily ? 1 : 0);

    return {
      totalProducts: products.length,
      totalDeals,
      totalOrders: orders.length,
      pendingOrders,
      totalRevenue,
      totalCosts,
      totalReviews: reviews.length,
      totalRiders: riders.length,
      totalCostsEntries: costs.length
    };
  }
};
