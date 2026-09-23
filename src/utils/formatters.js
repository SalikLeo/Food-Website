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
 * Replaces 'Online Payment' or 'online' with 'Easypaisa'.
 */
export function formatPaymentMethod(method) {
  if (!method) return 'Cash on Delivery';
  const str = String(method).trim();
  if (/easypaisa|online/i.test(str)) {
    return 'Easypaisa';
  }
  if (/cash[_\s-]?on[_\s-]?delivery|cod/i.test(str)) {
    return 'Cash on Delivery';
  }
  return str.replace(/_/g, ' ');
}

/**
 * Format payment method badge text for receipts (all-caps):
 * e.g. 'EASYPAISA', 'CASH ON DELIVERY'
 */
export function formatReceiptPaymentBadge(method) {
  const formatted = formatPaymentMethod(method);
  return formatted ? formatted.toUpperCase() : 'CASH ON DELIVERY';
}

/**
 * Format date to local YYYY-MM-DD string
 */
export function getLocalDateStr(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date to DD/MM/YY (e.g. 22/09/26)
 */
export function formatToDDMMYY(d) {
  if (!d) return '';
  const date = new Date(typeof d === 'string' && d.includes('-') && !d.includes('T') ? `${d}T00:00:00` : d);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

/**
 * Clean deal inclusions/description by removing category annotations in brackets like (Burgers), (Beverages), (Pizza), etc.
 */
export function cleanDealInclusions(val) {
  if (!val) return '';
  if (Array.isArray(val)) {
    return val.map(item => cleanDealInclusions(item)).filter(Boolean);
  }
  if (typeof val !== 'string') return String(val);
  
  return val
    .replace(/\s*\((Burgers|Beverages|Shawarma|Chicken Nuggets|Nuggets|Pizza|Fries|Hot Wings|Wings|Special|Sandwiches|Drinks|General|Sauces|Platter|Deals|Deal)\)/gi, '')
    .replace(/\s*\((Pizza & Burgers|Fast Food|Sides|Combo|Meals)\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format deal inclusions or description as a clean comma-separated list of items without category brackets.
 */
export function formatDealDescription(val) {
  if (!val) return '';
  if (Array.isArray(val)) {
    return val
      .map(item => cleanDealInclusions(item))
      .map(s => (typeof s === 'string' ? s.trim() : s))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof val !== 'string') return String(val);
  const cleaned = cleanDealInclusions(val);
  return cleaned
    .split(/\s*\+\s*/)
    .map(s => s.trim())
    .filter(Boolean)
    .join(', ');
}

export default formatPrice;

