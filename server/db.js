import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'db.json');
const initialFile = path.join(__dirname, 'initialData.json');

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

function readDb() {
  try {
    const raw = fs.readFileSync(dbFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return { categories: [], deals: [], products: [], orders: [], faqs: [], siteInfo: {} };
  }
}

function writeDb(data) {
  const tmpFile = `${dbFile}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpFile, dbFile);
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
    return {
      deals: data.deals || [],
      familyDeal: data.familyDeal || null
    };
  },

  createDeal(dealData) {
    const data = readDb();
    const id = dealData.id || `deal-${Date.now()}`;
    const newDeal = { ...dealData, id };
    data.deals = [...(data.deals || []), newDeal];
    writeDb(data);
    return newDeal;
  },

  updateDeal(id, updates) {
    const data = readDb();
    if (id === 'family-deal') {
      data.familyDeal = { ...data.familyDeal, ...updates };
      writeDb(data);
      return data.familyDeal;
    }
    const idx = (data.deals || []).findIndex(d => d.id === id);
    if (idx === -1) return null;
    data.deals[idx] = { ...data.deals[idx], ...updates };
    writeDb(data);
    return data.deals[idx];
  },

  deleteDeal(id) {
    const data = readDb();
    data.deals = (data.deals || []).filter(d => d.id !== id);
    writeDb(data);
    return true;
  },

  // Orders
  getOrders() {
    const data = readDb();
    return data.orders || [];
  },

  createOrder(orderData) {
    const data = readDb();
    const id = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;
    const newOrder = {
      id,
      ...orderData,
      status: 'Pending', // Pending | Preparing | Out for Delivery | Delivered | Cancelled
      createdAt: new Date().toISOString()
    };
    data.orders = [newOrder, ...(data.orders || [])];
    writeDb(data);
    return newOrder;
  },

  updateOrderStatus(id, status) {
    const data = readDb();
    const order = (data.orders || []).find(o => o.id === id);
    if (!order) return null;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    writeDb(data);
    return order;
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
    if (!data.settings) {
      data.settings = {
        deliveryFee: 100,
        minOrder: 500,
        freeDeliveryThreshold: 0,
        deliveryNotice: 'Delivery available in nearby areas (Shaikh Chowk, Itfaq Town, Mansoora, Multan Road)'
      };
      writeDb(data);
    }
    return data.settings;
  },

  updateSettings(updates) {
    const data = readDb();
    data.settings = {
      ...(data.settings || {
        deliveryFee: 100,
        minOrder: 500,
        freeDeliveryThreshold: 0,
        deliveryNotice: 'Delivery available in nearby areas'
      }),
      ...updates,
      deliveryFee: updates.deliveryFee !== undefined ? Number(updates.deliveryFee) : (data.settings?.deliveryFee ?? 100),
      minOrder: updates.minOrder !== undefined ? Number(updates.minOrder) : (data.settings?.minOrder ?? 500),
      freeDeliveryThreshold: updates.freeDeliveryThreshold !== undefined ? Number(updates.freeDeliveryThreshold) : (data.settings?.freeDeliveryThreshold ?? 0),
      updatedAt: new Date().toISOString()
    };
    writeDb(data);
    return data.settings;
  },

  updateOrderDeliveryFee(id, newDeliveryFee) {
    const data = readDb();
    const order = (data.orders || []).find(o => o.id === id);
    if (!order) return null;
    order.deliveryFee = Math.max(0, Number(newDeliveryFee) || 0);
    order.total = Number(order.subtotal || 0) + order.deliveryFee;
    order.updatedAt = new Date().toISOString();
    writeDb(data);
    return order;
  },

  updateOrderItems(id, { items, subtotal, deliveryFee, total, notes }) {
    const data = readDb();
    const order = (data.orders || []).find(o => o.id === id);
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

  // Stats for Admin Dashboard
  getStats() {
    const data = readDb();
    const orders = data.orders || [];
    const products = data.products || [];
    const deals = data.deals || [];
    
    const totalRevenue = orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    
    return {
      totalProducts: products.length,
      totalDeals: deals.length + (data.familyDeal ? 1 : 0),
      totalOrders: orders.length,
      pendingOrders,
      totalRevenue
    };
  }
};
