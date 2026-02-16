// electron/ipc/customer.ipc.js
const { ipcMain } = require('electron');
const db = require('../database/db');

// Get all customers (for list)
ipcMain.handle('customers:list', async () => {
  return db.getCustomersWithCustomFields();
});

ipcMain.handle('customers:query', async (_event, payload) => {
  try {
    return { success: true, ...db.queryCustomers(payload || {}) };
  } catch (error) {
    return { success: false, error: error.message, rows: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
  }
});

// Create new customer
ipcMain.handle('customers:create', async (_event, payload) => {
  try {
    return db.insertCustomer(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Update existing customer
ipcMain.handle('customers:update', async (_event, payload) => {
  try {
    return db.updateCustomer(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete customer
ipcMain.handle('customers:delete', async (_event, id) => {
  try {
    return db.deleteCustomer(id);
  } catch (error) {
    return { success: false, error: error.message };
  }
});
