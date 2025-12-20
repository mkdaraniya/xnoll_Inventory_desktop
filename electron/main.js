// electron/main.js
const { app, Menu, BrowserWindow, globalShortcut } = require("electron");
const { logError } = require("./utils/errorLogger");

const createMainWindow = require("./windows/mainWindow");
const appMenu = require("./menu");

// Register all IPC handlers (keep only what you use)
require("./ipc/app.ipc");
require("./ipc/customer.ipc");
require("./ipc/product.ipc");
require("./ipc/booking.ipc");
require("./ipc/invoice.ipc");
require("./ipc/settings.ipc");
require("./ipc/search.ipc");
require("./ipc/customFields.ipc");
require("./ipc/notes.ipc");
require("./ipc/reports.ipc");
require("./ipc/company.ipc");
require("./ipc/calendar.ipc");
require("./ipc/error.ipc");
require("./ipc/sku.ipc");
require("./ipc/print.ipc");
require("./ipc/seeder.ipc");

const isDev = process.env.NODE_ENV === "development";
let mainWindow = null;

app.disableHardwareAcceleration();

function registerGlobalShortcuts() {
  globalShortcut.register("CommandOrControl+K", () => {
    if (mainWindow) mainWindow.webContents.send("shortcut", "globalSearch");
  });

  globalShortcut.register("CommandOrControl+N", () => {
    if (mainWindow) mainWindow.webContents.send("shortcut", "newBooking");
  });

  globalShortcut.register("CommandOrControl+/", () => {
    if (mainWindow) mainWindow.webContents.send("shortcut", "showHelp");
  });

  globalShortcut.register("CommandOrControl+2", () => {
    if (mainWindow) mainWindow.webContents.send("navigate", "calendar");
  });

  globalShortcut.register("CommandOrControl+1", () => {
    if (mainWindow) mainWindow.webContents.send("navigate", "dashboard");
  });
}

function createMainWindowIfNeeded() {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = createMainWindow(isDev);
    if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function startApp() {
  Menu.setApplicationMenu(appMenu);

  mainWindow = createMainWindow(isDev);
  if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" });
  // And your explicit shortcuts (optional)
  registerGlobalShortcuts();
}

// Single-instance lock (prevents double-open)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      createMainWindowIfNeeded();
    }
  });

  app.whenReady().then(startApp);


  app.on("window-all-closed", () => {
    globalShortcut.unregisterAll();
    if (process.platform !== "darwin") app.quit();
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });
}

// Crash handlers
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  try {
    logError(error, "uncaughtException");
  } catch (_) {}
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  try {
    logError(reason, "unhandledRejection");
  } catch (_) {}
});

module.exports = { startApp };
