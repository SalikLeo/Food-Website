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
    let deals = data.deals || [];
    if (data.familyDeal && !deals.some(d => d.id === data.familyDeal.id || d.id === 'family-deal')) {
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
    const primaryFamilyDeal = deals.find(d => d.dealType === 'family' || d.id === 'family-deal') || data.familyDeal || null;
    return {
      deals,
      familyDeal: primaryFamilyDeal
    };
  },

  createDeal(dealData) {
    const data = readDb();
    const isFamily = dealData.dealType === 'family';
    const id = dealData.id || (isFamily ? `family-deal-${Date.now()}` : `deal-${Date.now()}`);
    const newDeal = {
      ...dealData,
      id,
      dealType: isFamily ? 'family' : 'normal'
    };
    data.deals = [...(data.deals || []), newDeal];
    writeDb(data);
    return newDeal;
  },

  updateDeal(id, updates) {
    const data = readDb();
    if (data.familyDeal && (id === 'family-deal' || id === data.familyDeal.id)) {
      data.familyDeal = { ...data.familyDeal, ...updates };
    }
    const idx = (data.deals || []).findIndex(d => d.id === id);
    if (idx !== -1) {
      data.deals[idx] = { ...data.deals[idx], ...updates };
      writeDb(data);
      return data.deals[idx];
    }
    if (id === 'family-deal' && data.familyDeal) {
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
    return data.orders || [];
  },

  createOrder(orderData) {
    const data = readDb();
    const id = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;
    
    // Auto-link userId if customer exists by phone
    let userId = orderData.userId || null;
    if (!userId && orderData.phone && Array.isArray(data.users)) {
      const cleanPhone = (orderData.phone || '').replace(/[^0-9]/g, '').slice(-10);
      const user = data.users.find(u => (u.phone || '').replace(/[^0-9]/g, '').slice(-10) === cleanPhone);
      if (user) userId = user.id;
    }

    const newOrder = {
      id,
      ...orderData,
      userId,
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
        bestSellerCategories: defaultCategories
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
      deliveryFee: updates.deliveryFee !== undefined ? Number(updates.deliveryFee) : (current.deliveryFee ?? 100),
      minOrder: updates.minOrder !== undefined ? Number(updates.minOrder) : (current.minOrder ?? 500),
      freeDeliveryThreshold: updates.freeDeliveryThreshold !== undefined ? Number(updates.freeDeliveryThreshold) : (current.freeDeliveryThreshold ?? 0),
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

    const newReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: (reviewData.name || 'Anonymous Customer').trim(),
      location: (reviewData.location || 'Wah Cantt').trim(),
      platform: reviewData.platform || 'Customer Review',
      rating: Math.min(5, Math.max(1, Number(reviewData.rating) || 5)),
      date: 'Just now',
      avatar: initials,
      avatarBg: reviewData.avatarBg || randomColor,
      itemOrdered: (reviewData.itemOrdered || 'MP Special Meal').trim(),
      comment: (reviewData.comment || '').trim(),
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
    const reviews = data.reviews || [];
    
    const totalRevenue = orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      
    const pendingOrders = orders.filter(o => o.status === 'Pending').length;
    
    return {
      totalProducts: products.length,
      totalDeals: deals.length + (data.familyDeal ? 1 : 0),
      totalOrders: orders.length,
      pendingOrders,
      totalRevenue,
      totalReviews: reviews.length
    };
  },

  // Customers / Users
  getUsers() {
    const data = readDb();
    return data.users || [];
  },

  findUserByPhone(phone) {
    const data = readDb();
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '').slice(-10);
    return (data.users || []).find(u => {
      const uPhone = (u.phone || '').replace(/[^0-9]/g, '').slice(-10);
      return uPhone && uPhone === cleanPhone;
    }) || null;
  },

  findUserByToken(token) {
    if (!token) return null;
    const data = readDb();
    return (data.users || []).find(u => u.token === token) || null;
  },

  createOrUpdateUser({ phone, name, email, address }) {
    const data = readDb();
    if (!Array.isArray(data.users)) data.users = [];
    
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '').slice(-10);
    let user = data.users.find(u => {
      const uPhone = (u.phone || '').replace(/[^0-9]/g, '').slice(-10);
      return uPhone && uPhone === cleanPhone;
    });

    const now = new Date().toISOString();
    const token = `salik_cust_${Buffer.from(`cust_${Date.now()}_${cleanPhone}`).toString('base64')}`;

    if (user) {
      if (name !== undefined && name.trim()) user.name = name.trim();
      if (email !== undefined && email.trim()) user.email = email.trim();
      if (address && address.trim()) {
        if (!Array.isArray(user.addresses)) user.addresses = [];
        if (!user.addresses.includes(address.trim())) {
          user.addresses.unshift(address.trim());
        }
      }
      user.lastLoginAt = now;
      user.token = token;
      user.updatedAt = now;
    } else {
      user = {
        id: `cust_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
        phone: phone || '',
        name: name ? name.trim() : '',
        email: email ? email.trim() : '',
        addresses: address && address.trim() ? [address.trim()] : [],
        createdAt: now,
        lastLoginAt: now,
        token
      };
      data.users.push(user);
    }

    writeDb(data);
    return user;
  },

  updateUserProfile(userId, { name, email, addresses }) {
    const data = readDb();
    const user = (data.users || []).find(u => u.id === userId);
    if (!user) return null;
    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email.trim();
    if (addresses !== undefined && Array.isArray(addresses)) user.addresses = addresses;
    user.updatedAt = new Date().toISOString();
    writeDb(data);
    return user;
  },

  getUserOrders(phone, userId = null) {
    const data = readDb();
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '').slice(-10);
    return (data.orders || []).filter(o => {
      if (userId && o.userId === userId) return true;
      if (cleanPhone) {
        const oPhone = (o.phone || '').replace(/[^0-9]/g, '').slice(-10);
        return oPhone && oPhone === cleanPhone;
      }
      return false;
    });
  }
};
