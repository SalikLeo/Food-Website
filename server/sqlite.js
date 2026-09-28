import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqliteFile = path.join(dataDir, 'salik_food.db');
const dbJsonFile = path.join(dataDir, 'db.json');
const initialFile = path.join(__dirname, 'initialData.json');

// Initialize SQLite connection
const dbConn = new Database(sqliteFile);

// Enable WAL mode & fast synchronous settings for high performance and crash resilience
dbConn.pragma('journal_mode = WAL');
dbConn.pragma('synchronous = NORMAL');
dbConn.pragma('foreign_keys = ON');

// Initialize Schema
function initSchema() {
  dbConn.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      blurb TEXT,
      sortOrder INTEGER DEFAULT 0,
      data TEXT NOT NULL,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      inStock INTEGER DEFAULT 1,
      popular INTEGER DEFAULT 0,
      data TEXT NOT NULL,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_inStock ON products(inStock);

    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      dealType TEXT DEFAULT 'normal',
      featured INTEGER DEFAULT 0,
      data TEXT NOT NULL,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'Pending',
      customerEmail TEXT,
      phone TEXT,
      riderId TEXT,
      subtotal REAL DEFAULT 0,
      deliveryFee REAL DEFAULT 0,
      total REAL DEFAULT 0,
      data TEXT NOT NULL,
      createdAt TEXT,
      updatedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_customerEmail ON orders(customerEmail);
    CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
    CREATE INDEX IF NOT EXISTS idx_orders_riderId ON orders(riderId);
    CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders(createdAt);

    CREATE TABLE IF NOT EXISTS riders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      data TEXT NOT NULL,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      orderId TEXT,
      name TEXT NOT NULL,
      rating REAL DEFAULT 5,
      platform TEXT,
      data TEXT NOT NULL,
      createdAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_createdAt ON reviews(createdAt);

    CREATE TABLE IF NOT EXISTS customer_profiles (
      email TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT,
      email TEXT,
      data TEXT NOT NULL,
      createdAt TEXT
    );
  `);
}

initSchema();

// Auto-migration from existing db.json or initialData.json
function autoMigrateIfEmpty() {
  const catCount = dbConn.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount > 0) {
    return; // Already initialized
  }

  let sourceData = null;
  if (fs.existsSync(dbJsonFile)) {
    try {
      sourceData = JSON.parse(fs.readFileSync(dbJsonFile, 'utf8'));
      console.log(' [SQLite] Found existing db.json. Auto-migrating to SQLite...');
    } catch (e) {
      console.error(' [SQLite] Failed to parse db.json:', e);
    }
  }

  if (!sourceData && fs.existsSync(initialFile)) {
    try {
      sourceData = JSON.parse(fs.readFileSync(initialFile, 'utf8'));
      console.log(' [SQLite] Initializing from initialData.json...');
    } catch (e) {
      console.error(' [SQLite] Failed to parse initialData.json:', e);
    }
  }

  if (!sourceData) {
    return;
  }

  const migrate = dbConn.transaction(() => {
    // 1. Categories
    const insertCat = dbConn.prepare('INSERT OR REPLACE INTO categories (id, label, blurb, sortOrder, data, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
    (sourceData.categories || []).forEach((c, idx) => {
      insertCat.run(c.id, c.label || '', c.blurb || '', idx, JSON.stringify(c), new Date().toISOString());
    });

    // 2. Products
    const insertProd = dbConn.prepare('INSERT OR REPLACE INTO products (id, category, name, price, inStock, popular, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (sourceData.products || []).forEach(p => {
      insertProd.run(
        p.id,
        p.category || '',
        p.name || '',
        Number(p.price) || 0,
        p.inStock !== false ? 1 : 0,
        p.popular ? 1 : 0,
        JSON.stringify(p),
        p.createdAt || new Date().toISOString(),
        p.updatedAt || null
      );
    });

    // 3. Deals
    const insertDeal = dbConn.prepare('INSERT OR REPLACE INTO deals (id, dealType, featured, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
    let allDeals = [...(sourceData.deals || [])];
    if (sourceData.familyDeal && !allDeals.some(d => String(d.id) === String(sourceData.familyDeal.id) || String(d.id) === 'family-deal')) {
      allDeals.push({
        ...sourceData.familyDeal,
        id: sourceData.familyDeal.id || 'family-deal',
        name: sourceData.familyDeal.name || 'Family Deal 1',
        number: sourceData.familyDeal.number || '01',
        dealType: 'family',
        tag: sourceData.familyDeal.tag || 'Family Bundle'
      });
    }
    allDeals.forEach(d => {
      insertDeal.run(
        String(d.id),
        d.dealType || 'normal',
        d.featured ? 1 : 0,
        JSON.stringify(d),
        d.createdAt || new Date().toISOString(),
        d.updatedAt || null
      );
    });

    // 4. Orders
    const insertOrder = dbConn.prepare('INSERT OR REPLACE INTO orders (id, status, customerEmail, phone, riderId, subtotal, deliveryFee, total, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    (sourceData.orders || []).forEach(o => {
      insertOrder.run(
        o.id,
        o.status || 'Pending',
        (o.customerEmail || '').toLowerCase().trim(),
        o.phone || '',
        o.riderId || null,
        Number(o.subtotal) || 0,
        Number(o.deliveryFee) || 0,
        Number(o.total) || 0,
        JSON.stringify(o),
        o.createdAt || new Date().toISOString(),
        o.updatedAt || null
      );
    });

    // 5. Riders
    const insertRider = dbConn.prepare('INSERT OR REPLACE INTO riders (id, name, phone, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
    (sourceData.riders || []).forEach(r => {
      insertRider.run(
        r.id,
        r.name || '',
        r.phone || '',
        JSON.stringify(r),
        r.createdAt || new Date().toISOString(),
        r.updatedAt || null
      );
    });

    // 6. Reviews
    const insertReview = dbConn.prepare('INSERT OR REPLACE INTO reviews (id, orderId, name, rating, platform, data, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
    (sourceData.reviews || []).forEach(rev => {
      insertReview.run(
        rev.id,
        rev.orderId || null,
        rev.name || 'Anonymous Customer',
        Number(rev.rating) || 5,
        rev.platform || 'Customer Review',
        JSON.stringify(rev),
        rev.createdAt || new Date().toISOString()
      );
    });

    // 7. Customer Profiles
    const insertProfile = dbConn.prepare('INSERT OR REPLACE INTO customer_profiles (email, data, updatedAt) VALUES (?, ?, ?)');
    if (sourceData.customerProfiles && typeof sourceData.customerProfiles === 'object') {
      Object.entries(sourceData.customerProfiles).forEach(([email, prof]) => {
        insertProfile.run((email || '').toLowerCase().trim(), JSON.stringify(prof), prof.updatedAt || new Date().toISOString());
      });
    }

    // 8. Settings & SiteInfo
    const insertSetting = dbConn.prepare('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)');
    if (sourceData.settings) {
      insertSetting.run('settings', JSON.stringify(sourceData.settings), new Date().toISOString());
    }
    if (sourceData.siteInfo) {
      insertSetting.run('siteInfo', JSON.stringify(sourceData.siteInfo), new Date().toISOString());
    }
    if (sourceData.familyDeal) {
      insertSetting.run('familyDeal', JSON.stringify(sourceData.familyDeal), new Date().toISOString());
    }

    // 9. FAQs
    const insertFaq = dbConn.prepare('INSERT OR REPLACE INTO faqs (id, data) VALUES (?, ?)');
    (sourceData.faqs || []).forEach((f, idx) => {
      insertFaq.run(f.id || `faq-${idx}`, JSON.stringify(f));
    });

    // 10. Users
    const insertUser = dbConn.prepare('INSERT OR REPLACE INTO users (id, phone, email, data, createdAt) VALUES (?, ?, ?, ?, ?)');
    (sourceData.users || []).forEach(u => {
      insertUser.run(u.id, u.phone || '', u.email || '', JSON.stringify(u), u.createdAt || new Date().toISOString());
    });
  });

  migrate();
  console.log('✅ [SQLite] Database migration completed successfully into salik_food.db!');
}

autoMigrateIfEmpty();

// Helper to safely parse JSON
function parseJson(str, defaultVal = null) {
  if (!str) return defaultVal;
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultVal;
  }
}

// Normalize phone numbers for matching
function normalizePhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  return digits;
}

export const sqliteDb = {
  // Direct connection access if needed
  _conn: dbConn,

  // Products
  getProducts({ category, search } = {}) {
    let rows;
    if (category && category !== 'all') {
      rows = dbConn.prepare('SELECT data FROM products WHERE category = ? ORDER BY rowid DESC').all(category);
    } else {
      rows = dbConn.prepare('SELECT data FROM products ORDER BY rowid DESC').all();
    }
    let items = rows.map(r => parseJson(r.data)).filter(Boolean);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }
    return items;
  },

  getProductById(id) {
    const row = dbConn.prepare('SELECT data FROM products WHERE id = ?').get(id);
    return row ? parseJson(row.data) : undefined;
  },

  createProduct(productData) {
    const id = productData.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newProduct = {
      ...productData,
      id,
      inStock: productData.inStock !== false,
      createdAt: new Date().toISOString()
    };

    const stmt = dbConn.prepare(`
      INSERT INTO products (id, category, name, price, inStock, popular, data, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      newProduct.id,
      newProduct.category || '',
      newProduct.name || '',
      Number(newProduct.price) || 0,
      newProduct.inStock ? 1 : 0,
      newProduct.popular ? 1 : 0,
      JSON.stringify(newProduct),
      newProduct.createdAt,
      null
    );

    return newProduct;
  },

  updateProduct(id, updates) {
    const existing = this.getProductById(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const stmt = dbConn.prepare(`
      UPDATE products
      SET category = ?, name = ?, price = ?, inStock = ?, popular = ?, data = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      updated.category || '',
      updated.name || '',
      Number(updated.price) || 0,
      updated.inStock !== false ? 1 : 0,
      updated.popular ? 1 : 0,
      JSON.stringify(updated),
      updated.updatedAt,
      id
    );

    return updated;
  },

  deleteProduct(id) {
    const existing = this.getProductById(id);
    if (!existing) return false;
    const stmt = dbConn.prepare('DELETE FROM products WHERE id = ?');
    const res = stmt.run(id);
    return res.changes > 0;
  },

  // Categories
  getCategories() {
    const catRows = dbConn.prepare('SELECT data FROM categories ORDER BY sortOrder ASC, rowid ASC').all();
    const cats = catRows.map(r => parseJson(r.data)).filter(Boolean);

    // Compute live product counts per category dynamically
    const counts = dbConn.prepare(`
      SELECT category, COUNT(*) as count FROM products GROUP BY category
    `).all().reduce((acc, row) => {
      acc[row.category] = row.count;
      return acc;
    }, {});

    return cats.map(c => ({
      ...c,
      count: counts[c.id] || 0
    }));
  },

  createCategory({ label, blurb, id }) {
    const existingRows = dbConn.prepare('SELECT id FROM categories').all();
    const existingIds = new Set(existingRows.map(r => r.id));

    const cleanId = (id || label)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let uniqueId = cleanId || `cat-${Date.now()}`;
    let counter = 1;
    while (existingIds.has(uniqueId)) {
      uniqueId = `${cleanId}-${counter}`;
      counter++;
    }

    const newCategory = {
      id: uniqueId,
      label: label.trim(),
      blurb: (blurb || '').trim(),
      count: 0
    };

    const maxSort = dbConn.prepare('SELECT MAX(sortOrder) as maxSort FROM categories').get().maxSort || 0;
    const stmt = dbConn.prepare(`
      INSERT INTO categories (id, label, blurb, sortOrder, data, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(newCategory.id, newCategory.label, newCategory.blurb, maxSort + 1, JSON.stringify(newCategory), new Date().toISOString());

    return newCategory;
  },

  updateCategory(id, { label, blurb }) {
    const row = dbConn.prepare('SELECT data FROM categories WHERE id = ?').get(id);
    if (!row) return null;
    const existing = parseJson(row.data);

    const updated = {
      ...existing,
      label: label !== undefined ? label.trim() : existing.label,
      blurb: blurb !== undefined ? blurb.trim() : existing.blurb
    };

    dbConn.prepare('UPDATE categories SET label = ?, blurb = ?, data = ? WHERE id = ?')
      .run(updated.label, updated.blurb, JSON.stringify(updated), id);

    const prodCount = dbConn.prepare('SELECT COUNT(*) as count FROM products WHERE category = ?').get(id).count;
    return {
      ...updated,
      count: prodCount
    };
  },

  deleteCategory(id) {
    const row = dbConn.prepare('SELECT data FROM categories WHERE id = ?').get(id);
    if (!row) return { notFound: true };
    const cat = parseJson(row.data);

    const productCount = dbConn.prepare('SELECT COUNT(*) as count FROM products WHERE category = ?').get(id).count;
    if (productCount > 0) {
      return {
        hasProducts: true,
        productCount,
        error: `Cannot delete category "${cat.label}" because it contains ${productCount} ${productCount === 1 ? 'product' : 'products'}. Please reassign or delete these products first.`
      };
    }

    dbConn.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return { success: true };
  },

  // Deals
  getDeals() {
    const rows = dbConn.prepare('SELECT data FROM deals ORDER BY rowid ASC').all();
    let deals = rows.map(r => parseJson(r.data)).filter(Boolean);

    // Family Deal compatibility check
    let familyDealRow = dbConn.prepare("SELECT value FROM settings WHERE key = 'familyDeal'").get();
    let familyDeal = familyDealRow ? parseJson(familyDealRow.value) : null;

    if (familyDeal && !deals.some(d => String(d.id) === String(familyDeal.id) || String(d.id) === 'family-deal')) {
      const migrated = {
        ...familyDeal,
        id: familyDeal.id || 'family-deal',
        name: familyDeal.name || 'Family Deal 1',
        number: familyDeal.number || '01',
        dealType: 'family',
        tag: familyDeal.tag || 'Family Bundle'
      };
      deals.push(migrated);
      dbConn.prepare('INSERT OR REPLACE INTO deals (id, dealType, featured, data, createdAt) VALUES (?, ?, ?, ?, ?)')
        .run(migrated.id, 'family', migrated.featured ? 1 : 0, JSON.stringify(migrated), new Date().toISOString());
      dbConn.prepare("DELETE FROM settings WHERE key = 'familyDeal'").run();
      familyDeal = null;
    }

    const primaryFamilyDeal = deals.find(d => d.dealType === 'family' || String(d.id) === 'family-deal') || familyDeal || null;
    return {
      deals,
      familyDeal: primaryFamilyDeal
    };
  },

  createDeal(dealData) {
    const isFamily = dealData.dealType === 'family';
    const id = dealData.id || (isFamily ? `family-deal-${Date.now()}` : `deal-${Date.now()}`);

    if (dealData.featured) {
      // Un-feature existing deals
      const deals = dbConn.prepare('SELECT data FROM deals').all().map(r => parseJson(r.data));
      const updateStmt = dbConn.prepare('UPDATE deals SET featured = 0, data = ? WHERE id = ?');
      deals.forEach(d => {
        if (d.featured) {
          d.featured = false;
          updateStmt.run(JSON.stringify(d), String(d.id));
        }
      });
    }

    const newDeal = {
      ...dealData,
      id,
      dealType: isFamily ? 'family' : 'normal',
      featured: !!dealData.featured,
      createdAt: new Date().toISOString()
    };

    dbConn.prepare('INSERT INTO deals (id, dealType, featured, data, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(newDeal.id, newDeal.dealType, newDeal.featured ? 1 : 0, JSON.stringify(newDeal), newDeal.createdAt);

    return newDeal;
  },

  updateDeal(id, updates) {
    const strId = String(id);
    const row = dbConn.prepare('SELECT data FROM deals WHERE id = ?').get(strId);
    if (!row) return null;
    const existing = parseJson(row.data);

    if (updates.featured !== undefined) {
      const isFeat = !!updates.featured;
      const allRows = dbConn.prepare('SELECT data FROM deals').all();
      const updateStmt = dbConn.prepare('UPDATE deals SET featured = ?, data = ? WHERE id = ?');
      allRows.forEach(r => {
        const d = parseJson(r.data);
        const shouldBeFeat = isFeat ? String(d.id) === strId : (String(d.id) === strId ? false : !!d.featured);
        if (d.featured !== shouldBeFeat) {
          d.featured = shouldBeFeat;
          updateStmt.run(shouldBeFeat ? 1 : 0, JSON.stringify(d), String(d.id));
        }
      });
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    dbConn.prepare('UPDATE deals SET dealType = ?, featured = ?, data = ?, updatedAt = ? WHERE id = ?')
      .run(updated.dealType || 'normal', updated.featured ? 1 : 0, JSON.stringify(updated), updated.updatedAt, strId);

    return updated;
  },

  deleteDeal(id) {
    const strId = String(id);
    const stmt = dbConn.prepare('DELETE FROM deals WHERE id = ?');
    stmt.run(strId);
    dbConn.prepare("DELETE FROM settings WHERE key = 'familyDeal'").run();
    return true;
  },

  // Orders
  getOrders() {
    const rows = dbConn.prepare('SELECT data FROM orders ORDER BY rowid DESC').all();
    const orders = rows.map(r => parseJson(r.data)).filter(Boolean);

    // Build phone to email lookup from customer profiles
    const profRows = dbConn.prepare('SELECT data FROM customer_profiles').all();
    const phoneToEmail = {};
    profRows.forEach(r => {
      const p = parseJson(r.data);
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
    const id = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;
    const newOrder = {
      id,
      ...orderData,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const stmt = dbConn.prepare(`
      INSERT INTO orders (id, status, customerEmail, phone, riderId, subtotal, deliveryFee, total, data, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      newOrder.id,
      newOrder.status,
      (newOrder.customerEmail || '').toLowerCase().trim(),
      newOrder.phone || '',
      newOrder.riderId || null,
      Number(newOrder.subtotal) || 0,
      Number(newOrder.deliveryFee) || 0,
      Number(newOrder.total) || 0,
      JSON.stringify(newOrder),
      newOrder.createdAt
    );

    return newOrder;
  },

  updateOrderStatus(id, status, riderData = null) {
    const row = dbConn.prepare('SELECT data FROM orders WHERE id = ?').get(id);
    if (!row) return null;
    const order = parseJson(row.data);

    if (String(order.status || '').toLowerCase() === 'delivered') {
      return order; // Status cannot be changed once delivered
    }

    order.status = status;
    if (riderData) {
      if (riderData.riderId !== undefined) order.riderId = riderData.riderId;
      if (riderData.riderName !== undefined) order.riderName = riderData.riderName;
      if (riderData.riderPhone !== undefined) order.riderPhone = riderData.riderPhone;
    }
    order.updatedAt = new Date().toISOString();

    dbConn.prepare(`
      UPDATE orders
      SET status = ?, riderId = ?, data = ?, updatedAt = ?
      WHERE id = ?
    `).run(order.status, order.riderId || null, JSON.stringify(order), order.updatedAt, id);

    return order;
  },

  assignOrderRider(id, { riderId, riderName, riderPhone } = {}) {
    const row = dbConn.prepare('SELECT data FROM orders WHERE id = ?').get(id);
    if (!row) return null;
    const order = parseJson(row.data);

    if (!riderId) {
      order.riderId = null;
      order.riderName = null;
      order.riderPhone = null;
    } else {
      let rName = riderName;
      let rPhone = riderPhone;
      if (!rName || !rPhone) {
        const rRow = dbConn.prepare('SELECT data FROM riders WHERE id = ?').get(riderId);
        if (rRow) {
          const found = parseJson(rRow.data);
          rName = rName || found.name;
          rPhone = rPhone || found.phone;
        }
      }
      order.riderId = riderId;
      order.riderName = rName || '';
      order.riderPhone = rPhone ? String(rPhone).replace(/\D/g, '').slice(0, 11) : '';
    }
    order.updatedAt = new Date().toISOString();

    dbConn.prepare(`
      UPDATE orders
      SET riderId = ?, data = ?, updatedAt = ?
      WHERE id = ?
    `).run(order.riderId || null, JSON.stringify(order), order.updatedAt, id);

    return order;
  },

  deleteOrder(id) {
    const stmt = dbConn.prepare('DELETE FROM orders WHERE id = ?');
    const res = stmt.run(id);
    return res.changes > 0;
  },

  getCustomerOrders({ email, phone } = {}) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPhone = (phone || '').replace(/\D/g, '');

    if (!cleanEmail && !cleanPhone) {
      return [];
    }

    const targetPhoneNormalized = cleanPhone ? normalizePhone(cleanPhone) : '';

    // Fast indexed candidate query
    let rows;
    if (cleanEmail) {
      rows = dbConn.prepare('SELECT data FROM orders WHERE customerEmail = ? ORDER BY rowid DESC').all(cleanEmail);
    } else {
      rows = dbConn.prepare('SELECT data FROM orders ORDER BY rowid DESC').all();
    }

    const allOrders = rows.map(r => parseJson(r.data)).filter(Boolean);

    return allOrders.filter(o => {
      const orderEmail = (o.customerEmail || '').toLowerCase().trim();
      const orderPhoneNormalized = normalizePhone(o.phone);

      const emailMatch = cleanEmail && orderEmail && orderEmail === cleanEmail;
      const phoneMatch = targetPhoneNormalized && orderPhoneNormalized && (
        orderPhoneNormalized === targetPhoneNormalized ||
        orderPhoneNormalized.endsWith(targetPhoneNormalized.slice(-10))
      );

      return emailMatch || phoneMatch;
    });
  },

  // Customer Profiles
  getCustomerProfile(email) {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) return null;

    const row = dbConn.prepare('SELECT data FROM customer_profiles WHERE email = ?').get(cleanEmail);
    if (row) {
      return parseJson(row.data);
    }

    // Auto-discover profile info from their latest order
    const orderRow = dbConn.prepare('SELECT data FROM orders WHERE customerEmail = ? ORDER BY rowid DESC LIMIT 1').get(cleanEmail);
    if (orderRow) {
      const latest = parseJson(orderRow.data);
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
    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail) return null;

    const existingRow = dbConn.prepare('SELECT data FROM customer_profiles WHERE email = ?').get(cleanEmail);
    const existing = existingRow ? parseJson(existingRow.data) : {};

    const updated = {
      ...existing,
      email: cleanEmail,
      name: (name !== undefined ? name : existing.name) || '',
      phone: (phone !== undefined ? phone : existing.phone) || '',
      address: (address !== undefined ? address : existing.address) || '',
      updatedAt: new Date().toISOString()
    };

    dbConn.prepare('INSERT OR REPLACE INTO customer_profiles (email, data, updatedAt) VALUES (?, ?, ?)')
      .run(cleanEmail, JSON.stringify(updated), updated.updatedAt);

    return updated;
  },

  // FAQs
  getFaqs() {
    const rows = dbConn.prepare('SELECT data FROM faqs ORDER BY rowid ASC').all();
    return rows.map(r => parseJson(r.data)).filter(Boolean);
  },

  // Site Info & Settings
  getSiteInfo() {
    const row = dbConn.prepare("SELECT value FROM settings WHERE key = 'siteInfo'").get();
    return row ? parseJson(row.value, {}) : {};
  },

  getSettings() {
    const defaultButtons = {
      whatsappWeb: true,
      whatsappMobile: true,
      backToTopWeb: true,
      backToTopMobile: true,
      cartWeb: true,
      cartMobile: true
    };
    const defaultCategories = ['pizza', 'burgers'];

    const row = dbConn.prepare("SELECT value FROM settings WHERE key = 'settings'").get();
    let settings = row ? parseJson(row.value) : null;

    if (!settings) {
      settings = {
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
      dbConn.prepare("INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES ('settings', ?, ?)")
        .run(JSON.stringify(settings), new Date().toISOString());
    } else {
      let changed = false;
      if (!settings.floatingButtons) {
        settings.floatingButtons = defaultButtons;
        changed = true;
      }
      if (!Array.isArray(settings.bestSellerCategories)) {
        settings.bestSellerCategories = defaultCategories;
        changed = true;
      }
      if (settings.baseDeliveryEnabled === undefined) {
        settings.baseDeliveryEnabled = true;
        changed = true;
      }
      if (settings.minOrderEnabled === undefined) {
        settings.minOrderEnabled = Number(settings.minOrder || 0) > 0;
        changed = true;
      }
      if (settings.freeDeliveryEnabled === undefined) {
        settings.freeDeliveryEnabled = Number(settings.freeDeliveryThreshold || 0) > 0;
        changed = true;
      }
      if (settings.couponEnabled === undefined) {
        settings.couponEnabled = false;
        changed = true;
      }
      if (settings.couponCode === undefined) {
        settings.couponCode = 'SALIK10';
        changed = true;
      }
      if (settings.couponDiscountType === undefined) {
        settings.couponDiscountType = 'percentage';
        changed = true;
      }
      if (settings.couponDiscountValue === undefined) {
        settings.couponDiscountValue = 10;
        changed = true;
      }
      if (settings.couponMinOrder === undefined) {
        settings.couponMinOrder = 0;
        changed = true;
      }
      if (changed) {
        dbConn.prepare("UPDATE settings SET value = ?, updatedAt = ? WHERE key = 'settings'")
          .run(JSON.stringify(settings), new Date().toISOString());
      }
    }
    return settings;
  },

  updateSettings(updates) {
    const current = this.getSettings();
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

    const newSettings = {
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

    dbConn.prepare("INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES ('settings', ?, ?)")
      .run(JSON.stringify(newSettings), newSettings.updatedAt);

    return newSettings;
  },

  // Best Sellers (computed from item sales in delivered orders)
  getBestSellers() {
    const settings = this.getSettings();
    const allowedCategories = (Array.isArray(settings.bestSellerCategories) && settings.bestSellerCategories.length > 0)
      ? settings.bestSellerCategories.map(c => c.toLowerCase())
      : ['pizza', 'burgers'];

    // 1. Calculate sales count from delivered orders
    const deliveredOrders = dbConn.prepare("SELECT data FROM orders WHERE status = 'Delivered'").all();
    const salesMap = {};
    deliveredOrders.forEach(row => {
      const order = parseJson(row.data);
      if (!order) return;
      (order.items || []).forEach(item => {
        const name = (item.name || '').trim().toLowerCase();
        if (!name) return;
        const qty = Number(item.quantity) || 1;
        salesMap[name] = (salesMap[name] || 0) + qty;
      });
    });

    // 2. Fetch all products in allowedCategories
    const allProducts = this.getProducts();
    const eligibleProducts = allProducts.filter(p => {
      const cat = (p.category || '').toLowerCase();
      return allowedCategories.includes(cat);
    });

    // 3. Attach salesCount
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

    // 4. Sort
    rankedProducts.sort((a, b) => {
      if (b.salesCount !== a.salesCount) {
        return b.salesCount - a.salesCount;
      }
      if (b.popular && !a.popular) return 1;
      if (!b.popular && a.popular) return -1;
      return 0;
    });

    return rankedProducts.slice(0, 4);
  },

  // Reviews
  getReviews() {
    const rows = dbConn.prepare('SELECT data FROM reviews ORDER BY rowid DESC').all();
    const reviews = rows.map(r => parseJson(r.data)).filter(Boolean);

    // Build lookup from customer profiles
    const profRows = dbConn.prepare('SELECT email, data FROM customer_profiles').all();
    const nameToEmail = {};
    profRows.forEach(r => {
      const p = parseJson(r.data);
      if (p && p.name && p.email) {
        nameToEmail[p.name.toLowerCase().trim()] = (p.email || '').toLowerCase().trim();
      }
    });

    // Also build lookup from orders
    const orderRows = dbConn.prepare("SELECT id, customerEmail, data FROM orders WHERE customerEmail IS NOT NULL AND customerEmail != ''").all();
    const orderIdToEmail = {};
    orderRows.forEach(o => {
      if (o.customerEmail) orderIdToEmail[String(o.id)] = (o.customerEmail || '').toLowerCase().trim();
    });

    return reviews.map(rev => {
      const existingEmail = rev.customerEmail || rev.email;
      if (existingEmail) return rev;

      let matchedEmail = null;
      if (rev.orderId && orderIdToEmail[String(rev.orderId)]) {
        matchedEmail = orderIdToEmail[String(rev.orderId)];
      } else if (rev.name && nameToEmail[rev.name.toLowerCase().trim()]) {
        matchedEmail = nameToEmail[rev.name.toLowerCase().trim()];
      } else if (rev.name && rev.name.toLowerCase().includes('salik')) {
        matchedEmail = 'muhammadsalikleo321@gmail.com';
      }

      if (matchedEmail) {
        return {
          ...rev,
          email: matchedEmail,
          customerEmail: matchedEmail
        };
      }
      return rev;
    });
  },

  createReview(reviewData) {
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

    dbConn.prepare('INSERT INTO reviews (id, orderId, name, rating, platform, data, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(newReview.id, newReview.orderId, newReview.name, newReview.rating, newReview.platform, JSON.stringify(newReview), newReview.createdAt);

    return newReview;
  },

  deleteReview(id) {
    const stmt = dbConn.prepare('DELETE FROM reviews WHERE id = ?');
    const res = stmt.run(String(id));
    return res.changes > 0;
  },

  updateOrderDeliveryFee(id, newDeliveryFee) {
    const row = dbConn.prepare('SELECT data FROM orders WHERE id = ?').get(id);
    if (!row) return null;
    const order = parseJson(row.data);

    order.deliveryFee = Math.max(0, Number(newDeliveryFee) || 0);
    order.total = Number(order.subtotal || 0) + order.deliveryFee;
    order.updatedAt = new Date().toISOString();

    dbConn.prepare('UPDATE orders SET deliveryFee = ?, total = ?, data = ?, updatedAt = ? WHERE id = ?')
      .run(order.deliveryFee, order.total, JSON.stringify(order), order.updatedAt, id);

    return order;
  },

  updateOrderItems(id, { items, subtotal, deliveryFee, total, notes }) {
    const row = dbConn.prepare('SELECT data FROM orders WHERE id = ?').get(id);
    if (!row) return null;
    const order = parseJson(row.data);

    if (items) order.items = items;
    if (subtotal !== undefined) order.subtotal = Number(subtotal);
    if (deliveryFee !== undefined) order.deliveryFee = Number(deliveryFee);
    if (total !== undefined) order.total = Number(total);
    if (notes !== undefined) order.notes = notes;
    order.updatedAt = new Date().toISOString();

    dbConn.prepare('UPDATE orders SET subtotal = ?, deliveryFee = ?, total = ?, data = ?, updatedAt = ? WHERE id = ?')
      .run(Number(order.subtotal) || 0, Number(order.deliveryFee) || 0, Number(order.total) || 0, JSON.stringify(order), order.updatedAt, id);

    return order;
  },

  // Riders Management
  getRiders() {
    const rows = dbConn.prepare('SELECT data FROM riders ORDER BY rowid ASC').all();
    return rows.map(r => parseJson(r.data)).filter(Boolean);
  },

  getRiderById(id) {
    const row = dbConn.prepare('SELECT data FROM riders WHERE id = ?').get(id);
    return row ? parseJson(row.data) : null;
  },

  createRider(riderData) {
    const cleanPhone = String(riderData.phone || '').replace(/\D/g, '').slice(0, 11);
    const newRider = {
      id: `rider-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: (riderData.name || '').trim(),
      phone: cleanPhone,
      createdAt: new Date().toISOString()
    };

    dbConn.prepare('INSERT INTO riders (id, name, phone, data, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(newRider.id, newRider.name, newRider.phone, JSON.stringify(newRider), newRider.createdAt);

    return newRider;
  },

  updateRider(id, updates) {
    const existing = this.getRiderById(id);
    if (!existing) return null;

    const cleanPhone = updates.phone !== undefined ? String(updates.phone).replace(/\D/g, '').slice(0, 11) : existing.phone;
    const newName = updates.name !== undefined ? updates.name.trim() : existing.name;

    const updated = {
      ...existing,
      name: newName,
      phone: cleanPhone,
      updatedAt: new Date().toISOString()
    };

    dbConn.prepare('UPDATE riders SET name = ?, phone = ?, data = ?, updatedAt = ? WHERE id = ?')
      .run(updated.name, updated.phone, JSON.stringify(updated), updated.updatedAt, id);

    // Sync updated rider info to active orders assigned to this rider
    const activeOrders = dbConn.prepare('SELECT data FROM orders WHERE riderId = ?').all(id);
    const updateOrderStmt = dbConn.prepare('UPDATE orders SET data = ? WHERE id = ?');
    activeOrders.forEach(r => {
      const o = parseJson(r.data);
      if (updates.name !== undefined) o.riderName = newName;
      if (updates.phone !== undefined) o.riderPhone = cleanPhone;
      updateOrderStmt.run(JSON.stringify(o), o.id);
    });

    return updated;
  },

  deleteRider(id) {
    const stmt = dbConn.prepare('DELETE FROM riders WHERE id = ?');
    const res = stmt.run(id);

    // Unassign deleted rider from active undelivered orders
    const activeOrders = dbConn.prepare("SELECT data FROM orders WHERE riderId = ? AND status != 'Delivered'").all(id);
    const updateOrderStmt = dbConn.prepare('UPDATE orders SET riderId = NULL, data = ? WHERE id = ?');
    activeOrders.forEach(r => {
      const o = parseJson(r.data);
      o.riderId = null;
      o.riderName = null;
      o.riderPhone = null;
      updateOrderStmt.run(JSON.stringify(o), o.id);
    });

    return res.changes > 0;
  },

  // Stats for Admin Dashboard
  getStats() {
    const totalProducts = dbConn.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const totalDeals = dbConn.prepare('SELECT COUNT(*) as count FROM deals').get().count;
    const totalOrders = dbConn.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const pendingOrders = dbConn.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'").get().count;
    const totalReviews = dbConn.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
    const totalRiders = dbConn.prepare('SELECT COUNT(*) as count FROM riders').get().count;

    const revRow = dbConn.prepare("SELECT SUM(total) as revenue FROM orders WHERE status != 'Cancelled'").get();
    const totalRevenue = revRow && revRow.revenue ? Number(revRow.revenue) : 0;

    return {
      totalProducts,
      totalDeals,
      totalOrders,
      pendingOrders,
      totalRevenue,
      totalReviews,
      totalRiders
    };
  }
};
