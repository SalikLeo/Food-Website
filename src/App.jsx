import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import BestSellersSection from './components/BestSellersSection';
import DealsSection from './components/DealsSection';
import MenuSection from './components/MenuSection';
import OrderSection from './components/OrderSection';
import AboutSection from './components/AboutSection';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import OrderSuccessModal from './components/OrderSuccessModal';
import CustomerNotificationBanner from './components/CustomerNotificationBanner';
import UserProfileModal from './components/UserProfileModal';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import CustomerMobileApp from './components/MobileApp/CustomerMobileApp';
import OfflineNotice from './components/OfflineNotice';
import { CartProvider, useCart } from './context/CartContext';
import { apiUrl, APP_MODE, isCustomerApp } from './config/api';

export default function App() {
  const [isAdminView, setIsAdminView] = useState(() => {
    if (APP_MODE === 'admin') return true;
    if (APP_MODE === 'customer' || isCustomerApp) return false;
    return window.location.pathname.includes('/admin') || window.location.hash.includes('admin');
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem('salik_admin_token') || localStorage.getItem('mehrban_admin_token'));
  });

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_cached_categories');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_cached_products');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [deals, setDeals] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_cached_deals');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [familyDeal, setFamilyDeal] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_cached_family_deal');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [faqs, setFaqs] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_cached_faqs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_cached_settings');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Sync hash/path for admin
  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminView(window.location.hash.includes('admin') || window.location.pathname.includes('/admin'));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch initial public data
  const loadData = async () => {
    try {
      const [catsRes, prodsRes, dealsRes, faqsRes, settingsRes] = await Promise.all([
        fetch(apiUrl('/api/categories')).then(r => r.json()).catch(() => []),
        fetch(apiUrl('/api/products')).then(r => r.json()).catch(() => []),
        fetch(apiUrl('/api/deals')).then(r => r.json()).catch(() => ({ deals: [], familyDeal: null })),
        fetch(apiUrl('/api/faqs')).then(r => r.json()).catch(() => []),
        fetch(apiUrl('/api/settings')).then(r => r.json()).catch(() => null)
      ]);

      if (Array.isArray(catsRes) && catsRes.length > 0) {
        setCategories(catsRes);
        try { localStorage.setItem('salik_cached_categories', JSON.stringify(catsRes)); } catch {}
      }
      if (Array.isArray(prodsRes) && prodsRes.length > 0) {
        setProducts(prodsRes);
        try { localStorage.setItem('salik_cached_products', JSON.stringify(prodsRes)); } catch {}
      }
      if (dealsRes?.deals) {
        setDeals(dealsRes.deals);
        try { localStorage.setItem('salik_cached_deals', JSON.stringify(dealsRes.deals)); } catch {}
      }
      if (dealsRes?.familyDeal) {
        setFamilyDeal(dealsRes.familyDeal);
        try { localStorage.setItem('salik_cached_family_deal', JSON.stringify(dealsRes.familyDeal)); } catch {}
      }
      if (Array.isArray(faqsRes) && faqsRes.length > 0) {
        setFaqs(faqsRes);
        try { localStorage.setItem('salik_cached_faqs', JSON.stringify(faqsRes)); } catch {}
      }
      if (settingsRes) {
        setSettings(settingsRes);
        try { localStorage.setItem('salik_cached_settings', JSON.stringify(settingsRes)); } catch {}
      }
    } catch (e) {
      console.error('Error fetching storefront data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen to reconnection events from OfflineNotice
  useEffect(() => {
    const handleRetry = () => {
      loadData();
    };
    window.addEventListener('salik_retry_connection', handleRetry);
    return () => window.removeEventListener('salik_retry_connection', handleRetry);
  }, []);

  const handleOpenAdmin = () => {
    window.location.hash = 'admin';
    setIsAdminView(true);
  };

  const handleExitAdmin = () => {
    window.location.hash = '';
    setIsAdminView(false);
    loadData(); // refresh storefront in case products were edited
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('salik_admin_token');
    localStorage.removeItem('mehrban_admin_token');
    setIsAdminAuthenticated(false);
  };

  return (
    <CartProvider>
      <OfflineNotice />
      {isAdminView ? (
        isAdminAuthenticated ? (
          <AdminDashboard
            onLogout={handleAdminLogout}
            onBackToStore={handleExitAdmin}
          />
        ) : (
          <AdminLogin
            onLogin={() => setIsAdminAuthenticated(true)}
            onBackToStore={handleExitAdmin}
          />
        )
      ) : isCustomerApp ? (
        <CustomerMobileApp
          categories={categories}
          products={products}
          deals={deals}
          familyDeal={familyDeal}
          settings={settings}
        />
      ) : (
        <WebsiteStorefront
          categories={categories}
          products={products}
          deals={deals}
          familyDeal={familyDeal}
          faqs={faqs}
          settings={settings}
          handleOpenAdmin={handleOpenAdmin}
        />
      )}
    </CartProvider>
  );
}

function WebsiteStorefront({
  categories,
  products,
  deals,
  familyDeal,
  faqs,
  settings,
  handleOpenAdmin
}) {
  const { isDark } = useCart();

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-[#0d0d0e] text-white selection:bg-orange-500/35 selection:text-white' : 'light bg-[#faf8f5] text-zinc-900 selection:bg-orange-500/25 selection:text-inherit'} transition-colors duration-300`}>
      <Header
        onAdminClick={handleOpenAdmin}
        hideAdmin={false}
      />
      
      <main>
        <Hero products={products} deals={deals} />
        <BestSellersSection products={products} categories={categories} settings={settings} />
        <DealsSection deals={deals} familyDeal={familyDeal} />
        <MenuSection categories={categories} products={products} />
        <OrderSection />
        <AboutSection categories={categories} products={products} deals={deals} />
        <ContactSection />
      </main>

      <Footer categories={categories} settings={settings} />
      <CartDrawer isDark={isDark} />
      <OrderSuccessModal />
      <UserProfileModal />
      <CustomerNotificationBanner />
    </div>
  );
}
