// electron/utils/skuGenerator.js
const crypto = require('crypto');

function generateSKU(prefix = 'SKU') {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

function validateSKU(sku) {
  const skuRegex = /^[A-Z0-9]{3,}-[A-Z0-9]{6,}$/;
  return skuRegex.test(sku);
}

module.exports = { generateSKU, validateSKU };
