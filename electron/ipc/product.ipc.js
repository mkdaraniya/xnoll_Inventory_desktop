// electron/ipc/product.ipc.js
const { ipcMain } = require('electron');
const db = require('../database/db');

// List products
ipcMain.handle('products:list', async () => {
  return db.getProductsWithCustomFields();
});

// Create
ipcMain.handle('products:create', async (_event, payload) => {
  return db.insertProduct(payload);
});

// Update
ipcMain.handle('products:update', async (_event, payload) => {
  return db.updateProduct(payload);
});

// Delete
ipcMain.handle('products:delete', async (_event, id) => {
  return db.deleteProduct(id);
});