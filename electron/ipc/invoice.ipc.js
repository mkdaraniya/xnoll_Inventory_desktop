
const { ipcMain } = require('electron');
const db = require('../database/db');

ipcMain.handle('invoices:list', async () => {
  // return invoices with items
  try {
    return db.getInvoicesWithItems();
  } catch (err) {
    console.error('invoices:list error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('invoices:query', async (_event, payload) => {
  try {
    return { success: true, ...db.queryInvoices(payload || {}) };
  } catch (err) {
    return { success: false, error: err.message, rows: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
  }
});

ipcMain.handle('invoices:create', async (_event, payload) => {
  try {
    return db.createInvoiceWithItems(payload);
  } catch (err) {
    console.error('invoices:create error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('invoices:delete', async (_event, id) => {
  return db.deleteInvoice(id);
});

ipcMain.handle("invoices:getById", async (_event, id) => {
  return db.getInvoiceById(id);
});
