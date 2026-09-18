import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import DealsSection from './components/DealsSection';
import MenuSection from './components/MenuSection';
import OrderSection from './components/OrderSection';
import AboutSection from './components/AboutSection';
import ContactSection from './components/ContactSection';
import FaqSection from './components/FaqSection';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import OrderSuccessModal from './components/OrderSuccessModal';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import { CartProvider } from './context/CartContext';

export default function App() {
  const [isAdminView, setIsAdminView] = useState(() => {
    return window.location.pathname.includes('/admin') || window.location.hash.includes('admin');
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem('mehrban_admin_token'));
  });

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [familyDeal, setFamilyDeal] = useState(null);
  const [faqs, setFaqs] = useState([]);
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
      const [catsRes, prodsRes, dealsRes, faqsRes] = await Promise.all([
        fetch('/api/categories').then(r => r.json()).catch(() => []),
        fetch('/api/products').then(r => r.json()).catch(() => []),
        fetch('/api/deals').then(r => r.json()).catch(() => ({ deals: [], familyDeal: null })),
        fetch('/api/faqs').then(r => r.json()).catch(() => [])
      ]);

      if (Array.isArray(catsRes) && catsRes.length > 0) setCategories(catsRes);
      if (Array.isArray(prodsRes) && prodsRes.length > 0) setProducts(prodsRes);
      if (dealsRes?.deals) setDeals(dealsRes.deals);
      if (dealsRes?.familyDeal) setFamilyDeal(dealsRes.familyDeal);
      if (Array.isArray(faqsRes) && faqsRes.length > 0) setFaqs(faqsRes);
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
      ) : (
        <div className="min-h-screen bg-[#0d0d0e] text-white selection:bg-orange-500 selection:text-white">
          <Header onAdminClick={handleOpenAdmin} />
          
          <main>
            <Hero />
            <DealsSection deals={deals} familyDeal={familyDeal} />
            <MenuSection categories={categories} products={products} />
            <OrderSection />
            <AboutSection />
            <ContactSection />
            <FaqSection faqs={faqs} />
          </main>

          <Footer categories={categories} />
          <CartDrawer />
          <OrderSuccessModal />
        </div>
      )}
    </CartProvider>
  );
}
