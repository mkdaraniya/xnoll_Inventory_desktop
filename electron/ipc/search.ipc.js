// electron/ipc/search.ipc.js
const { ipcMain } = require('electron');
const searchService = require('../services/search.service');

// Global search
ipcMain.handle('search:global', async (_event, query) => {
  try {
    const results = await searchService.globalSearch(query);
    return { success: true, results };
  } catch (error) {
    console.error('Global search error:', error);
    return { success: false, error: error.message, results: {} };
  }
});

// Module-specific search
ipcMain.handle('search:module', async (_event, { module, query }) => {
  try {
    const results = await searchService.moduleSearch(module, query);
    return { success: true, results };
  } catch (error) {
    console.error('Module search error:', error);
    return { success: false, error: error.message, results: [] };
  }
});