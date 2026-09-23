import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import BestSellersSection from './components/BestSellersSection';
import DealsSection from './components/DealsSection';
import MenuSection from './components/MenuSection';
import OrderSection from './components/OrderSection';
import AboutSection from './components/AboutSection';
import ContactSection from './components/ContactSection';
import FaqSection from './components/FaqSection';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import OrderSuccessModal from './components/OrderSuccessModal';
import CustomerNotificationBanner from './components/CustomerNotificationBanner';
import UserProfileModal from './components/UserProfileModal';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import CustomerMobileApp from './components/MobileApp/CustomerMobileApp';
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

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [familyDeal, setFamilyDeal] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [settings, setSettings] = useState(null);
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

      if (Array.isArray(catsRes) && catsRes.length > 0) setCategories(catsRes);
      if (Array.isArray(prodsRes) && prodsRes.length > 0) setProducts(prodsRes);
      if (dealsRes?.deals) setDeals(dealsRes.deals);
      if (dealsRes?.familyDeal) setFamilyDeal(dealsRes.familyDeal);
      if (Array.isArray(faqsRes) && faqsRes.length > 0) setFaqs(faqsRes);
      if (settingsRes) setSettings(settingsRes);
    } catch (e) {
      console.error('Error fetching storefront data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
    <div className={`min-h-screen ${isDark ? 'dark bg-[#0d0d0e] text-white' : 'light bg-[#faf8f5] text-zinc-900'} selection:bg-orange-500 selection:text-white transition-colors duration-300`}>
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
        <FaqSection faqs={faqs} />
      </main>

      <Footer categories={categories} settings={settings} />
      <CartDrawer isDark={isDark} />
      <OrderSuccessModal />
      <UserProfileModal />
      <CustomerNotificationBanner />
    </div>
  );
}
