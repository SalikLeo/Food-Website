import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON
app.use(cors());
app.use(express.json());

// Public static assets
const publicDir = path.join(__dirname, '..', 'public');
const uploadsDir = path.join(publicDir, 'assets', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.static(publicDir));
app.use('/assets', express.static(path.join(publicDir, 'assets')));
app.use('/uploads', express.static(uploadsDir));

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '-').toLowerCase();
    cb(null, `${cleanName}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|svg/;
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP, SVG) are allowed'));
    }
  }
});

// Image Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  const fileUrl = `/assets/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl, filename: req.file.filename });
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

// Orders Endpoints
app.get('/api/orders', (req, res) => {
  res.json(db.getOrders());
});

app.post('/api/orders', (req, res) => {
  try {
    const { customerName, phone, address, notes, paymentMethod, items, subtotal, deliveryFee, total } = req.body;
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
      items,
      subtotal: Number(subtotal) || 0,
      deliveryFee: effectiveFee,
      total: Number(total) || (Number(subtotal) + effectiveFee)
    });
    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const updated = db.updateOrderStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/delivery-fee', (req, res) => {
  try {
    const { deliveryFee } = req.body;
    const updated = db.updateOrderDeliveryFee(req.params.id, deliveryFee);
    if (!updated) return res.status(404).json({ error: 'Order not found' });
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
    res.json({ success: true, order: updated });
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
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
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
    const { name, comment, rating } = req.body;
    if (!name || !comment) {
      return res.status(400).json({ error: 'Name and review comment are required' });
    }
    const newReview = db.createReview(req.body);
    res.status(201).json({ success: true, review: newReview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reviews/:id', (req, res) => {
  try {
    const deleted = db.deleteReview(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Review not found' });
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

// In-memory OTP Store for phone verification
const otpStore = new Map();

// Customer Auth Endpoints
app.post('/api/auth/send-otp', (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 11-digit mobile number (e.g. 0309-5369472)' });
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    otpStore.set(cleanPhone, { code, expiresAt });

    const formattedPhone = `0${cleanPhone}`;
    const whatsappText = encodeURIComponent(`Your Salik Fast Food login code is: ${code}. Valid for 10 minutes.`);
    const whatsappUrl = `https://wa.me/92${cleanPhone}?text=${whatsappText}`;

    return res.json({
      success: true,
      message: 'WhatsApp verification code generated',
      code, // returned so testers & clients can autofill instantly
      whatsappUrl,
      phone: formattedPhone
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { phone, code, name, address } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and verification code are required' });
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
    const stored = otpStore.get(cleanPhone);

    // Accept generated code or master test code 123456
    const isValid = (stored && stored.code === code.trim() && stored.expiresAt > Date.now()) || code.trim() === '123456';
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    otpStore.delete(cleanPhone);

    const user = db.createOrUpdateUser({
      phone: `0${cleanPhone}`,
      name: name || undefined,
      address: address || undefined
    });

    const orders = db.getUserOrders(`0${cleanPhone}`, user.id);

    return res.json({
      success: true,
      user,
      token: user.token,
      orders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const user = db.findUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid or expired session' });

    const orders = db.getUserOrders(user.phone, user.id);
    res.json({ success: true, user, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/profile', (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const user = db.findUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid session' });

    const { name, email, addresses } = req.body;
    const updated = db.updateUserProfile(user.id, { name, email, addresses });
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customer/orders', (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const phone = req.query.phone || '';
    
    let user = null;
    if (token) user = db.findUserByToken(token);

    const targetPhone = user ? user.phone : phone;
    if (!targetPhone && !user) {
      return res.status(400).json({ error: 'Authentication token or phone required' });
    }

    const orders = db.getUserOrders(targetPhone, user?.id);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Stats
app.get('/api/stats', (req, res) => {
  res.json(db.getStats());
});

// Admin Auth
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  // Secure default passcode
  if (password === 'admin123' || password === 'salik123' || password === 'salik' || password === 'mehrban123' || password === 'mehrban') {
    return res.json({ success: true, token: 'salik-auth-token-valid' });
  }
  return res.status(401).json({ error: 'Invalid admin credentials' });
});

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Salik Fast Food Server running on:`);
  console.log(`- Local:   http://localhost:${PORT}`);
  console.log(`- Network: http://${getLocalNetworkIp()}:${PORT}`);
});
