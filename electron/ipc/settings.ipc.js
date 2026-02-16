// electron/ipc/settings.ipc.js
const { ipcMain } = require('electron');
const db = require('../database/db');

// Get all settings
ipcMain.handle('settings:get', async () => {
  try {
    const settings = db.getSettings();
    return { success: true, settings };
  } catch (error) {
    console.error('Get settings error:', error);
    return { success: false, error: error.message };
  }
});

// Update settings
ipcMain.handle('settings:save', async (_event, payload) => {
  try {
    const current = db.getSettings() || {};
    db.updateSettings({ ...current, ...(payload || {}) });
    return { success: true };
  } catch (error) {
    console.error('Save settings error:', error);
    return { success: false, error: error.message };
  }
});

// Get specific setting
ipcMain.handle('settings:getSetting', async (_event, key) => {
  try {
    const settings = db.getSettings();
    return { success: true, value: settings[key] };
  } catch (error) {
    console.error('Get setting error:', error);
    return { success: false, error: error.message };
  }
});

// Update specific setting
ipcMain.handle('settings:updateSetting', async (_event, { key, value }) => {
  try {
    const settings = db.getSettings();
    settings[key] = value;
    db.updateSettings(settings);
    return { success: true };
  } catch (error) {
    console.error('Update setting error:', error);
    return { success: false, error: error.message };
  }
});
