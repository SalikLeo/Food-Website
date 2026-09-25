import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { formatPrice } from '../utils/formatters';

let channelInitialized = false;
let audioContextInstance = null;

// Initialize Web AudioContext with user-gesture auto unlock
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContextInstance) {
    audioContextInstance = new AudioCtx();
  }
  if (audioContextInstance.state === 'suspended') {
    audioContextInstance.resume().catch(() => {});
  }
  return audioContextInstance;
}

// Auto unlock audio on any touch / click event
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioContextInstance && audioContextInstance.state === 'suspended') {
      audioContextInstance.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

/**
 * Initialize Android notification channel for high-priority alerts
 */
export async function initNotificationChannel() {
  if (channelInitialized) return;
  channelInitialized = true;

  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.createChannel({
        id: 'orders_channel',
        name: 'Order Alerts & Updates',
        description: 'Instant alerts for incoming orders and live order status changes',
        importance: 5, // MAX importance (pops up on screen with sound)
        visibility: 1, // Public on lockscreen
        vibration: true,
        lights: true,
        lightColor: '#EA580C'
      });
    }
  } catch (err) {
    console.warn('Failed to create LocalNotification channel:', err);
  }
}

/**
 * Request notification permissions across Native and Web
 */
export async function requestNotificationPermission() {
  await initNotificationChannel();

  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      if (status.display !== 'granted') {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
      }
      return true;
    }
  } catch (e) {
    console.warn('Native notification permission error:', e);
  }

  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }
      return Notification.permission === 'granted';
    }
  } catch (e) {
    console.warn('Web notification permission error:', e);
  }

  return false;
}

/**
 * Play a synthesizer chime sound
 */
export function playNotificationSound(type = 'new_order') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'new_order') {
      // 4-note upbeat chime: C5 -> E5 -> G5 -> C6
      const notes = [
        { freq: 523.25, time: now, dur: 0.14 },
        { freq: 659.25, time: now + 0.12, dur: 0.14 },
        { freq: 783.99, time: now + 0.24, dur: 0.16 },
        { freq: 1046.50, time: now + 0.38, dur: 0.40 }
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.exponentialRampToValueAtTime(0.35, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + dur);
      });
    } else if (type === 'status_update') {
      // 3-note pleasant melodic bell: E5 -> G#5 -> B5
      const notes = [
        { freq: 659.25, time: now, dur: 0.15 },
        { freq: 830.61, time: now + 0.14, dur: 0.15 },
        { freq: 987.77, time: now + 0.28, dur: 0.45 }
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.exponentialRampToValueAtTime(0.4, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + dur);
      });
    }
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}

/**
 * Trigger device vibration
 */
export function triggerVibration(pattern = [250, 100, 250, 100, 400]) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

/**
 * Dispatch system / local notification (Capacitor native or Web API)
 */
export async function showSystemNotification({ title, body, id, extra = {} }) {
  await initNotificationChannel();

  // 1. Native Capacitor Local Notification
  if (Capacitor.isNativePlatform()) {
    try {
      const numId = typeof id === 'number' 
        ? id 
        : Math.abs(String(id || '').split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 2147483647 || Math.floor(Math.random() * 1000000) + 1;

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: numId,
            channelId: 'orders_channel',
            schedule: { at: new Date(Date.now() + 50), allowWhileIdle: true },
            extra
          }
        ]
      });
      return;
    } catch (err) {
      console.warn('LocalNotifications schedule error:', err);
    }
  }

  // 2. Web Notification fallback
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/assets/favicon.png'
      });
    }
  } catch (err) {
    console.warn('Web notification error:', err);
  }
}

/**
 * Trigger Admin New Order Notification
 */
export async function notifyAdminNewOrder(order, count = 1) {
  if (!order) return;
  const custName = order.customer?.name || order.customerName || 'Customer';
  const totalVal = order.total ? `Rs. ${formatPrice(order.total)}` : '';
  const title = count > 1 ? `🔔 ${count} New Orders Received!` : '🔔 New Order Received!';
  const body = `#${order.id} • ${totalVal} from ${custName}`;

  playNotificationSound('new_order');
  triggerVibration([300, 100, 300, 100, 500]);
  await showSystemNotification({
    title,
    body,
    id: order.id,
    extra: { orderId: order.id, type: 'admin_new_order' }
  });
}

