// electron/ipc/error.ipc.js
const { ipcMain } = require('electron');
const { logError } = require('../utils/errorLogger');

ipcMain.handle('errorReport', async (event, errorData) => {
  try {
    logError(errorData.error, errorData.context);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
