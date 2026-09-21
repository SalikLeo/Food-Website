/**
 * Format currency numbers according to custom Pakistani formatting rules:
 * - Numbers under 10,000 have NO comma: e.g. 450, 1800, 2400, 9999
 * - Numbers 10,000 to 99,999 use thousands separator: e.g. 20,300
 * - Numbers 100,000 and above use South Asian Lakh grouping: e.g. 1,20,200
 */
export function formatPrice(val) {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'number' ? Math.round(val) : Math.round(Number(val));
  if (isNaN(num)) return '0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs < 10000) {
    return sign + abs.toString();
  }
  return sign + abs.toLocaleString('en-IN');
}

/**
 * Format payment method:
 * Replaces legacy 'EasyPaisa' or 'Easypaisa' with 'Online Payment'.
 */
export function formatPaymentMethod(method) {
  if (!method) return 'Cash on Delivery';
  const str = String(method).trim();
  if (/easypaisa/i.test(str)) {
    return str.replace(/easypaisa/gi, 'Online Payment');
  }
  return str;
}

/**
 * Format payment method badge text for receipts (all-caps):
 * e.g. 'ONLINE PAYMENT', 'CASH ON DELIVERY'
 */
export function formatReceiptPaymentBadge(method) {
  const formatted = formatPaymentMethod(method);
  return formatted ? formatted.toUpperCase() : 'CASH ON DELIVERY';
}

export default formatPrice;
