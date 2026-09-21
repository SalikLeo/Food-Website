import html2canvas from 'html2canvas';
import { registerPlugin, Capacitor } from '@capacitor/core';

// Register the custom ReceiptBridge plugin (native Android)
const ReceiptBridge = registerPlugin('ReceiptBridge');

/**
 * Format price according to application Pakistani comma standards:
 * <= 4 digits: plain (e.g. 2400)
 * >= 5 digits: Indian/Pakistani numbering (e.g. 20,300 and 1,20,200)
 */
export function formatPrice(val) {
  const num = Number(val) || 0;
  const s = Math.round(num).toString();
  if (s.length <= 4) return s;
  const lastThree = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
}

/**
 * Format order date & time into DD/MM/YY, HH:MM am/pm
 */
export function formatOrderDateTime(isoString) {
  if (!isoString) return new Date().toLocaleString();
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${day}/${month}/${year}, ${strHours}:${minutes} ${ampm}`;
  } catch (e) {
    return isoString;
  }
}

/**
 * Fallback Canvas 2D Renderer for Crisp Thermal Receipt
 */
export function drawReceiptCanvas(order) {
  const width = 800; // High-resolution width
  const padX = 40;
  let curY = 40;

  // Measure required height first
  const items = order.items || [];
  const estimatedHeight = 620 + (items.length * 60) + (order.address ? 50 : 0) + (order.notes ? 40 : 0);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.max(700, estimatedHeight);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, canvas.height);

  // Text defaults
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';

  // Header
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('SALIK FAST FOOD', width / 2, curY);
  curY += 34;

  ctx.font = '600 20px sans-serif';
  ctx.fillStyle = '#3f3f46';
  ctx.fillText('TASTE THAT YOU NEED', width / 2, curY);
  curY += 28;

  ctx.font = '500 18px sans-serif';
  ctx.fillStyle = '#52525b';
  ctx.fillText('Wah Model Town, Wah Cantt', width / 2, curY);
  curY += 24;
  ctx.fillText('Phone: 0309-5369472', width / 2, curY);
  curY += 32;

  // Payment method badge
  const payMethod = (order.paymentMethod || 'CASH ON DELIVERY').toUpperCase();
  ctx.font = 'bold 18px sans-serif';
  const badgeW = ctx.measureText(payMethod).width + 30;
  const badgeH = 32;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect((width - badgeW) / 2, curY - 22, badgeW, badgeH);
  ctx.fillStyle = '#000000';
  ctx.fillText(payMethod, width / 2, curY);
  curY += 30;

  // Dashed separator
  const drawDashedLine = (y) => {
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(width - padX, y);
    ctx.stroke();
    ctx.restore();
  };

  drawDashedLine(curY);
  curY += 28;

  // Order Details
  ctx.textAlign = 'left';
  const drawMetaRow = (label, val, boldVal = false) => {
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(label, padX, curY);

    ctx.textAlign = 'right';
    ctx.font = boldVal ? 'bold 20px sans-serif' : '500 20px sans-serif';
    ctx.fillStyle = '#18181b';
    ctx.fillText(val || '-', width - padX, curY);
    ctx.textAlign = 'left';
    curY += 30;
  };

  drawMetaRow('Order ID:', `#ORD-${order.id}`, true);
  drawMetaRow('Date & Time:', formatOrderDateTime(order.createdAt));
  drawMetaRow('Customer:', order.customerName || 'Customer', true);
  drawMetaRow('Phone:', order.phone || '-');

  if (order.address) {
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText('Delivery Address:', padX, curY);
    curY += 26;
    ctx.font = '500 18px sans-serif';
    ctx.fillStyle = '#27272a';
    ctx.fillText(order.address, padX, curY);
    curY += 30;
  }

  if (order.notes) {
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(`Notes: ${order.notes}`, padX, curY);
    curY += 28;
  }

  drawDashedLine(curY);
  curY += 24;

  // Items Table
  const colX = {
    idx: padX,
    item: padX + 50,
    qty: width - padX - 250,
    rate: width - padX - 140,
    amt: width - padX - 10
  };

  // Table header background
  ctx.fillStyle = '#f4f4f5';
  ctx.fillRect(padX, curY - 20, width - (padX * 2), 36);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padX, curY - 20, width - (padX * 2), 36);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('#', padX + 25, curY + 5);
  ctx.textAlign = 'left';
  ctx.fillText('ITEM', colX.item + 10, curY + 5);
  ctx.textAlign = 'center';
  ctx.fillText('QTY', colX.qty + 35, curY + 5);
  ctx.textAlign = 'right';
  ctx.fillText('RATE', colX.rate + 40, curY + 5);
  ctx.fillText('AMOUNT', colX.amt, curY + 5);
  curY += 30;

  // Table items
  items.forEach((it, i) => {
    const rowY = curY;
    ctx.fillStyle = '#000000';
    ctx.font = '500 19px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), padX + 25, rowY + 12);

    ctx.textAlign = 'left';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(it.name, colX.item + 10, rowY + 12);

    if (it.size) {
      ctx.font = '500 15px sans-serif';
      ctx.fillStyle = '#52525b';
      const sizeStr = typeof it.size === 'string' ? it.size : it.size?.label || '';
      ctx.fillText(`Size: ${sizeStr}`, colX.item + 10, rowY + 32);
    }

    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(String(it.quantity), colX.qty + 35, rowY + 12);

    ctx.textAlign = 'right';
    ctx.font = '500 19px sans-serif';
    ctx.fillText(formatPrice(it.price), colX.rate + 40, rowY + 12);

    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(formatPrice(Number(it.price) * Number(it.quantity)), colX.amt, rowY + 12);

    curY += (it.size ? 50 : 38);
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, curY - 10);
    ctx.lineTo(width - padX, curY - 10);
    ctx.stroke();
  });

  curY += 10;
  drawDashedLine(curY);
  curY += 28;

  // Totals
  const subtotal = order.subtotal || items.reduce((acc, it) => acc + (Number(it.price) * Number(it.quantity)), 0);
  const deliveryFee = Number(order.deliveryFee || 0);
  const total = order.total || (subtotal + deliveryFee);

  drawMetaRow('Subtotal', `Rs. ${formatPrice(subtotal)}`);
  drawMetaRow('Delivery Charges', deliveryFee === 0 ? 'FREE' : `Rs. ${formatPrice(deliveryFee)}`);

  // Total Payable
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, curY - 10);
  ctx.lineTo(width - padX, curY - 10);
  ctx.stroke();

  ctx.font = 'bold 24px sans-serif';
  ctx.fillStyle = '#000000';
  ctx.fillText('TOTAL PAYABLE', padX, curY + 12);
  ctx.textAlign = 'right';
  ctx.fillText(`Rs. ${formatPrice(total)}`, width - padX, curY + 12);
  curY += 38;

  drawDashedLine(curY);
  curY += 32;

  // Footer
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#000000';
  ctx.fillText('THANK YOU FOR ORDERING!', width / 2, curY);
  curY += 26;

  ctx.font = '16px monospace';
  ctx.fillStyle = '#71717a';
  ctx.fillText('✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - -', width / 2, curY);

  return canvas.toDataURL('image/png');
}

