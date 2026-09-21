/**
 * Smooth "Fly to Cart" animation utility
 * Creates a beautiful flying food badge from the clicked "Add to Cart" button up into the cart icon.
 */

import { isCustomerApp } from '../config/api';

export function flyItemToCart({ startElement, image, name, quantity = 1 }) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Resolve start coordinates from the clicked button
  let startX = window.innerWidth / 2;
  let startY = window.innerHeight / 2;

  if (startElement) {
    const el = startElement.target || startElement.currentTarget || startElement;
    if (el && typeof el.getBoundingClientRect === 'function') {
      const rect = el.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    }
  }

  // 2. Resolve destination coordinates (in mobile app, target floating cart in bottom-right)
  const floatingEl = document.getElementById('floating-cart-btn');
  const headerEl = document.getElementById('header-cart-btn');

  let targetEl = null;
  if (isCustomerApp) {
    targetEl = floatingEl || headerEl;
  } else {
    targetEl = headerEl || floatingEl;
  }

  let targetX = window.innerWidth - 45;
  let targetY = isCustomerApp ? (window.innerHeight - 50) : 32;

  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      targetX = rect.left + rect.width / 2;
      targetY = rect.top + rect.height / 2;
    }
  }

  // 3. Create the flying badge element
  const size = 52;
  const halfSize = size / 2;
  const flyingNode = document.createElement('div');
  flyingNode.className = 'fly-to-cart-item';
  flyingNode.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: ${size}px;
    height: ${size}px;
    border-radius: 9999px;
    background: #18181b;
    border: 2.5px solid #f97316;
    box-shadow: 0 10px 25px -3px rgba(249, 115, 22, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.4);
    z-index: 99999;
    pointer-events: none;
    overflow: visible;
    display: flex;
    align-items: center;
    justify-content: center;
    will-change: transform, opacity;
  `;

  // Inner image container
  const innerWrapper = document.createElement('div');
  innerWrapper.style.cssText = 'width: 100%; height: 100%; border-radius: 9999px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #1c1917;';

  const defaultIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;

  if (image) {
    const img = document.createElement('img');
    img.src = image;
    img.alt = name || 'Item';
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 9999px;';
    img.onerror = () => {
      innerWrapper.innerHTML = defaultIcon;
    };
    innerWrapper.appendChild(img);
  } else {
    innerWrapper.innerHTML = defaultIcon;
  }

  flyingNode.appendChild(innerWrapper);

  // If quantity > 1, show a small quantity badge on the flying token
  if (quantity > 1) {
    const qtyBadge = document.createElement('span');
    qtyBadge.style.cssText = `
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      padding: 0 4px;
      border-radius: 9999px;
      background: #f97316;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      font-family: sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #18181b;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    qtyBadge.textContent = `+${quantity}`;
    flyingNode.appendChild(qtyBadge);
  }

  document.body.appendChild(flyingNode);

  // 4. Parabolic Curved Flight via requestAnimationFrame
  const duration = 750; // ms (smooth sweet spot)
  const startTime = performance.now();
  // Arc height depends on vertical distance, giving natural loft
  const arcHeight = Math.min(160, Math.max(60, Math.abs(startY - targetY) * 0.2 + 40));

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(1, elapsed / duration);

    // Easing function: smooth ease-in-out
    const easeT = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const currentX = startX + (targetX - startX) * easeT - halfSize;
    // Lift upward with parabolic arc: - arcHeight * sin(pi * progress)
    const arc = arcHeight * Math.sin(progress * Math.PI);
    const currentY = startY + (targetY - startY) * easeT - arc - halfSize;

    // Smooth scale: 0.5 -> 1.15 in mid-air -> 0.25 as it enters cart
    let scale = 1;
    if (progress < 0.2) {
      scale = 0.5 + (progress / 0.2) * 0.65; // 0.5 -> 1.15
    } else if (progress < 0.6) {
      scale = 1.15;
    } else {
      scale = 1.15 - ((progress - 0.6) / 0.4) * 0.9; // 1.15 -> 0.25
    }

    // Fade out near the destination (last 12%)
    const opacity = progress > 0.88 ? (1 - progress) / 0.12 : 1;
    const rotation = progress * 360;

    flyingNode.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(${scale}) rotate(${rotation}deg)`;
    flyingNode.style.opacity = String(opacity);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      // Remove node from DOM
      flyingNode.remove();

      // Trigger cart bounce animation
      if (targetEl) {
        targetEl.classList.remove('animate-cart-bounce');
        void targetEl.offsetWidth; // Force reflow
        targetEl.classList.add('animate-cart-bounce');
        setTimeout(() => {
          targetEl.classList.remove('animate-cart-bounce');
        }, 600);
      }
    }
  }

  requestAnimationFrame(step);
}

export default flyItemToCart;
