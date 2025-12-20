const { BrowserWindow } = require("electron");
const path = require("path");

function createMainWindow(isDev) {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: "Xnoll Booking Desktop",
    icon: path.join(__dirname, "../../build/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const prodPath = path.join(__dirname, "../../dist/renderer/index.html");
    mainWindow.loadFile(prodPath);
  }

  return mainWindow;
}

module.exports = createMainWindow;
