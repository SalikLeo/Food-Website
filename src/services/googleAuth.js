// Google Identity Services (GIS) OAuth helper for Salik Fast Food

const STORAGE_KEY = 'salik_customer_user';

/**
 * Get configured Google OAuth Client ID from Vite environment variables
 */
export function getGoogleClientId() {
  return (
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '272845957801-6kr91o68g9m00acgmhboi1opc1kp32mt.apps.googleusercontent.com'
  );
}

/**
 * Load Google Identity Services (GIS) client script if not already loaded
 */
export function loadGsiScript() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    if (window.google?.accounts) return resolve(window.google.accounts);

    // Check if script element already exists
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google?.accounts));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google?.accounts);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/**
 * Decode JWT credential returned by Google Identity Services
 */
export function decodeGoogleJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode Google JWT', e);
    return null;
  }
}

/**
 * Retrieve persisted customer profile from localStorage
 */
export function getStoredCustomerUser() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Persist customer profile to localStorage
 */
export function setStoredCustomerUser(user) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to persist customer user', e);
  }
}

/**
 * Remove customer profile from localStorage
 */
export function clearStoredCustomerUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Initiate Google Sign-In Flow
 * @param {Object} options
 * @param {Function} options.onSuccess Called with profile { name, email, picture, sub, idToken }
 * @param {Function} options.onError Called with error string
 * @param {Function} options.onConfigRequired Called if VITE_GOOGLE_CLIENT_ID is not configured
 */
export async function triggerGoogleLogin({ onSuccess, onError, onConfigRequired }) {
  const clientId = getGoogleClientId();

  if (!clientId || clientId.includes('your-google-oauth-client-id')) {
    if (typeof onConfigRequired === 'function') {
      onConfigRequired();
    } else if (typeof onError === 'function') {
      onError('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
    }
    return;
  }

  const gsi = await loadGsiScript();
  if (!gsi) {
    if (typeof onError === 'function') {
      onError('Failed to load Google Identity Services. Please check your internet connection.');
    }
    return;
  }

  try {
    // 1. Initialize Google ID client
    gsi.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) {
          const payload = decodeGoogleJwt(response.credential);
          if (payload) {
            const user = {
              name: payload.name || payload.given_name || 'Google Customer',
              email: payload.email || '',
              picture: payload.picture || '',
              sub: payload.sub || '',
              idToken: response.credential,
              loginMethod: 'google'
            };
            setStoredCustomerUser(user);
            if (typeof onSuccess === 'function') onSuccess(user);
            return;
          }
        }
        if (typeof onError === 'function') onError('Failed to obtain Google user credentials.');
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // 2. Also prepare Token Client as seamless fallback for mobile/web popup
    if (gsi.oauth2) {
      const tokenClient = gsi.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        error_callback: (err) => {
          console.error('Google OAuth token error:', err);
          if (typeof onError === 'function') {
            const msg = err?.message || err?.type || 'Google Sign-In failed or popup was blocked.';
            onError(msg);
          }
        },
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.error) {
            console.error('Google token error response:', tokenResponse);
            if (typeof onError === 'function') {
              onError(tokenResponse.error_description || tokenResponse.error || 'Google Sign-In cancelled.');
            }
            return;
          }

          if (tokenResponse && tokenResponse.access_token) {
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              if (res.ok) {
                const profile = await res.json();
                const user = {
                  name: profile.name || profile.given_name || 'Google Customer',
                  email: profile.email || '',
                  picture: profile.picture || '',
                  sub: profile.sub || '',
                  accessToken: tokenResponse.access_token,
                  loginMethod: 'google'
                };
                setStoredCustomerUser(user);
                if (typeof onSuccess === 'function') onSuccess(user);
                return;
              }
            } catch (err) {
              console.error('Failed to fetch userinfo', err);
            }
          }
          if (typeof onError === 'function') onError('Google authentication was cancelled or failed.');
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
      return;
    }

    // Standard prompt fallback
    gsi.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        console.warn('Google One Tap suppressed or skipped:', notification.getNotDisplayedReason?.());
      }
    });
  } catch (err) {
    console.error('Google Sign-In Error:', err);
    if (typeof onError === 'function') onError(err.message || 'Google sign-in error occurred.');
  }
}
