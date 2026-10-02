import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import BestSellersSection from './components/BestSellersSection';
import DealsSection from './components/DealsSection';
import MenuSection from './components/MenuSection';
import OrderSection from './components/OrderSection';
import AboutSection from './components/AboutSection';
import ContactSection from './components/ContactSection';
import DownloadAppSection from './components/DownloadAppSection';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import OrderSuccessModal from './components/OrderSuccessModal';
import CustomerNotificationBanner from './components/CustomerNotificationBanner';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import UserProfileModal from './components/UserProfileModal';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import CustomerMobileApp from './components/MobileApp/CustomerMobileApp';
import NoInternetScreen from './components/NoInternetScreen';
import GoogleLoginPromptModal from './components/GoogleLoginPromptModal';
import RiderPortal from './components/Rider/RiderPortal';
import { Network } from '@capacitor/network';
import { CartProvider, useCart } from './context/CartContext';
import { apiUrl, resolveImageUrl, APP_MODE, isCustomerApp } from './config/api';

export default function App() {
  const [isAdminView, setIsAdminView] = useState(() => {
    if (APP_MODE === 'admin') return true;
    if (APP_MODE === 'customer' || isCustomerApp) return false;
    return window.location.pathname.includes('/admin') || window.location.hash.includes('admin');
  });

  const [isRiderView, setIsRiderView] = useState(() => {
    if (APP_MODE === 'rider') return true;
    return window.location.pathname.startsWith('/rider') || window.location.hash.includes('rider');
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem('salik_admin_token'));
  });

  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  });
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  const [categories, setCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salik_cached_categories')) || []; } catch { return []; }
  });
  const [products, setProducts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salik_cached_products')) || []; } catch { return []; }
  });
  const [deals, setDeals] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salik_cached_deals')) || []; } catch { return []; }
  });
  const [familyDeal, setFamilyDeal] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salik_cached_familyDeal')) || null; } catch { return null; }
  });
  const [faqs, setFaqs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salik_cached_faqs')) || []; } catch { return []; }
  });
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('salik_cached_settings')) || null; } catch { return null; }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('salik_cached_products');
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });

  // Connectivity check helper
  const checkConnection = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    try {
      const status = await Network.getStatus().catch(() => ({ connected: true }));
      if (!status.connected) return false;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(apiUrl('/api/health'), {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      }).catch(async () => {
        return fetch('https://www.google.com/generate_204', {
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
      });

      clearTimeout(timer);
      return Boolean(res);
    } catch {
      return false;
    }
  };

  // Sync hash/path for admin & rider
  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminView(window.location.hash.includes('admin') || window.location.pathname.includes('/admin'));
      setIsRiderView(window.location.hash.includes('rider') || window.location.pathname.startsWith('/rider'));
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Multi-layer instant online / offline detection while using the app
  useEffect(() => {
    // 1. Initial native check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setLoading(false);
    } else {
      Network.getStatus().then((status) => {
        if (!status.connected) {
          setIsOnline(false);
          setLoading(false);
        }
      }).catch(() => {});
    }

    // 2. Native Capacitor Network Listener (instant OS event when Wi-Fi/Data drops)
    let netListener = null;
    try {
      netListener = Network.addListener('networkStatusChange', (status) => {
        if (!status.connected) {
          setIsOnline(false);
        } else {
          setIsOnline(true);
          loadData();
        }
      });
    } catch (e) {
      console.warn('Network plugin listener error:', e);
    }

    // 3. Browser offline / online window events
    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleOnline = async () => {
      setIsCheckingConnection(true);
      const online = await checkConnection();
      setIsOnline(online);
      setIsCheckingConnection(false);
      if (online) {
        loadData();
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // 4. Check on app focus / visibility change (e.g. quick settings swipe)
    const handleVisibilityChange = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
      } else {
        Network.getStatus().then((s) => {
          if (!s.connected) setIsOnline(false);
        }).catch(() => {});
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // 5. Active fast heartbeat interval (1.5 seconds) while app is active
    const intervalId = setInterval(async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
        return;
      }
      try {
        const s = await Network.getStatus();
        if (!s.connected) {
          setIsOnline(false);
        }
      } catch {}
    }, 1500);

    return () => {
      if (netListener && typeof netListener.remove === 'function') {
        netListener.remove();
      }
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  // 6. Global fetch interceptor: detect network drop on failed requests
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        return await originalFetch(...args);
      } catch (err) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setIsOnline(false);
        } else {
          Network.getStatus().then((s) => {
            if (!s.connected) setIsOnline(false);
          }).catch(() => {});
        }
        throw err;
      }
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Fetch initial public data
  const loadData = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setLoading(false);
      return;
    }

    try {
      const [catsRes, prodsRes, dealsRes, faqsRes, settingsRes] = await Promise.all([
        fetch(apiUrl('/api/categories')).then(r => r.json()).catch(() => null),
        fetch(apiUrl('/api/products')).then(r => r.json()).catch(() => null),
        fetch(apiUrl('/api/deals')).then(r => r.json()).catch(() => null),
        fetch(apiUrl('/api/faqs')).then(r => r.json()).catch(() => null),
        fetch(apiUrl('/api/settings')).then(r => r.json()).catch(() => null)
      ]);

      // If both categories and products failed, verify whether device is actually online
      if (!catsRes && !prodsRes) {
        const online = await checkConnection();
        if (!online) {
          setIsOnline(false);
          setLoading(false);
          return;
        }
      }

      if (Array.isArray(catsRes) && catsRes.length > 0) {
        const mappedCats = catsRes.map(c => ({
          ...c,
          image: resolveImageUrl(c.image)
        }));
        setCategories(mappedCats);
        try { localStorage.setItem('salik_cached_categories', JSON.stringify(mappedCats)); } catch {}
      }
      if (Array.isArray(prodsRes) && prodsRes.length > 0) {
        const mappedProds = prodsRes.map(p => ({
          ...p,
          image: resolveImageUrl(p.image)
        }));
        setProducts(mappedProds);
        try { localStorage.setItem('salik_cached_products', JSON.stringify(mappedProds)); } catch {}
      }
      if (dealsRes?.deals) {
        const mappedDeals = dealsRes.deals.map(d => ({
          ...d,
          image: resolveImageUrl(d.image)
        }));
        setDeals(mappedDeals);
        try { localStorage.setItem('salik_cached_deals', JSON.stringify(mappedDeals)); } catch {}
      }
      if (dealsRes?.familyDeal) {
        const mappedFam = {
          ...dealsRes.familyDeal,
          image: resolveImageUrl(dealsRes.familyDeal.image)
        };
        setFamilyDeal(mappedFam);
        try { localStorage.setItem('salik_cached_familyDeal', JSON.stringify(mappedFam)); } catch {}
      }
      if (Array.isArray(faqsRes) && faqsRes.length > 0) {
        setFaqs(faqsRes);
        try { localStorage.setItem('salik_cached_faqs', JSON.stringify(faqsRes)); } catch {}
      }
      if (settingsRes) {
        setSettings(settingsRes);
        try { localStorage.setItem('salik_cached_settings', JSON.stringify(settingsRes)); } catch {}
      }
      setIsOnline(true);
    } catch (e) {
      console.error('Error fetching storefront data:', e);
      const online = await checkConnection();
      if (!online) {
        setIsOnline(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetryConnection = async () => {
    setIsCheckingConnection(true);
    const online = await checkConnection();
    if (online) {
      setIsOnline(true);
      await loadData();
    } else {
      setIsOnline(false);
    }
    setIsCheckingConnection(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdmin = () => {
    window.location.hash = 'admin';
    setIsAdminView(true);
  };

  const handleExitAdmin = () => {
    if (APP_MODE === 'admin') return;
    window.location.hash = '';
    setIsAdminView(false);
    loadData(); // refresh storefront in case products were edited
  };

  const handleExitRider = () => {
    if (APP_MODE === 'rider') return;
    window.location.hash = '';
    if (window.location.pathname.startsWith('/rider')) {
      window.history.pushState(null, '', '/');
    }
    setIsRiderView(false);
    loadData();
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('salik_admin_token');
    localStorage.removeItem('mehrban_admin_token');
    setIsAdminAuthenticated(false);
  };

  return (
    <CartProvider>
      {!isOnline && !isAdminView && !isRiderView ? (
        <NoInternetScreen 
          onRetry={handleRetryConnection} 
          isChecking={isCheckingConnection} 
        />
      ) : isRiderView ? (
        <RiderPortal onBackToStore={handleExitRider} />
      ) : isAdminView ? (
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
      {!isAdminView && !isRiderView && <GoogleLoginPromptModal />}
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
        <DownloadAppSection />
      </main>

      <Footer categories={categories} settings={settings} />
      <CartDrawer isDark={isDark} />
      <OrderSuccessModal />
      <UserProfileModal />
      <CustomerNotificationBanner />
      <PWAInstallPrompt />
    </div>
  );
}
