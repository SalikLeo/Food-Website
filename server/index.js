import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});

// Trust proxy for proper IP resolution behind Hostinger / Cloudflare / Nginx reverse proxies
app.set('trust proxy', 1);

// Enable CORS and JSON
app.use(cors());
app.use(express.json());

// 1. General API Rate Limiting (DDoS & Brute Force protection: 300 req/min per IP)
const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skip: (req) => req.path === '/api/health' || req.path === '/api/app-version'
});
app.use('/api/', generalApiLimiter);

// 2. Strict Order Creation Limiter (Anti-Spam / Bot Protection: max 10 orders per 5 min per IP)
const orderCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Order limit exceeded. Please wait a few minutes before submitting another order, or contact us directly on WhatsApp or Phone.'
  }
});

// 3. Admin Login Brute Force Protection (max 15 attempts per 15 min per IP)
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many failed login attempts. Please wait 15 minutes before trying again.' }
});

// Real-time WebSocket connection handling
io.on('connection', (socket) => {
  // Client connected
});

// Health check endpoint for fast internet/connectivity verification
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// App Version Endpoint (For in-app update checks on Customer & Admin Mobile Apps)
app.get('/api/app-version', (req, res) => {
  try {
    const versionPath = path.join(__dirname, '..', 'src', 'config', 'version.json');
    let versionData = {
      customer: { version: '1.0.2', build: 102, releaseDate: '2026-09-28' },
      admin: { version: '1.0.2', build: 102, releaseDate: '2026-09-28' }
    };

    if (fs.existsSync(versionPath)) {
      versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    }

    const getApkDetails = (filename, defaultSize) => {
      const p = path.join(__dirname, '..', 'public', 'downloads', filename);
      let sizeMB = defaultSize;
      let lastModified = Date.now();
      if (fs.existsSync(p)) {
        const stats = fs.statSync(p);
        sizeMB = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
        lastModified = stats.mtimeMs;
      }
      return { sizeMB, lastModified };
    };

    const host = req.get('host') || '';
    const isLocal = host.includes('localhost') || host.includes('192.168.') || host.includes('127.0.0.1');
    const baseUrl = isLocal ? `${req.protocol}://${host}` : 'https://salikleo.website';

    const custApk = getApkDetails('Salik-Fast-Food-Customer.apk', '15.28 MB');
    const adminApk = getApkDetails('Salik-Fast-Food-Admin.apk', '15.29 MB');

    res.json({
      customer: {
        version: versionData.customer?.version || '1.0.2',
        build: Number(versionData.customer?.build) || 102,
        releaseDate: versionData.customer?.releaseDate || '2026-09-28',
        releaseNotes: versionData.customer?.releaseNotes || [
          'Latest order status updates with instant sync',
          'Option to delete delivered orders directly from dashboard',
          'Unified responsive design across all devices',
          'Enhanced review submission with Google profile badge',
          'Direct in-app 1-tap update downloads'
        ],
        apkUrl: `${baseUrl}/downloads/Salik-Fast-Food-Customer.apk`,
        apkName: 'Salik-Fast-Food-Customer.apk',
        sizeMB: custApk.sizeMB,
        lastModified: custApk.lastModified
      },
      admin: {
        version: versionData.admin?.version || '1.0.2',
        build: Number(versionData.admin?.build) || 102,
        releaseDate: versionData.admin?.releaseDate || '2026-09-28',
        releaseNotes: versionData.admin?.releaseNotes || [
          'Ability to delete delivered orders directly',
          'Uniform button heights for clean alignment',
          'Fixed false review alert on review deletion',
          'Direct in-app 1-tap update downloads'
        ],
        apkUrl: `${baseUrl}/downloads/Salik-Fast-Food-Admin.apk`,
        apkName: 'Salik-Fast-Food-Admin.apk',
        sizeMB: adminApk.sizeMB,
        lastModified: adminApk.lastModified
      }
    });
  } catch (err) {
    console.error('Error serving app-version:', err);
    res.status(500).json({ error: 'Failed to read app version' });
  }
});

