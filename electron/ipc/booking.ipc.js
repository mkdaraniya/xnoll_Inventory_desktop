const { ipcMain } = require('electron');
const db = require('../database/db');

// list
ipcMain.handle('bookings:list', async () => {
  return db.getBookingsWithCustomFields();
});

// create
ipcMain.handle('bookings:create', async (_event, payload) => {
  return db.insertBooking(payload);
});

// update
ipcMain.handle('bookings:update', async (_event, payload) => {
  return db.updateBooking(payload);
});

// delete
ipcMain.handle('bookings:delete', async (_event, id) => {
  return db.deleteBooking(id);
});
