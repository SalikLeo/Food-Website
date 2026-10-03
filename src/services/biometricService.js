/**
 * Salik Fast Food - Biometric Authentication Service
 * Modern, zero-compilation WebAuthn / Passkey Biometrics for Customer, Admin, and Rider apps.
 * Works seamlessly across Android phones, iPhones, Windows Hello, and Mac Touch ID.
 */

// Helper: Uint8Array <-> Base64URL
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64ToBuffer(base64) {
  let str = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

const STORAGE_PREFIX = 'salik_biometric_';

/**
 * Check if platform biometric authentication (Fingerprint, Face ID, Windows Hello)
 * is available on the current device and browser.
 */
export async function isBiometricAvailable() {
  if (typeof window === 'undefined') return false;

  try {
    if (!window.isSecureContext) {
      // WebAuthn requires a secure context (https or localhost)
      return false;
    }

    if (
      !window.PublicKeyCredential ||
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
    ) {
      return false;
    }

    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (err) {
    console.warn('Biometric availability check failed:', err);
    return false;
  }
}

/**
 * Check if a biometric credential is already registered on this device for a given role
 * @param {'customer' | 'admin' | 'rider'} role
 */
export function isBiometricEnrolled(role = 'customer') {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${role}`);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return Boolean(data && data.credentialId);
  } catch {
    return false;
  }
}

/**
 * Retrieve saved biometric profile information for a role
 * @param {'customer' | 'admin' | 'rider'} role
 */
export function getSavedBiometricProfile(role = 'customer') {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${role}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.profile || null;
  } catch {
    return null;
  }
}

/**
 * Register device biometric credential (Fingerprint / Face ID) and link it to profile
 * @param {Object} options
 * @param {'customer' | 'admin' | 'rider'} options.role
 * @param {Object} options.profile - The user/admin/rider profile to bind
 */
export async function registerBiometricCredential({ role = 'customer', profile = {} }) {
  const available = await isBiometricAvailable();
  if (!available) {
    throw new Error('Biometric sensor is not available or not supported on this device.');
  }

  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const rawUserId = `${role}-${profile.id || profile.email || profile.phone || 'salik'}-${Date.now()}`;
  const userId = new TextEncoder().encode(rawUserId);

  const displayName = profile.name || (role === 'admin' ? 'Salik Admin' : role === 'rider' ? 'Salik Rider' : 'Customer');
  const accountName = profile.email || profile.phone || `${role}@salikfastfood.pk`;

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Salik Fast Food',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: accountName,
          displayName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Device fingerprint sensor or Face ID
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000
      }
    });

    if (!credential || !credential.rawId) {
      throw new Error('Biometric registration was cancelled or not recognized.');
    }

    const credentialId = bufferToBase64(credential.rawId);
    const payload = {
      credentialId,
      role,
      profile,
      registeredAt: new Date().toISOString()
    };

    localStorage.setItem(`${STORAGE_PREFIX}${role}`, JSON.stringify(payload));
    return { success: true, credentialId, profile };
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Fingerprint scan cancelled or timed out.');
    }
    if (err.name === 'InvalidStateError') {
      throw new Error('A biometric credential is already registered on this device.');
    }
    throw err;
  }
}

/**
 * Verify identity using device biometric sensor (Fingerprint / Face ID)
 * @param {'customer' | 'admin' | 'rider'} role
 * @returns {Promise<{ success: boolean, profile: Object }>}
 */
export async function authenticateWithBiometrics(role = 'customer') {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}${role}`);
  if (!raw) {
    throw new Error(`No fingerprint registered for ${role}. Please sign in normally first.`);
  }

  const data = JSON.parse(raw);
  if (!data.credentialId) {
    throw new Error('Invalid stored biometric record.');
  }

  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  const credentialDescriptor = {
    id: base64ToBuffer(data.credentialId),
    type: 'public-key'
  };

  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [credentialDescriptor],
        userVerification: 'required',
        timeout: 60000
      }
    });

    if (!assertion) {
      throw new Error('Biometric verification failed.');
    }

    return {
      success: true,
      profile: data.profile || null,
      role
    };
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Biometric scan was cancelled.');
    }
    throw err;
  }
}

/**
 * Remove enrolled biometric authentication for a role
 * @param {'customer' | 'admin' | 'rider'} role
 */
export function removeBiometricCredential(role = 'customer') {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${role}`);
    return true;
  } catch {
    return false;
  }
}
