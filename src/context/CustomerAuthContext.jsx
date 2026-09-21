import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../config/api';
import { useCart } from './CartContext';

const CustomerAuthContext = createContext();

export const CustomerAuthProvider = ({ children }) => {
  const { addToCart, setIsCartOpen } = useCart();

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('salik_customer_token') || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('salik_customer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);

  // Sync token & user to localStorage
  useEffect(() => {
    try {
      if (token) {
        localStorage.setItem('salik_customer_token', token);
      } else {
        localStorage.removeItem('salik_customer_token');
      }
      if (user) {
        localStorage.setItem('salik_customer_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('salik_customer_user');
      }
    } catch (e) {
      console.error(e);
    }
  }, [token, user]);

  // Load current profile and orders on mount if token exists
  const fetchMe = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) setUser(data.user);
        if (Array.isArray(data.orders)) setOrders(data.orders);
      } else if (res.status === 401) {
        setToken(null);
        setUser(null);
      }
    } catch (e) {
      console.error('Error loading customer session:', e);
    }
  }, [token]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Fetch recent customer orders
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const params = new URLSearchParams();
      if (user?.email) params.append('email', user.email);
      if (user?.phone) params.append('phone', user.phone);
      const queryString = params.toString();
      const url = apiUrl(`/api/customer/orders${queryString ? `?${queryString}` : ''}`);

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setOrders(data);
      }
    } catch (e) {
      console.error('Error fetching orders:', e);
    } finally {
      setLoadingOrders(false);
    }
  }, [token, user?.email, user?.phone]);

  // Send Email OTP Code
  const sendOtp = async (email) => {
    const res = await fetch(apiUrl('/api/auth/send-otp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send verification code');
    return data;
  };

  // Verify Email Code & Log In / Register
  const verifyOtp = async (email, code, name = '', phone = '', address = '') => {
    const res = await fetch(apiUrl('/api/auth/verify-otp'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, name, phone, address })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid verification code');

    setToken(data.token);
    setUser(data.user);
    if (Array.isArray(data.orders)) setOrders(data.orders);
    setAuthModalOpen(false);
    return data;
  };

  // Update Profile
  const updateProfile = async ({ name, email, phone, addresses }) => {
    if (!token) throw new Error('Not logged in');
    const res = await fetch(apiUrl('/api/auth/profile'), {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, email, phone, addresses })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    setUser(data.user);
    return data.user;
  };

  // Logout
  const logout = () => {
    setToken(null);
    setUser(null);
    setOrders([]);
    setProfileModalOpen(false);
  };

  // REORDER FUNCTIONALITY:
  // Takes an order, adds all items from that order into active cart, and opens cart drawer!
  const reorder = (order) => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) return;

    order.items.forEach(item => {
      // Reconstruct product payload for addToCart
      const productObj = {
        id: item.productId || item.id,
        name: item.name,
        price: item.price,
        image: item.image || '/assets/images/cat-pizza-BmV7hCev.jpg',
        inStock: true
      };

      const selectedSize = item.size ? { label: item.size, price: item.price } : null;
      const quantity = Number(item.quantity) || 1;

      addToCart(productObj, selectedSize, quantity);
    });

    // Close orders modal if open and open CartDrawer
    setOrdersModalOpen(false);
    setIsCartOpen(true);
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: Boolean(user && token),
        orders,
        loadingOrders,
        authModalOpen,
        setAuthModalOpen,
        profileModalOpen,
        setProfileModalOpen,
        ordersModalOpen,
        setOrdersModalOpen,
        sendOtp,
        verifyOtp,
        updateProfile,
        logout,
        fetchOrders,
        reorder
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
