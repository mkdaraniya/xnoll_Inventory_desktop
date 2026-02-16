const { ipcMain } = require('electron');
const db = require('../database/db');

ipcMain.handle('notes:list', async () => {
  try {
    return db.getAllNotes();
  } catch (err) {
    console.error('notes:list error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('notes:query', async (_event, payload) => {
  try {
    return { success: true, ...db.queryNotes(payload || {}) };
  } catch (err) {
    return { success: false, error: err.message, rows: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
  }
});

ipcMain.handle('notes:create', async (_event, payload) => {
  try {
    return db.insertNote(payload);
  } catch (err) {
    console.error('notes:create error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('notes:update', async (_event, payload) => {
  try {
    return db.updateNote(payload);
  } catch (err) {
    console.error('notes:update error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('notes:delete', async (_event, id) => {
  try {
    return db.deleteNote(id);
  } catch (err) {
    console.error('notes:delete error', err);
    return { success: false, error: err.message };
  }
});
