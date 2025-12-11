const { ipcMain } = require('electron');
const db = require('../database/db');

ipcMain.handle('db:select', async (_event, table) => {
  return db.selectAll(table);
});
