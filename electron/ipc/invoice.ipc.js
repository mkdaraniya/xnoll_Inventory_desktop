
const { ipcMain } = require('electron');
const db = require('../database/db');

ipcMain.handle('invoices:list', async () => {
  return db.getAllInvoices();
});

ipcMain.handle('invoices:create', async (_event, payload) => {
  return db.insertInvoice(payload);
});

ipcMain.handle('invoices:update', async (_event, payload) => {
  return db.updateInvoice(payload);
});

ipcMain.handle('invoices:delete', async (_event, id) => {
  return db.deleteInvoice(id);
});