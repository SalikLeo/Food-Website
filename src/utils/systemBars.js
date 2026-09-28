import { registerPlugin, Capacitor } from '@capacitor/core';

const ReceiptBridge = registerPlugin('ReceiptBridge');

/**
 * Dynamically synchronizes Android system status bar (top) and
 * navigation bar (bottom) with the app theme (dark/light),
 * as well as updating the HTML <meta name="theme-color"> tag.
 *
 * When isDark is true:
 * - Status bar background becomes #0e0e11 with white icons (time, wifi, airplane, battery).
 * - Navigation bar background becomes #0e0e11 with white buttons (triangle, circle, square).
 *
 * When isDark is false:
 * - Status bar background becomes #ffffff with dark icons.
 * - Navigation bar background becomes #ffffff with dark buttons.
 */
export async function updateSystemBarsTheme(isDark) {
  const dark = Boolean(isDark);
  const color = dark ? '#0e0e11' : '#ffffff';

  // 1. Update HTML meta theme-color for web browsers / PWA
  if (typeof document !== 'undefined') {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', color);
  }

  // 2. If running inside native Android / Capacitor app, call native bridge
  if (Capacitor.isNativePlatform()) {
    try {
      if (ReceiptBridge && typeof ReceiptBridge.setSystemBars === 'function') {
        await ReceiptBridge.setSystemBars({
          isDark: dark,
          statusBarColor: color,
          navigationBarColor: color
        });
      }
    } catch (e) {
      console.warn('ReceiptBridge.setSystemBars failed:', e);
    }
  }
}
