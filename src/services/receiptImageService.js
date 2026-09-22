import html2canvas from 'html2canvas';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { formatReceiptPaymentBadge } from '../utils/formatters';

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
 * Format order receipt date matching the modal: "Sep 21, 2026, 10:58 PM"
 */
export function formatOrderReceiptDate(isoString) {
  if (!isoString) return new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return isoString;
  }
}

/**
 * 100% Exact Canvas 2D Renderer matching the on-screen Receipt Modal Design
 */
export function drawReceiptCanvas(order) {
  const width = 760; // 2x high-resolution width (equivalent to 380px card)
  const padX = 44; // 22px padding at 1x
  let curY = 44;

  const items = order.items || [];
  const estimatedHeight = 680 + (items.length * 64) + (order.address ? 56 : 0) + (order.notes ? 44 : 0);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.max(760, estimatedHeight);
  const ctx = canvas.getContext('2d');

  // Background - Pure Crisp White
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, canvas.height);

  const fontSans = '"Plus Jakarta Sans", "Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // --- Store Header ---
  ctx.fillStyle = '#18181b'; // zinc-900
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.font = `800 32px ${fontSans}`;
  ctx.fillText('SALIK FAST FOOD', width / 2, curY);
  curY += 28;

  ctx.font = `700 21px ${fontSans}`;
  ctx.fillStyle = '#52525b'; // zinc-600
  ctx.fillText('TASTE THAT YOU NEED', width / 2, curY);
  curY += 26;

  ctx.font = `500 19px ${fontSans}`;
  ctx.fillStyle = '#71717a'; // zinc-500
  ctx.fillText('Wah Model Town, Wah Cantt', width / 2, curY);
  curY += 24;
  ctx.fillText('Phone: 0309-5369472', width / 2, curY);
  curY += 28;

  // Payment Badge - Centered rectangle with text centered
  const payMethod = formatReceiptPaymentBadge(order.paymentMethod);
  ctx.font = `800 19px ${fontSans}`;
  const badgeTextW = ctx.measureText(payMethod).width;
  const badgeW = badgeTextW + 36;
  const badgeH = 34;
  const badgeX = (width - badgeW) / 2;
  const badgeY = curY - 6;

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(payMethod, width / 2, badgeY + (badgeH / 2));
  curY = badgeY + badgeH + 24;

  // Fine Dashed Divider
  const drawDashedDivider = (y) => {
    ctx.save();
    ctx.strokeStyle = '#a1a1aa'; // zinc-400
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(padX, y);
    ctx.lineTo(width - padX, y);
    ctx.stroke();
    ctx.restore();
  };

  drawDashedDivider(curY);
  curY += 28;

  // --- Order Metadata ---
  ctx.textBaseline = 'alphabetic';
  const drawMetaLine = (label, val, isValBold = false) => {
    ctx.textAlign = 'left';
    ctx.font = `700 21px ${fontSans}`;
    ctx.fillStyle = '#000000';
    ctx.fillText(label, padX, curY);

    ctx.textAlign = 'right';
    ctx.font = isValBold ? `700 21px ${fontSans}` : `500 21px ${fontSans}`;
    ctx.fillStyle = '#18181b';
    ctx.fillText(val || '-', width - padX, curY);
    curY += 30;
  };

  const cleanOrderId = order.id ? (order.id.startsWith('#') ? order.id.slice(1) : order.id) : '0';
  drawMetaLine('Order ID:', `#${cleanOrderId}`, true);
  drawMetaLine('Date & Time:', formatOrderReceiptDate(order.createdAt), false);
  drawMetaLine('Customer:', order.customerName || 'Customer', true);
  drawMetaLine('Phone:', order.phone || '-', false);

  if (order.address) {
    ctx.textAlign = 'left';
    ctx.font = `700 21px ${fontSans}`;
    ctx.fillStyle = '#000000';
    ctx.fillText('Delivery Address:', padX, curY);
    curY += 26;
    ctx.font = `500 19px ${fontSans}`;
    ctx.fillStyle = '#3f3f46';
    ctx.fillText(order.address, padX, curY);
    curY += 30;
  }

  if (order.notes) {
    ctx.textAlign = 'left';
    ctx.font = `italic 19px ${fontSans}`;
    ctx.fillStyle = '#52525b';
    ctx.fillText(`Notes: ${order.notes}`, padX, curY);
    curY += 28;
  }

  // --- Items Table ---
  const tableX = padX;
  const tableW = width - (2 * padX);

  const colW = {
    idx: 50,
    qty: 68,
    rate: 96,
    amt: 116
  };
  const colItemW = tableW - colW.idx - colW.qty - colW.rate - colW.amt;

  const colLeft = {
    idx: tableX,
    item: tableX + colW.idx,
    qty: tableX + colW.idx + colItemW,
    rate: tableX + colW.idx + colItemW + colW.qty,
    amt: tableX + colW.idx + colItemW + colW.qty + colW.rate
  };

  // Header row
  const headerH = 38;
  ctx.fillStyle = '#f4f4f5'; // zinc-100
  ctx.fillRect(tableX, curY, tableW, headerH);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(tableX, curY, tableW, headerH);

  // Vertical header dividers
  [colLeft.item, colLeft.qty, colLeft.rate, colLeft.amt].forEach(x => {
    ctx.beginPath();
    ctx.moveTo(x, curY);
    ctx.lineTo(x, curY + headerH);
    ctx.stroke();
  });

  // Header text
  ctx.fillStyle = '#000000';
  ctx.font = `800 19px ${fontSans}`;
  ctx.textBaseline = 'middle';

  ctx.textAlign = 'center';
  ctx.fillText('#', colLeft.idx + (colW.idx / 2), curY + (headerH / 2));

  ctx.textAlign = 'left';
  ctx.fillText('ITEM', colLeft.item + 10, curY + (headerH / 2));

  ctx.textAlign = 'center';
  ctx.fillText('QTY', colLeft.qty + (colW.qty / 2), curY + (headerH / 2));

  ctx.textAlign = 'right';
  ctx.fillText('RATE', colLeft.rate + colW.rate - 10, curY + (headerH / 2));
  ctx.fillText('AMOUNT', colLeft.amt + colW.amt - 10, curY + (headerH / 2));

  curY += headerH;

  // Body rows
  items.forEach((it, i) => {
    const hasSize = Boolean(it.size);
    const rowH = hasSize ? 54 : 40;
    const midY = curY + (hasSize ? 20 : rowH / 2);

    // Row rectangle & vertical column borders
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tableX, curY, tableW, rowH);

    [colLeft.item, colLeft.qty, colLeft.rate, colLeft.amt].forEach(x => {
      ctx.beginPath();
      ctx.moveTo(x, curY);
      ctx.lineTo(x, curY + rowH);
      ctx.stroke();
    });

    // Row text
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#52525b';
    ctx.font = `500 19px ${fontSans}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), colLeft.idx + (colW.idx / 2), midY);

    ctx.fillStyle = '#000000';
    ctx.font = `600 20px ${fontSans}`;
    ctx.textAlign = 'left';
    ctx.fillText(it.name, colLeft.item + 10, midY);

    if (hasSize) {
      ctx.font = `500 16px ${fontSans}`;
      ctx.fillStyle = '#71717a';
      const sizeStr = typeof it.size === 'string' ? it.size : it.size?.label || '';
      ctx.fillText(`Size: ${sizeStr}`, colLeft.item + 10, curY + 38);
    }

    ctx.fillStyle = '#000000';
    ctx.font = `700 20px ${fontSans}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(it.quantity), colLeft.qty + (colW.qty / 2), midY);

    ctx.fillStyle = '#27272a';
    ctx.font = `500 20px ${fontSans}`;
    ctx.textAlign = 'right';
    ctx.fillText(formatPrice(it.price), colLeft.rate + colW.rate - 10, midY);

    ctx.fillStyle = '#000000';
    ctx.font = `700 20px ${fontSans}`;
    ctx.fillText(formatPrice(Number(it.price) * Number(it.quantity)), colLeft.amt + colW.amt - 10, midY);

    curY += rowH;
  });

  curY += 24;

  // --- Totals Section (Directly below table, matching modal) ---
  const subtotal = order.subtotal !== undefined 
    ? Number(order.subtotal) 
    : items.reduce((acc, it) => acc + (Number(it.price) * Number(it.quantity)), 0);
  const deliveryFee = Number(order.deliveryFee || 0);
  const total = order.total !== undefined ? Number(order.total) : (subtotal + deliveryFee);

  ctx.textBaseline = 'alphabetic';
  const drawTotalLine = (label, val, isBold = true) => {
    ctx.textAlign = 'left';
    ctx.font = `500 21px ${fontSans}`;
    ctx.fillStyle = '#52525b';
    ctx.fillText(label, padX, curY);

    ctx.textAlign = 'right';
    ctx.font = isBold ? `700 21px ${fontSans}` : `500 21px ${fontSans}`;
    ctx.fillStyle = '#000000';
    ctx.fillText(val, width - padX, curY);
    curY += 28;
  };

  drawTotalLine('Subtotal', `Rs. ${formatPrice(subtotal)}`);
  drawTotalLine('Delivery Charges', deliveryFee === 0 ? 'FREE' : `Rs. ${formatPrice(deliveryFee)}`);

  // Total Payable - Solid Line Divider Above
  curY += 2;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padX, curY);
  ctx.lineTo(width - padX, curY);
  ctx.stroke();
  curY += 28;

  ctx.font = `800 24px ${fontSans}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL PAYABLE', padX, curY);

  ctx.textAlign = 'right';
  ctx.fillText(`Rs. ${formatPrice(total)}`, width - padX, curY);
  curY += 28;

  // Dashed Divider before Footer
  drawDashedDivider(curY);
  curY += 28;

  // --- Footer ---
  ctx.textAlign = 'center';
  ctx.font = `700 20px ${fontSans}`;
  ctx.fillStyle = '#000000';
  ctx.fillText('THANK YOU FOR ORDERING!', width / 2, curY);
  curY += 24;

  ctx.font = `18px monospace`;
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText('✂ - - - - - - - - - - - - - - - - - - - - -', width / 2, curY);
  curY += 34;

  // Crop canvas to exact required height if shorter
  if (curY < canvas.height) {
    const trimmed = document.createElement('canvas');
    trimmed.width = width;
    trimmed.height = curY;
    const tCtx = trimmed.getContext('2d');
    tCtx.drawImage(canvas, 0, 0);
    return trimmed.toDataURL('image/png', 1.0);
  }

  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Capture receipt DOM element using html2canvas with high-DPI scaling.
 * Falls back to direct Canvas 2D renderer if element is unavailable or capture fails.
 */
export async function generateReceiptImage(element, order) {
  if (element) {
    try {
      // 1. Wait for web fonts (Plus Jakarta Sans, Montserrat) to fully load
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // 2. Measure element
      const rect = element.getBoundingClientRect();
      const elementWidth = Math.round(element.offsetWidth || rect.width || 380);
      const elementHeight = Math.round(element.offsetHeight || rect.height || 600);

      // 3. Render high-resolution canvas (scale: 3 for ultra-crisp print quality)
      const canvas = await html2canvas(element, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        width: elementWidth,
        height: elementHeight,
        onclone: (clonedDoc, clonedEl) => {
          // Copy all active stylesheets and link tags into the cloned document head
          const styles = document.querySelectorAll('link[rel="stylesheet"], style');
          styles.forEach((s) => {
            try {
              clonedDoc.head.appendChild(s.cloneNode(true));
            } catch (e) {}
          });

          // Enforce exact dimensions, background and font family on cloned element
          clonedEl.style.width = `${elementWidth}px`;
          clonedEl.style.maxWidth = `${elementWidth}px`;
          clonedEl.style.margin = '0 auto';
          clonedEl.style.boxSizing = 'border-box';
          clonedEl.style.backgroundColor = '#ffffff';
          clonedEl.style.fontFamily = '"Plus Jakarta Sans", "Montserrat", -apple-system, BlinkMacSystemFont, sans-serif';
        }
      });

      return canvas.toDataURL('image/png', 1.0);
    } catch (err) {
      console.warn('html2canvas capture failed, falling back to direct canvas renderer:', err);
    }
  }

  // Fallback: draw 100% exact canvas matching the modal
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
    `*Payment Method:* ${formatReceiptPaymentBadge(order.paymentMethod)}\n\n` +
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

/**
 * Print receipt HTML document (Native Android PrintManager via ReceiptBridge, or Web print fallback)
 */
export async function printReceiptDocument(html, title = 'Salik-Receipt') {
  // 1. If running inside Android Native App via Capacitor
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await ReceiptBridge.printReceipt({
        html: html,
        name: title,
      });
      return { success: true, native: true, ...res };
    } catch (e) {
      console.warn('Native printReceipt failed, falling back to web print:', e);
    }
  }

  // 2. Web fallback: iframe print
  try {
    let iframe = document.getElementById('receipt-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Iframe print error:', err);
        window.print();
      }
    }, 250);
    return { success: true, native: false };
  } catch (err) {
    console.error('Print failed:', err);
    throw err;
  }
}
