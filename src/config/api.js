// Centralized API configuration and App Mode helper
// Works across Web, Local Android (Wi-Fi), and Cloud (Hostinger/VPS)

// Live Hostinger Cloud Backend
const DEFAULT_MOBILE_API = 'https://salikleo.website';

export const APP_MODE = import.meta.env.VITE_APP_MODE || 'web'; // 'web' | 'customer' | 'admin'

export const isCustomerApp =
  APP_MODE === 'customer' ||
  (typeof window !== 'undefined' && (
    (window.Capacitor !== undefined && APP_MODE !== 'admin') ||
    window.location.search.includes('app=customer') ||
    window.location.hash.includes('app=customer')
  ));

export const isMobileApp =
  APP_MODE === 'customer' ||
  APP_MODE === 'admin' ||
  (typeof window !== 'undefined' && (
    window.Capacitor !== undefined ||
    window.location.search.includes('app=') ||
    window.location.hash.includes('app=')
  ));

const getApiBaseUrl = () => {
  // 1. Explicit environment variable override takes precedence
  if (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== '') {
    return import.meta.env.VITE_API_URL;
  }

  // 2. Browser environment (Web or Mobile phone browser)
  if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
    const isCapacitor = window.Capacitor !== undefined || APP_MODE !== 'web';
    
    // In standard web browser (Vite dev or production web)
    if (!isCapacitor) {
      // If running on Vite dev server (e.g. port 5173), route to backend port 5000 on the same host (localhost or LAN IP)
      if (window.location.port && window.location.port !== '5000') {
        return `${window.location.protocol}//${window.location.hostname}:5000`;
      }
      // Running directly on production or served from backend port 5000
      return '';
    }
  }

  // 3. Fallback for Native Mobile APK (Capacitor webview)
  return DEFAULT_MOBILE_API;
};

export const API_BASE_URL = getApiBaseUrl().replace(/\/+$/, '');

/**
 * Resolves an API or upload endpoint to a full URL
 * @param {string} path e.g. '/api/products' or '/uploads/pic.jpg'
 */
export const apiUrl = (path = '') => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default {
  API_BASE_URL,
  APP_MODE,
  apiUrl
};
