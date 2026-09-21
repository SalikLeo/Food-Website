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

export default formatPrice;
