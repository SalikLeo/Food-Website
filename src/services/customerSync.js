import { apiUrl } from '../config/api';

/**
 * Fetch past customer orders from the Salik Fast Food cloud server by Google Email / Phone
 * @param {string} email 
 * @param {string} phone 
 * @returns {Promise<Array>} Array of past orders
 */
export async function fetchCustomerCloudOrders(email, phone = '') {
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPhone = (phone || '').trim();
  if (!cleanEmail && !cleanPhone) return [];

  try {
    const params = new URLSearchParams();
    if (cleanEmail) params.append('email', cleanEmail);
    if (cleanPhone) params.append('phone', cleanPhone);
    params.append('_t', String(Date.now()));

    const res = await fetch(apiUrl(`/api/customer/orders?${params.toString()}`), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.orders) ? data.orders : [];
  } catch (err) {
    console.warn('Could not sync customer cloud orders:', err);
    return [];
  }
}

/**
 * Fetch customer saved profile info from cloud server
 * @param {string} email 
 * @returns {Promise<Object|null>}
 */
export async function fetchCustomerCloudProfile(email) {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail) return null;

  try {
    const res = await fetch(apiUrl(`/api/customer/profile?email=${encodeURIComponent(cleanEmail)}&_t=${Date.now()}`), {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.profile || null;
  } catch (err) {
    console.warn('Could not sync customer cloud profile:', err);
    return null;
  }
}

/**
 * Save / update customer profile on cloud server
 * @param {Object} param0 
 */
export async function saveCustomerCloudProfile({ email, name, phone, address }) {
  const cleanEmail = (email || '').toLowerCase().trim();
  if (!cleanEmail) return null;

  try {
    const res = await fetch(apiUrl('/api/customer/profile'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        name: name || '',
        phone: phone || '',
        address: address || ''
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.profile || null;
  } catch (err) {
    console.warn('Could not save customer profile to cloud:', err);
    return null;
  }
}