/**
 * Capture receipt DOM element using html2canvas with high-DPI scaling.
 * Falls back to Canvas 2D renderer if element is unavailable.
 */
export async function generateReceiptImage(element, order) {
  if (element) {
    try {
      const canvas = await html2canvas(element, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.warn('html2canvas capture failed, falling back to direct canvas renderer:', err);
    }
  }
  return drawReceiptCanvas(order);
}

/**
 * Convert dataURL to Blob
 */
export function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Download receipt image to phone gallery / browser
 */
export async function downloadReceiptImage(element, order) {
  const fileName = `Receipt-ORD-${order.id || 'order'}.png`;
  const base64Data = await generateReceiptImage(element, order);

  // If running inside Android Native App via Capacitor
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await ReceiptBridge.saveImageToPhone({
        base64: base64Data,
        fileName: fileName,
      });
      return { success: true, native: true, ...res };
    } catch (e) {
      console.warn('Native saveImageToPhone failed, falling back to web download:', e);
    }
  }

  // Web fallback: standard browser download anchor
  try {
    const blob = dataURLtoBlob(base64Data);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 200);
    return { success: true, native: false };
  } catch (err) {
    console.error('Download receipt image failed:', err);
    throw err;
  }
}

/**
 * Share receipt image directly on WhatsApp (Native Android or Web Share API)
 */