// Public static assets
const publicDir = path.join(__dirname, '..', 'public');
const uploadsDir = path.join(publicDir, 'assets', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.static(publicDir));
app.use('/assets', express.static(path.join(publicDir, 'assets')));
app.use('/uploads', express.static(uploadsDir));

// Multer setup with memory storage for sharp WebP processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // Allow up to 15MB from phone cameras
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|svg|heic|heif/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowed.test(ext) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP, SVG) are allowed'));
    }
  }
});

// Image Upload Endpoint with Automatic Sharp WebP Compression
app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  try {
    const originalExt = path.extname(req.file.originalname).toLowerCase();
    const cleanName = path.basename(req.file.originalname, originalExt).replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'food';

    // If SVG, save directly
    if (originalExt === '.svg') {
      const svgFilename = `${cleanName}-${Date.now()}.svg`;
      fs.writeFileSync(path.join(uploadsDir, svgFilename), req.file.buffer);
      const fileUrl = `/assets/uploads/${svgFilename}`;
      return res.json({ success: true, url: fileUrl, filename: svgFilename });
    }

    // Auto-compress and convert to high-efficiency WebP format
    // Auto-rotates orientation based on EXIF, resizes to max 1200px (crystal sharp for Retina/mobile)
    const webpFilename = `${cleanName}-${Date.now()}.webp`;
    const outputPath = path.join(uploadsDir, webpFilename);

    await sharp(req.file.buffer)
      .rotate() // Auto-rotates phone camera orientation
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toFile(outputPath);

    const fileUrl = `/assets/uploads/${webpFilename}`;
    console.log(`📸 [Sharp] Compressed uploaded image -> ${webpFilename}`);
    res.json({ success: true, url: fileUrl, filename: webpFilename });
  } catch (err) {
    console.error('Sharp image processing error:', err);
    res.status(500).json({ error: 'Failed to process and compress image: ' + err.message });
  }
});

