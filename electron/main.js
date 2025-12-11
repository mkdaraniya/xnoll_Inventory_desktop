// electron/main.js
const { app, Menu, BrowserWindow, globalShortcut } = require('electron');
const { registerShortcuts } = require('./utils/shortcuts');
const { logError } = require('./utils/errorLogger');
const config = require('./config/env');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

const createMainWindow = require('./windows/mainWindow');
const appMenu = require('./menu');
const licenseService = require('./services/license.service');

// Register all IPC handlers
require('./ipc/app.ipc');
require('./ipc/customer.ipc');
require('./ipc/product.ipc');
require('./ipc/booking.ipc');
require('./ipc/invoice.ipc');
require('./ipc/license.ipc');
require('./ipc/settings.ipc');
require('./ipc/search.ipc');
require('./ipc/backup.ipc');
require('./ipc/customFields.ipc');
require('./ipc/notes.ipc');
require('./ipc/reminders.ipc');
require('./ipc/reports.ipc');
require('./ipc/company.ipc');
require('./ipc/calendar.ipc');
require('./ipc/error.ipc');
require('./ipc/sku.ipc');
require('./ipc/print.ipc');
require('./ipc/seeder.ipc');

let mainWindow = null;

// Check license before allowing app to start
async function checkLicenseAndStart() {
  // In development, skip license check
  if (isDev) {
    console.log('Development mode: Skipping license check');
    startApp();
    return;
  }

  try {
    const licenseStatus = licenseService.loadLicense();
    
    if (!licenseStatus.valid) {
      console.log('License invalid:', licenseStatus.error);
      // App will show license activation screen
      startApp();
    } else {
      console.log('License valid. Days remaining:', licenseStatus.daysRemaining);
      
      // Warn if license expires soon (within 7 days)
      if (licenseStatus.daysRemaining <= 7) {
        console.log('WARNING: License expires soon!');
      }
      
      startApp();
    }
  } catch (error) {
    console.error('License check failed:', error);
    // Still start the app, let the UI handle the error
    startApp();
  }
}

function startApp() {
  Menu.setApplicationMenu(appMenu);
  mainWindow = createMainWindow(isDev);
  
  // Register global shortcuts
  registerGlobalShortcuts();
  
  // Start background services
  startBackgroundServices();
  
  // Handle app updates (future)
  // checkForUpdates();
}

function registerGlobalShortcuts() {
  // Global search (Ctrl+K or Cmd+K)
  globalShortcut.register('CommandOrControl+K', () => {
    if (mainWindow) {
      mainWindow.webContents.send('shortcut', 'globalSearch');
    }
  });
  
  // Quick new booking (Ctrl+N or Cmd+N)
  globalShortcut.register('CommandOrControl+N', () => {
    if (mainWindow) {
      mainWindow.webContents.send('shortcut', 'newBooking');
    }
  });
  
  // Show shortcuts help (Ctrl+/ or Cmd+/)
  globalShortcut.register('CommandOrControl+/', () => {
    if (mainWindow) {
      mainWindow.webContents.send('shortcut', 'showHelp');
    }
  });
  
  // Calendar view (Ctrl+2 or Cmd+2)
  globalShortcut.register('CommandOrControl+2', () => {
    if (mainWindow) {
      mainWindow.webContents.send('navigate', 'calendar');
    }
  });
  
  // Dashboard (Ctrl+1 or Cmd+1)
  globalShortcut.register('CommandOrControl+1', () => {
    if (mainWindow) {
      mainWindow.webContents.send('navigate', 'dashboard');
    }
  });
}

function startBackgroundServices() {
  // Check reminders every minute
  setInterval(() => {
    if (mainWindow) {
      mainWindow.webContents.send('check:reminders');
    }
  }, 60 * 1000); // Every 60 seconds
  
  // Auto-backup daily (if enabled)
  // Implement based on settings
}

function createMainWindowIfNeeded() {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow(isDev);
  }
}

// App lifecycle events
app.whenReady().then(checkLicenseAndStart);

app.on('window-all-closed', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  
  // On macOS, keep app running when windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, recreate window when dock icon is clicked
  if (process.platform === 'darwin') {
    createMainWindowIfNeeded();
  }
});

app.on('will-quit', () => {
  // Cleanup before quit
  globalShortcut.unregisterAll();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Log to file
  // Optionally send to error reporting service
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Log to file
});

// Export for testing
module.exports = { startApp, checkLicenseAndStart };