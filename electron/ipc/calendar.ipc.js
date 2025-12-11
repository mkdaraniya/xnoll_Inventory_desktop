const { ipcMain } = require('electron');
const db = require('../database/db');

ipcMain.handle('calendar:getBookings', async (_event, { startDate, endDate }) => {
  try {
    const rows = db.listBookingsInRange(startDate, endDate);
    return rows;
  } catch (err) {
    console.error('calendar:getBookings error', err);
    return { success: false, error: err.message };
  }
});