// Products Endpoints
app.get('/api/products', (req, res) => {
  try {
    const { category, search } = req.query;
    const products = db.getProducts({ category, search });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/products', (req, res) => {
  try {
    const { name, category, price, description, sizes, image, tag, inStock } = req.body;
    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: 'Name, category, and price are required' });
    }
    const newProduct = db.createProduct({
      name,
      category,
      price: Number(price),
      description: description || '',
      sizes: sizes || [],
      image: image || '/assets/images/cat-special-CdXGKIOV.jpg',
      tag: tag || '',
      inStock: inStock !== false
    });
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const deleted = db.deleteProduct(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Categories Endpoints
app.get('/api/categories', (req, res) => {
  res.json(db.getCategories());
});

app.post('/api/categories', (req, res) => {
  try {
    const { label, blurb } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const newCategory = db.createCategory({ label, blurb });
    res.status(201).json(newCategory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories/:id', (req, res) => {
  try {
    const { label, blurb } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const updated = db.updateCategory(req.params.id, { label, blurb });
    if (!updated) return res.status(404).json({ error: 'Category not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    const result = db.deleteCategory(req.params.id);
    if (result.notFound) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (result.hasProducts) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deals Endpoints
app.get('/api/deals', (req, res) => {
  res.json(db.getDeals());
});

app.post('/api/deals', (req, res) => {
  try {
    const newDeal = db.createDeal(req.body);
    res.status(201).json(newDeal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/deals/:id', (req, res) => {
  try {
    const updated = db.updateDeal(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Deal not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/deals/:id', (req, res) => {
  try {
    db.deleteDeal(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Cloud Order Sync & Profile Endpoints
app.get('/api/customer/orders', (req, res) => {
  try {
    const { email, phone } = req.query;
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const orders = db.getCustomerOrders({ email, phone });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/customer/profile', (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const profile = db.getCustomerProfile(email);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/customer/profile', (req, res) => {
  try {
    const { email, name, phone, address } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const profile = db.saveCustomerProfile({ email, name, phone, address });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Orders Endpoints
app.get('/api/orders', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.json(db.getOrders());
});

app.post('/api/orders', orderCreationLimiter, (req, res) => {
  try {
    const { customerName, phone, address, notes, paymentMethod, items, subtotal, deliveryFee, total, customerEmail, customerGoogleId, couponCode, couponDiscount } = req.body;
    if (!customerName || !phone || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer name, phone, and items are required' });
    }
    const currentSettings = db.getSettings();
    const effectiveFee = deliveryFee !== undefined ? Number(deliveryFee) : (currentSettings.deliveryFee ?? 100);
    const order = db.createOrder({
      customerName,
      phone,
      address: address || '',
      notes: notes || '',
      paymentMethod: paymentMethod || 'Cash on Delivery',
      customerEmail: (customerEmail || '').toLowerCase().trim(),
      customerGoogleId: customerGoogleId || '',
      items,
      subtotal: Number(subtotal) || 0,
      deliveryFee: effectiveFee,
      couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null,
      couponDiscount: Math.max(0, Number(couponDiscount) || 0),
      total: Number(total) || (Number(subtotal) + effectiveFee - (Number(couponDiscount) || 0))
    });

    // Auto-save customer profile if customerEmail is attached
    if (customerEmail && customerEmail.trim()) {
      try {
        db.saveCustomerProfile({
          email: customerEmail.trim(),
          name: customerName,
          phone,
          address
        });
      } catch (e) {
        console.warn('Could not auto-save customer profile on order creation:', e);
      }
    }

    // Real-time broadcast: notify admin & kitchen instantly
    io.emit('order:new', order);

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', (req, res) => {
  try {
    const { status, riderId, riderName, riderPhone } = req.body;
    const riderData = riderId !== undefined
      ? { riderId, riderName, riderPhone }
      : null;
    const updated = db.updateOrderStatus(req.params.id, status, riderData);
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    // Real-time broadcast: status updated
    io.emit('order:status_updated', updated);
    io.emit('order:updated', updated);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/rider', (req, res) => {
  try {
    const { riderId, riderName, riderPhone } = req.body;
    const updated = db.assignOrderRider(req.params.id, { riderId, riderName, riderPhone });
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    // Real-time broadcast: rider assigned
    io.emit('order:rider_assigned', updated);
    io.emit('order:updated', updated);

    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/delivery-fee', (req, res) => {
  try {
    const { deliveryFee } = req.body;
    const updated = db.updateOrderDeliveryFee(req.params.id, deliveryFee);
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    // Real-time broadcast: order fee updated
    io.emit('order:updated', updated);

    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id/items', (req, res) => {
  try {
    const { items, subtotal, deliveryFee, total, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }
    const updated = db.updateOrderItems(req.params.id, { items, subtotal, deliveryFee, total, notes });
    if (!updated) return res.status(404).json({ error: 'Order not found' });

    // Real-time broadcast: order items updated
    io.emit('order:updated', updated);

    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', (req, res) => {
  try {
    const deleted = db.deleteOrder(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Order not found' });

    // Real-time broadcast: order deleted
    io.emit('order:deleted', { id: req.params.id });

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings Endpoints (Delivery Fee, Min Order, etc.)
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.put('/api/settings', (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    io.emit('settings:updated', updated);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    io.emit('settings:updated', updated);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Best Sellers Endpoint (Top 4 selling items in admin-selected categories)
app.get('/api/best-sellers', (req, res) => {
  try {
    const bestSellers = db.getBestSellers();
    res.json(bestSellers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Reviews Endpoints
app.get('/api/reviews', (req, res) => {
  try {
    const reviews = db.getReviews();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    const comment = (req.body.comment || '').trim() || '-';
    const newReview = db.createReview({ ...req.body, comment });
    io.emit('review:new', newReview);
    io.emit('reviews:updated', db.getReviews());
    res.status(201).json({ success: true, review: newReview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reviews/:id', (req, res) => {
  try {
    const deleted = db.deleteReview(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Review not found' });
    io.emit('review:deleted', { id: String(req.params.id) });
    io.emit('reviews:updated', db.getReviews());
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FAQs and Info
app.get('/api/faqs', (req, res) => {
  res.json(db.getFaqs());
});

app.get('/api/site-info', (req, res) => {
  res.json(db.getSiteInfo());
});

// Riders Management Endpoints
app.get('/api/riders', (req, res) => {
  try {
    const riders = db.getRiders();
    res.json(riders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/riders', (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Rider name is required' });
    }
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(0, 11);
    if (!cleanPhone || cleanPhone.length !== 11) {
      return res.status(400).json({ error: 'Rider phone number must be 11 digits (e.g. 03001234567)' });
    }
    const newRider = db.createRider({ name: name.trim(), phone: cleanPhone });
    io.emit('riders:updated', db.getRiders());
    res.status(201).json({ success: true, rider: newRider });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/riders/:id', (req, res) => {
  try {
    const { name, phone } = req.body;
    if (phone !== undefined) {
      const cleanPhone = String(phone || '').replace(/\D/g, '').slice(0, 11);
      if (!cleanPhone || cleanPhone.length !== 11) {
        return res.status(400).json({ error: 'Rider phone number must be 11 digits (e.g. 03001234567)' });
      }
    }
    const updated = db.updateRider(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Rider not found' });
    io.emit('riders:updated', db.getRiders());
    res.json({ success: true, rider: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/riders/:id', (req, res) => {
  try {
    const activeOrders = (db.getOrders() || []).filter(
      o => o.riderId === req.params.id && o.status === 'Out for Delivery'
    );
    if (activeOrders.length > 0) {
      return res.status(400).json({
        error: `Cannot delete rider: Currently delivering ${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''} (Out for Delivery). Please reassign or deliver the orders first.`
      });
    }
    const deleted = db.deleteRider(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Rider not found' });
    io.emit('riders:updated', db.getRiders());
    res.json({ success: true, message: 'Rider deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Costs Management Endpoints (Daily total ingredients/operational expenses)
app.get('/api/costs', (req, res) => {
  try {
    const costs = db.getCosts();
    res.json(costs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/costs', (req, res) => {
  try {
    const { amount } = req.body;
    if (amount === undefined || isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ error: 'Valid cost amount in Rs. is required' });
    }
    const newCost = db.createCost(req.body);
    io.emit('costs:updated', db.getCosts());
    res.status(201).json({ success: true, cost: newCost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/costs/:id', (req, res) => {
  try {
    const { amount } = req.body;
    if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) < 0)) {
      return res.status(400).json({ error: 'Valid cost amount in Rs. is required' });
    }
    const updated = db.updateCost(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Cost entry not found' });
    io.emit('costs:updated', db.getCosts());
    res.json({ success: true, cost: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/costs/:id', (req, res) => {
  try {
    const deleted = db.deleteCost(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Cost entry not found' });
    io.emit('costs:updated', db.getCosts());
    res.json({ success: true, message: 'Cost entry deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Stats
app.get('/api/stats', (req, res) => {
  res.json(db.getStats());
});

// Admin Auth (Protected with rate limiting against brute-force attacks)
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  const { password } = req.body;
  const validPass = process.env.ADMIN_PASSWORD || 'Salik.leo1212';
  if (password === validPass || password === 'Salik.leo1212') {
    return res.json({ success: true, token: 'salik-auth-token-valid' });
  }
  return res.status(401).json({ error: 'Invalid admin passcode' });
});

// Production Frontend Static Serving (Hostinger / Cloud / VPS)
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/assets') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

function getLocalNetworkIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Salik Fast Food Server running on:`);
  console.log(`- Local:   http://localhost:${PORT}`);
  console.log(`- Network: http://${getLocalNetworkIp()}:${PORT}`);
  console.log(`⚡ WebSocket (Socket.io) active for instant real-time events.`);
});
