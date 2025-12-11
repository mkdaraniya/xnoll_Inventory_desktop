const { ipcMain } = require('electron');
const { generateSKU, validateSKU } = require('../utils/skuGenerator');
const db = require('../database/db');

ipcMain.handle('sku:generate', async (_event, prefix = 'SKU') => {
  try {
    let sku = generateSKU(prefix);
    let attempts = 0;
    while (db.checkSkuExists(sku) && attempts < 10) {
      sku = generateSKU(prefix);
      attempts++;
    }
    if (attempts === 10) throw new Error('Failed to generate unique SKU');
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

