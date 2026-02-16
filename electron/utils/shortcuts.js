// electron/utils/shortcuts.js
const { globalShortcut } = require('electron');

const SHORTCUTS = {
  'CommandOrControl+K': 'globalSearch',
  'CommandOrControl+N': 'newStockTransaction',
  'CommandOrControl+,': 'showHelp',
  'CommandOrControl+1': 'dashboard',
  'CommandOrControl+2': 'products'
};

function registerShortcuts(mainWindow) {
  Object.entries(SHORTCUTS).forEach(([shortcut, action]) => {
    globalShortcut.register(shortcut, () => {
      if (mainWindow) {
        mainWindow.webContents.send('shortcut', action);
      }
    });
  });
}

function unregisterShortcuts() {
  globalShortcut.unregisterAll();
}

module.exports = { registerShortcuts, unregisterShortcuts };
