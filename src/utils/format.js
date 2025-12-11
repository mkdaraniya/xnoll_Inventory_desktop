// Currency formatting utilities
export const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
};

export const formatCurrency = (amount, currency = 'INR') => {
  if (!amount && amount !== 0) return '';
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol}${Number(amount).toLocaleString()}`;
};

export const getCurrencySymbol = (currency = 'INR') => {
  return CURRENCY_SYMBOLS[currency] || currency;
};
