const { ipcMain } = require('electron');
const db = require('../database/db');

ipcMain.handle('taxRates:list', async () => {
  try {
    return { success: true, rows: db.getTaxRates() || [] };
  } catch (error) {
    return { success: false, error: error.message, rows: [] };
  }
});

ipcMain.handle('taxRates:query', async (_event, payload) => {
  try {
    return { success: true, ...db.queryTaxRates(payload || {}) };
  } catch (error) {
    return { success: false, error: error.message, rows: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
  }
});

ipcMain.handle('taxRates:create', async (_event, payload) => {
  try {
    return { success: true, ...db.insertTaxRate(payload || {}) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('taxRates:update', async (_event, payload) => {
  try {
    db.updateTaxRate(payload || {});
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('taxRates:delete', async (_event, id) => {
  try {
    db.deleteTaxRate(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
