const { ipcMain } = require('electron');
const { buildSkuBase, generateSKU, validateSKU } = require('../utils/skuGenerator');
const db = require('../database/db');

ipcMain.handle('sku:generate', async (_event, input = 'SKU') => {
  try {
    const payload = typeof input === 'string' ? { prefix: input } : (input || {});
    const baseCode = buildSkuBase(payload.prefix || 'SKU', payload.name || '');
    let sequence = db.getNextSkuSequence(baseCode);
    let sku = generateSKU({ ...payload, sequence });
    let attempts = 0;
    while (db.checkSkuExists(sku) && attempts < 50) {
      sequence += 1;
      sku = generateSKU({ ...payload, sequence });
      attempts += 1;
    }
    if (attempts >= 50) throw new Error('Failed to generate unique SKU');
    return { success: true, sku };
  } catch (err) {
    console.error('sku:generate error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('sku:validate', async (_event, sku, excludeId) => {
  try {
    const exists = db.checkSkuExists(sku, excludeId);
    return { success: true, exists };
  } catch (err) {
    console.error('sku:validate error', err);
    return { success: false, error: err.message };
  }
});
