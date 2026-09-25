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

// Health check endpoint for fast internet/connectivity verification
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
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
    const { status, riderId, riderName, riderPhone } = req.body;
    const riderData = riderId !== undefined
      ? { riderId, riderName, riderPhone }
      : null;
    const updated = db.updateOrderStatus(req.params.id, status, riderData);
    if (!updated) return res.status(404).json({ error: 'Order not found' });
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
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    const comment = (req.body.comment || '').trim() || '-';
    const newReview = db.createReview({ ...req.body, comment });
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
    res.json({ success: true, message: 'Rider deleted successfully' });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Salik Fast Food Server running on:`);
  console.log(`- Local:   http://localhost:${PORT}`);
  console.log(`- Network: http://${getLocalNetworkIp()}:${PORT}`);
});
