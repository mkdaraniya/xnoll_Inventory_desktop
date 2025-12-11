// electron/windows/licenseWindow.js
const { BrowserWindow } = require('electron');
const path = require('path');

function createLicenseWindow(parentWindow) {
  const licenseWindow = new BrowserWindow({
    width: 500,
    height: 400,
    parent: parentWindow,
    modal: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  licenseWindow.loadFile(path.join(__dirname, '..', 'renderer', 'license.html'));
  licenseWindow.once('ready-to-show', () => licenseWindow.show());

  return licenseWindow;
}

module.exports = { createLicenseWindow };