/**
 * Format Customer Friendly Status Text
 */
export function getStatusNotificationDetails(status, orderId, riderName = null) {
  const cleanId = String(orderId || '').replace(/^#/, '');
  const norm = String(status || '').toLowerCase().trim();

  if (norm.includes('confirm') || norm.includes('accept')) {
    return {
      title: '👨‍🍳 Order Confirmed!',
      body: `Your order #${cleanId} has been confirmed and sent to the kitchen.`,
      icon: '👨‍🍳',
      color: 'bg-blue-600'
    };
  }
  if (norm.includes('prepar') || norm.includes('kitchen') || norm.includes('cook')) {
    return {
      title: '🍳 Preparing Your Food!',
      body: `Our chef is cooking your order #${cleanId}. Fresh & hot!`,
      icon: '🍳',
      color: 'bg-amber-600'
    };
  }
  if (norm.includes('out') || norm.includes('way') || norm.includes('dispatch') || norm.includes('rider')) {
    return {
      title: '🛵 Out for Delivery!',
      body: riderName
        ? `Your order #${cleanId} is on the way! Rider ${riderName} is delivering your food.`
        : `Your order #${cleanId} is on the way to your address!`,
      icon: '🛵',
      color: 'bg-orange-600'
    };
  }
  if (norm.includes('deliver') || norm.includes('complete')) {
    return {
      title: '🎉 Order Delivered!',
      body: `Order #${cleanId} has been delivered. Enjoy your meal!`,
      icon: '🎉',
      color: 'bg-emerald-600'
    };
  }
  if (norm.includes('cancel') || norm.includes('reject')) {
    return {
      title: '⚠️ Order Cancelled',
      body: `Order #${cleanId} has been cancelled. Tap for details.`,
      icon: '⚠️',
      color: 'bg-red-600'
    };
  }

  return {
    title: `📋 Order #${cleanId} Update`,
    body: `Your order status changed to: ${status}`,
    icon: '🔔',
    color: 'bg-orange-600'
  };
}

/**
 * Trigger Customer Order Status Change Notification
 */
export async function notifyCustomerOrderStatus(order, oldStatus, newStatus) {
  if (!order || !newStatus) return;
  const details = getStatusNotificationDetails(newStatus, order.id);

  playNotificationSound('status_update');
  triggerVibration([200, 100, 200]);
  await showSystemNotification({
    title: details.title,
    body: details.body,
    id: `status-${order.id}-${newStatus}`,
    extra: { orderId: order.id, status: newStatus, type: 'customer_status_change' }
  });
}

/**
 * Trigger Admin New Review Notification
 */
export async function notifyAdminNewReview(review, count = 1) {
  if (!review) return;
  const author = review.author || review.name || 'Customer';
  const rating = review.rating || 5;
  const starsStr = '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
  const reviewText = review.text && review.text !== '-' ? ` "${review.text.slice(0, 50)}${review.text.length > 50 ? '...' : ''}"` : '';
  const orderInfo = review.orderId ? ` (Order #${review.orderId})` : '';
  
  const title = count > 1 ? `⭐ ${count} New Reviews Received!` : '⭐ New Customer Review!';
  const body = `${starsStr} from ${author}${orderInfo}${reviewText}`;

  playNotificationSound('status_update');
  triggerVibration([250, 100, 250]);
  await showSystemNotification({
    title,
    body,
    id: review.id || `rev-${Date.now()}`,
    extra: { reviewId: review.id, type: 'admin_new_review' }
  });
}

/**
 * Trigger Customer Review Submitted Notification
 */
export async function notifyCustomerReviewSubmitted(review) {
  if (!review) return;
  const rating = review.rating || 5;
  const starsStr = '★'.repeat(rating);
  const orderInfo = review.orderId ? ` for Order #${review.orderId}` : '';

  const title = '⭐ Review Submitted!';
  const body = `Thank you! Your ${starsStr} feedback${orderInfo} has been received.`;

  playNotificationSound('status_update');
  triggerVibration([150, 80, 150]);
  await showSystemNotification({
    title,
    body,
    id: `cust-rev-${Date.now()}`,
    extra: { reviewId: review.id, type: 'customer_review_submitted' }
  });
}

