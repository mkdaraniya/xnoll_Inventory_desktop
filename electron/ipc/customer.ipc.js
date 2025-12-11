// electron/ipc/customer.ipc.js
const { ipcMain } = require('electron');
const db = require('../database/db');

// Get all customers (for list)
ipcMain.handle('customers:list', async () => {
  return db.getCustomersWithCustomFields();
});

// Create new customer
ipcMain.handle('customers:create', async (_event, payload) => {
  return db.insertCustomer(payload);
});

// Update existing customer
ipcMain.handle('customers:update', async (_event, payload) => {
  return db.updateCustomer(payload);
});

// Delete customer
ipcMain.handle('customers:delete', async (_event, id) => {
  return db.deleteCustomer(id);
});
