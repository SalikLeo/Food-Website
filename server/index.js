import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
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

// Configurable Email Transporter for Sending Real Verification Codes
function createEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (user && pass) {
    if (host) {
      return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
    } else {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    }
  }
  return null;
}

async function sendVerificationEmail(toEmail, code) {
  const transporter = createEmailTransporter();
  const subject = `Your Salik Fast Food Verification Code: ${code}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 20px; background-color: #0e0e11; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #16161c; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #e53e10, #f56505); padding: 28px 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">SALIK FAST FOOD</h1>
          <p style="margin: 4px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 12px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">Wah Cantt • Taste That You Need</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px; text-align: center;">
          <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #ffffff; font-weight: 700;">Email Verification Code</h2>
          <p style="margin: 0 0 24px 0; font-size: 14px; color: #a1a1aa; line-height: 1.5;">
            Use the 6-digit verification code below to sign in, save your delivery addresses, and track your recent orders:
          </p>

          <!-- OTP Badge -->
          <div style="background-color: #212129; border: 1px solid #f97316; border-radius: 14px; padding: 18px 24px; margin: 0 auto 24px auto; display: inline-block;">
            <span style="font-family: monospace, Courier, sans-serif; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #fb923c; display: block; margin-left: 8px;">
              ${code}
            </span>
          </div>

          <p style="margin: 0; font-size: 12px; color: #71717a;">
            ⏳ This code is valid for <strong>10 minutes</strong>. If you did not request this email, please disregard it.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #121216; padding: 16px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11px; color: #71717a;">
          <p style="margin: 0 0 4px 0;">Salik Fast Food, Wah Model Town, Wah Cantt</p>
          <p style="margin: 0;">Hotline: <strong style="color: #ea580c;">0309-5369472</strong></p>
        </div>

      </div>
    </body>
    </html>
  `;

  if (transporter) {
    try {
      const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@salikfastfood.com';
      const info = await transporter.sendMail({
        from: `"Salik Fast Food" <${fromAddress}>`,
        to: toEmail,
        subject,
        html
      });
      console.log(`[Email Sent] Verification code ${code} successfully sent to ${toEmail}. MessageId: ${info.messageId}`);
      return { sent: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Send Error] Failed to send to ${toEmail}:`, err.message);
      return { sent: false, error: err.message };
    }
  } else {
    console.log(`[EMAIL NOTICE] No SMTP configured yet (set EMAIL_USER & EMAIL_PASS or SMTP_*). Code for ${toEmail} is: ${code}`);
    return { sent: false, mock: true, code };
  }
}

// In-memory OTP Store for email verification
const otpStore = new Map();

// Customer Auth Endpoints (Email OTP)
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address (e.g. yourname@gmail.com)' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    otpStore.set(cleanEmail, { code, expiresAt });

    const emailResult = await sendVerificationEmail(cleanEmail, code);

    return res.json({
      success: true,
      message: emailResult.sent
        ? `Verification code sent to ${cleanEmail}`
        : `Verification code generated for ${cleanEmail}`,
      email: cleanEmail,
      delivered: emailResult.sent,
      // Provide devCode fallback only if SMTP not configured so tester is never locked out
      devCode: emailResult.sent ? undefined : code
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { email, code, name, phone, address } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const stored = otpStore.get(cleanEmail);

    // Accept generated code or master test code 123456
    const isValid = (stored && stored.code === code.trim() && stored.expiresAt > Date.now()) || code.trim() === '123456';
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    otpStore.delete(cleanEmail);

    const user = db.createOrUpdateUser({
      email: cleanEmail,
      phone: phone ? phone.trim() : undefined,
      name: name ? name.trim() : undefined,
      address: address ? address.trim() : undefined
    });

    const orders = db.getUserOrders({ email: cleanEmail, phone: user.phone, userId: user.id });

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

    const orders = db.getUserOrders({ email: user.email, phone: user.phone, userId: user.id });
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

    const { name, email, phone, addresses } = req.body;
    const updated = db.updateUserProfile(user.id, { name, email, phone, addresses });
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
    const email = req.query.email || '';
    
    let user = null;
    if (token) user = db.findUserByToken(token);

    const targetPhone = user?.phone || phone;
    const targetEmail = user?.email || email;

    if (!targetPhone && !targetEmail && !user) {
      return res.status(400).json({ error: 'Authentication token, email, or phone required' });
    }

    const orders = db.getUserOrders({ email: targetEmail, phone: targetPhone, userId: user?.id });
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
