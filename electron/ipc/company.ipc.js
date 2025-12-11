const { ipcMain } = require('electron');
const db = require('../database/db');

ipcMain.handle('company:get', async () => {
  try {
    const company = db.getCompanyProfile();
    return { success: true, company };
  } catch (err) {
    console.error('company:get error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('company:save', async (_event, payload) => {
  try {
    db.updateCompanyProfile(payload);
    return { success: true };
  } catch (err) {
    console.error('company:save error', err);
    return { success: false, error: err.message };
  }
});

