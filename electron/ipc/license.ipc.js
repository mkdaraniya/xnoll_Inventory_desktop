// electron/ipc/license.ipc.js
const { ipcMain } = require('electron');
const licenseService = require('../services/license.service');

// Get machine ID
ipcMain.handle('license:getMachineId', async () => {
  try {
    const machineId = licenseService.getMachineId();
    return { success: true, machineId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Activate license
ipcMain.handle('license:activate', async (_event, licenseKey) => {
  try {
    const result = licenseService.saveLicense(licenseKey);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check license status
ipcMain.handle('license:check', async () => {
  try {
    const result = licenseService.loadLicense();
    return result;
  } catch (error) {
    return { valid: false, error: error.message };
  }
});

// Deactivate license
ipcMain.handle('license:deactivate', async () => {
  try {
    const result = licenseService.removeLicense();
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Generate license (for testing/demo - remove in production!)
ipcMain.handle('license:generate', async (_event, { machineId, daysValid }) => {
  try {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (daysValid || 365));
    
    const licenseKey = licenseService.constructor.generateLicenseKey(machineId, expiryDate);
    return { success: true, licenseKey, expiryDate };
  } catch (error) {
    return { success: false, error: error.message };
  }
});