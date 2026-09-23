// User profile persistence service for Salik Fast Food (Website & Mobile App)

const PROFILE_STORAGE_KEY = 'salik_user_profile';

/**
 * Retrieve saved user profile from localStorage
 * Returns { name: string, phone: string, address: string }
 */
export function getStoredUserProfile() {
  if (typeof window === 'undefined') {
    return { name: '', phone: '', address: '' };
  }
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return { name: '', phone: '', address: '' };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      address: typeof parsed.address === 'string' ? parsed.address : ''
    };
  } catch (e) {
    console.error('Error reading user profile from localStorage:', e);
    return { name: '', phone: '', address: '' };
  }
}

/**
 * Save user profile to localStorage and emit sync event
 */
export function saveStoredUserProfile(profile) {
  if (typeof window === 'undefined') return profile;
  try {
    const data = {
      name: (profile?.name || '').trim(),
      phone: (profile?.phone || '').replace(/\D/g, '').slice(0, 11),
      address: (profile?.address || '').trim(),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('salik_profile_updated', { detail: data }));
    return data;
  } catch (e) {
    console.error('Error saving user profile to localStorage:', e);
    return profile;
  }
}
