/**
 * Finora — Centralized Currency Formatting
 *
 * Every screen imports from here instead of hardcoding `$`.
 * The user's chosen currency code (e.g. 'PKR', 'EUR') is stored
 * in `user.currency` and passed into these helpers.
 */

export const CURRENCY_SYMBOLS = {
  USD: '$',
  PKR: 'Rs. ',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AED: 'AED ',
  SAR: 'SAR ',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥',
  BDT: '৳',
  TRY: '₺',
  CNY: '¥',
  KRW: '₩',
  MYR: 'RM ',
  SGD: 'S$',
  THB: '฿',
  PHP: '₱',
  IDR: 'Rp ',
  ZAR: 'R ',
  NGN: '₦',
  EGP: 'E£',
  BRL: 'R$',
  MXN: 'MX$',
  QAR: 'QAR ',
  KWD: 'KWD ',
  BHD: 'BHD ',
  OMR: 'OMR ',
};

/**
 * All supported currencies with label + symbol for picker UIs.
 */
export const CURRENCY_LIST = Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => ({
  code,
  symbol,
  label: `${code} (${symbol.trim()})`,
}));

/**
 * Format an amount with the correct currency symbol.
 *
 * @param {number|string} amount   - The numeric value
 * @param {string}        currency - ISO 4217 code, e.g. 'PKR'
 * @param {object}        options  - { decimals: 2, compact: false }
 * @returns {string}               e.g. "Rs. 1,500.00" or "-$320.50"
 */
export function formatCurrency(amount, currency = 'USD', options = {}) {
  const num = parseFloat(amount || 0);
  const code = (currency || 'USD').toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] || `${code} `;
  const decimals = options.decimals !== undefined ? options.decimals : 2;

  const formattedNum = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (num < 0) return `-${symbol}${formattedNum}`;
  return `${symbol}${formattedNum}`;
}

/**
 * Return just the symbol string for a given currency code.
 * Useful for inline display beside TextInput fields.
 *
 * @param {string} currency - ISO 4217 code
 * @returns {string}         e.g. "Rs. " or "$"
 */
export function getCurrencySymbol(currency = 'USD') {
  const code = (currency || 'USD').toUpperCase();
  return CURRENCY_SYMBOLS[code] || `${code} `;
}
