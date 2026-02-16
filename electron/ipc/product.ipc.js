// electron/ipc/product.ipc.js
const { ipcMain } = require('electron');
const db = require('../database/db');

// List products
ipcMain.handle('products:list', async () => {
  return db.getProductsWithCustomFields();
});

ipcMain.handle('products:query', async (_event, payload) => {
  try {
    return { success: true, ...db.queryProducts(payload || {}) };
  } catch (error) {
    return { success: false, error: error.message, rows: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
  }
});

// Create
ipcMain.handle('products:create', async (_event, payload) => {
  try {
    return db.insertProduct(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update
ipcMain.handle('products:update', async (_event, payload) => {
  try {
    return db.updateProduct(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete
ipcMain.handle('products:delete', async (_event, id) => {
  try {
    return db.deleteProduct(id);
  } catch (error) {
    return { success: false, error: error.message };
  }
});
