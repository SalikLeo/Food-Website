import React, { useEffect, useRef, useState } from 'react';
import { X, Download, MessageCircle, Loader2, Check } from 'lucide-react';
import { formatPrice, formatReceiptPaymentBadge } from '../utils/formatters';
import { downloadReceiptImage, shareReceiptImageWhatsApp } from '../services/receiptImageService';

export default function CustomerReceiptModal({ order, onClose }) {
  const receiptCardRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!order) return null;

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : 'Recent Order';

  const itemsList = order.items || [];
  const orderItemsSubtotal = order.subtotal !== undefined
    ? Number(order.subtotal)
    : itemsList.reduce((sum, it) => sum + ((Number(it.price) || 0) * (Number(it.quantity) || 1)), 0);

  const orderDeliveryFee = order.deliveryFee !== undefined
    ? Number(order.deliveryFee)
    : Math.max(0, (Number(order.total) || 0) - orderItemsSubtotal);

  const orderTotal = order.total !== undefined ? Number(order.total) : (orderItemsSubtotal + orderDeliveryFee);

  const generateReceiptHtml = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${order.id} - Salik Fast Food</title>
  <style>
    @page { size: 80mm auto; margin: 0mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      width: 72mm; max-width: 72mm; margin: 0 auto;
      padding: 2mm 1.5mm 10mm 1.5mm; color: #000; background: #fff;
      font-size: 10px; line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-container { width: 72mm; max-width: 72mm; margin: 0 auto; }
    .bold { font-weight: 700; }
    .header { text-align: center; padding-bottom: 8px; border-bottom: 1px dashed #000; }
    .header h1 { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #000; }
    .header p { font-size: 9.5px; color: #000; font-weight: 600; margin-top: 2px; }
    .badge {
      display: inline-block; margin-top: 5px; padding: 1px 7px;
      border: 1px solid #000; font-size: 9px; font-weight: 700; text-transform: uppercase;
    }
    .meta { padding: 6px 0; border-bottom: 1px dashed #000; font-size: 10px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; border: 1px solid #000; font-size: 9.5px; }
    th { background: #eee; padding: 3px 2px; border: 1px solid #000; font-weight: 700; text-transform: uppercase; }
    td { padding: 3px 2px; border: 1px solid #000; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .totals { padding: 6px 0; border-bottom: 1px dashed #000; font-size: 10px; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .totals-divider { height: 1.5px; background: #000; width: 100%; margin: 5px 0 4px 0; }
    .grand-total {
      display: flex; justify-content: space-between; font-weight: 800;
      font-size: 12px; padding-top: 1px;
    }
    .footer { text-align: center; padding-top: 8px; font-size: 9.5px; }
    @media print {
      @page { size: 80mm auto; margin: 0mm; }
      html, body {
        width: 72mm !important; max-width: 72mm !important; margin: 0 auto !important;
        padding: 2mm 1mm 6mm 1mm !important;
      }
      .receipt-container { width: 72mm !important; max-width: 72mm !important; margin: 0 auto !important; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
  <div class="header">
    <h1>SALIK FAST FOOD</h1>
    <p style="font-weight: 700; text-transform: uppercase; color: #000;">Taste That You Need</p>
    <p style="font-weight: 600; color: #000;">Wah Model Town, Wah Cantt • Phone: 0309-5369472</p>
    <div class="badge">${formatReceiptPaymentBadge(order.paymentMethod)}</div>
  </div>
  <div class="meta">
    <div class="meta-row"><span class="bold">Order ID:</span><span>#${order.id}</span></div>
    <div class="meta-row"><span class="bold">Date & Time:</span><span>${orderDate}</span></div>
    <div class="meta-row"><span class="bold">Customer:</span><span>${order.customerName || 'Customer'}</span></div>
    <div class="meta-row"><span class="bold">Phone:</span><span>${order.phone || '-'}</span></div>
    ${order.address ? `<div class="meta-row"><span class="bold">Address:</span><span>${order.address}</span></div>` : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th class="text-center" style="width: 20px;">#</th>
        <th>Item</th>
        <th class="text-center" style="width: 26px;">Qty</th>
        <th class="text-right" style="width: 44px;">Rate</th>
        <th class="text-right" style="width: 48px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsList.map((it, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td><strong>${it.name}</strong>${it.size ? `<br><span style="font-size: 8.5px; color: #000; font-weight: 600;">Size: ${typeof it.size === 'string' ? it.size : it.size?.label}</span>` : ''}</td>
          <td class="text-center bold">${it.quantity}</td>
          <td class="text-right" style="font-weight: 600; color: #000;">${formatPrice(it.price)}</td>
          <td class="text-right bold">${formatPrice(Number(it.price) * Number(it.quantity))}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span class="bold">Rs. ${formatPrice(orderItemsSubtotal)}</span></div>
    <div class="totals-row"><span>Delivery Charges</span><span class="bold">${orderDeliveryFee === 0 ? 'FREE' : `Rs. ${formatPrice(orderDeliveryFee)}`}</span></div>
    <div class="totals-divider"></div>
    <div class="grand-total"><span>TOTAL PAYABLE</span><span>Rs. ${formatPrice(orderTotal)}</span></div>
  </div>
  <div class="footer">
    <p class="bold">Thank you for ordering!</p>
    <p style="color: #666; margin-top: 4px;">✂ - - - - - - - - - - - - - - - - - - - - -</p>
  </div>
  </div><!-- /.receipt-container -->
</body>
</html>`;
  };

  const handleDownload = async () => {
    if (!order || isDownloading) return;
    try {
      setIsDownloading(true);
      await downloadReceiptImage(receiptCardRef.current, order);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    } catch (e) {
      console.error('Download receipt image failed:', e);
      alert('Could not download receipt image: ' + (e?.message || e));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!order || isSharing) return;
    try {
      setIsSharing(true);
      await shareReceiptImageWhatsApp(receiptCardRef.current, order);
    } catch (e) {
      console.error('WhatsApp share error:', e);
      alert('Could not share receipt to WhatsApp: ' + (e?.message || e));
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-4 overflow-y-auto animate-tab-fade"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[390px] bg-white text-black rounded-2xl shadow-2xl border border-zinc-300 font-sans text-xs leading-relaxed my-auto overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-600 hover:text-black flex items-center justify-center cursor-pointer active:scale-90 transition-all shadow-2xs z-20"
          title="Close Receipt"
          aria-label="Close Receipt"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Dedicated Receipt Card with Full Padding & Exact Styling */}
        <div 
          ref={receiptCardRef} 
          id="salik-receipt-card"
          className="bg-white text-black p-5 sm:p-6 font-sans text-xs leading-relaxed w-full"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif" }}
        >
          {/* Store Header */}
          <div className="text-center pb-3 border-b border-dashed border-zinc-400 font-sans">
            <h2 className="text-base font-extrabold tracking-wider uppercase text-black">SALIK FAST FOOD</h2>
            <p className="text-[11px] text-black uppercase font-bold tracking-wide">Taste That You Need</p>
            <p className="text-[10.5px] text-black font-semibold mt-0.5">
              Wah Model Town, Wah Cantt<br />
              Phone: 0309-5369472
            </p>
            <div className="mt-2 inline-flex items-center justify-center px-3 py-1 border border-black font-bold uppercase tracking-wider text-[10px] leading-none">
              <span className="leading-none">{formatReceiptPaymentBadge(order.paymentMethod)}</span>
            </div>
          </div>

          {/* Order Metadata */}
          <div className="py-2.5 border-b border-dashed border-zinc-400 space-y-1 font-sans text-xs">
            <div className="flex justify-between">
              <span className="font-bold">Order ID:</span>
              <span className="font-semibold">#{order.id && order.id.startsWith('#') ? order.id.slice(1) : order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Date & Time:</span>
              <span>{orderDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Customer:</span>
              <span className="font-semibold">{order.customerName || 'Customer'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Phone:</span>
              <span>{order.phone || '-'}</span>
            </div>
            {order.address && (
              <div className="pt-0.5">
                <span className="font-bold block">Delivery Address:</span>
                <span className="block text-[11px] leading-tight text-zinc-700">{order.address}</span>
              </div>
            )}
            {order.notes && (
              <div className="pt-0.5 text-[11px] italic">
                <span className="font-bold not-italic">Notes:</span> {order.notes}
              </div>
            )}
          </div>

          {/* Items Table - Tabular Design */}
          <div className="py-2.5">
            <table className="w-full text-left border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-zinc-100 font-sans font-bold text-[11px] uppercase tracking-wide border-b border-black text-black">
                  <th className="py-1 px-1.5 border-r border-black w-6 text-center">#</th>
                  <th className="py-1 px-2 border-r border-black">Item</th>
                  <th className="py-1 px-1.5 border-r border-black text-center w-8">Qty</th>
                  <th className="py-1 px-1.5 border-r border-black text-right w-12">Rate</th>
                  <th className="py-1 px-2 text-right w-14">Amount</th>
                </tr>
              </thead>
              <tbody>
                {itemsList.map((it, idx) => (
                  <tr key={idx} className="align-top border-b border-black">
                    <td className="py-1 px-1.5 border-r border-black text-center text-[11px] text-zinc-600">
                      {idx + 1}
                    </td>
                    <td className="py-1 px-2 border-r border-black font-medium text-xs text-black">
                      <div>{it.name}</div>
                      {it.size && (
                        <span className="inline-block text-[10.5px] font-semibold text-black">
                          Size: {typeof it.size === 'string' ? it.size : it.size?.label}
                        </span>
                      )}
                    </td>
                    <td className="py-1 px-1.5 border-r border-black text-center font-bold text-xs text-black">
                      {it.quantity}
                    </td>
                    <td className="py-1 px-1.5 border-r border-black text-right text-xs font-semibold text-black">
                      {formatPrice(it.price)}
                    </td>
                    <td className="py-1 px-2 text-right font-bold text-xs text-black">
                      {formatPrice(Number(it.price) * Number(it.quantity))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="py-2.5 border-t border-dashed border-zinc-400 space-y-1 font-sans text-xs">
            <div className="flex justify-between text-zinc-700">
              <span className="font-medium">Subtotal</span>
              <span className="font-bold">Rs. {formatPrice(orderItemsSubtotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-700">
              <span className="font-medium">Delivery Charges</span>
              <span className="font-bold">
                {orderDeliveryFee === 0 ? 'FREE' : `Rs. ${formatPrice(orderDeliveryFee)}`}
              </span>
            </div>
            <div className="my-1 h-[1.5px] bg-black w-full" />
            <div className="flex justify-between text-sm font-extrabold text-black">
              <span>TOTAL PAYABLE</span>
              <span>Rs. {formatPrice(orderTotal)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-2.5 border-t border-dashed border-zinc-400 text-[11px] space-y-1 text-zinc-700 font-sans">
            <p className="font-bold text-black uppercase tracking-wide">Thank you for ordering!</p>
            <p className="text-zinc-400 font-mono text-[9.5px]">✂ - - - - - - - - - - - - - - - - - - - - -</p>
          </div>
        </div>

        {/* Action Buttons: Download Image, WhatsApp Share Image */}
        <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-3 border-t border-dashed border-zinc-300 bg-zinc-50/70 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-xs disabled:opacity-60"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                <span>Saving...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-orange-400" />
                <span>Download</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            disabled={isSharing}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-xs disabled:opacity-60"
          >
            {isSharing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                <span>Sharing...</span>
              </>
            ) : (
              <>
                <MessageCircle className="w-3.5 h-3.5 text-white" />
                <span>WhatsApp</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