export async function shareReceiptImageWhatsApp(element, order) {
  const fileName = `Receipt-ORD-${order.id || 'order'}.png`;
  const base64Data = await generateReceiptImage(element, order);

  const items = order.items || [];
  const itemsText = items
    .map(it => `• ${it.quantity}x ${it.name}${it.size ? ` (${typeof it.size === 'string' ? it.size : it.size?.label})` : ''} - Rs. ${formatPrice(Number(it.price) * Number(it.quantity))}`)
    .join('\n');

  const subtotal = order.subtotal || items.reduce((acc, it) => acc + (Number(it.price) * Number(it.quantity)), 0);
  const deliveryFee = Number(order.deliveryFee || 0);
  const total = order.total || (subtotal + deliveryFee);

  const caption = `*SALIK FAST FOOD - RECEIPT #${order.id}*\n\n` +
    `*Customer:* ${order.customerName || 'Customer'}\n` +
    `*Phone:* ${order.phone || '-'}\n` +
    (order.address ? `*Address:* ${order.address}\n` : '') +
    `*Date:* ${formatOrderDateTime(order.createdAt)}\n\n` +
    `*ORDER ITEMS:*\n${itemsText}\n\n` +
    `*Subtotal:* Rs. ${formatPrice(subtotal)}\n` +
    `*Delivery Charges:* ${deliveryFee === 0 ? 'FREE' : `Rs. ${formatPrice(deliveryFee)}`}\n` +
    `*TOTAL PAYABLE:* Rs. ${formatPrice(total)}\n` +
    `*Payment Method:* ${(order.paymentMethod || 'CASH ON DELIVERY').toUpperCase()}\n\n` +
    `Thank you for ordering with Salik Fast Food!`;

  // 1. Native Android App: Open WhatsApp directly with image attached
  if (Capacitor.isNativePlatform()) {
    try {
      await ReceiptBridge.shareReceiptWhatsApp({
        base64: base64Data,
        fileName: fileName,
        caption: caption,
        phone: order.phone || '',
      });
      return { success: true, method: 'native-whatsapp' };
    } catch (e) {
      console.warn('Native shareReceiptWhatsApp failed, trying Web Share / Web link:', e);
    }
  }

  // 2. Web Share API with image file (Supported on Mobile Chrome/Safari)
  try {
    const blob = dataURLtoBlob(base64Data);
    const file = new File([blob], fileName, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `Receipt #${order.id} - Salik Fast Food`,
        text: caption,
      });
      return { success: true, method: 'web-share' };
    }
  } catch (shareErr) {
    if (shareErr.name === 'AbortError') {
      // User cancelled share dialog
      return { success: false, cancelled: true };
    }
    console.warn('Web Share API error:', shareErr);
  }

  // 3. Desktop/Fallback: Download image and open WhatsApp Web with caption
  try {
    // Automatically trigger download of receipt image so user has it
    const blob = dataURLtoBlob(base64Data);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 200);

    // Open WhatsApp Web
    const cleanPhone = (order.phone || '').replace(/\D/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(caption)}`
      : `https://wa.me/?text=${encodeURIComponent(caption)}`;
    window.open(waUrl, '_blank');
    return { success: true, method: 'whatsapp-link' };
  } catch (err) {
    console.error('WhatsApp link fallback error:', err);
    throw err;
  }
}
