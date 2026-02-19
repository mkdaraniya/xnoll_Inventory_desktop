const path = require("path");
const { Menu, shell, BrowserWindow, dialog } = require("electron");

let docsWindow = null;

const nav = (page, extraType = null) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;
  win.webContents.send("navigate", page);
  if (extraType) win.webContents.send("reports:type", extraType);
};

const openDocumentationWindow = () => {
  if (docsWindow && !docsWindow.isDestroyed()) {
    docsWindow.focus();
    return;
  }

  const parent = BrowserWindow.getAllWindows()[0] || null;
  docsWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 620,
    title: "Xnoll Inventory Documentation",
    parent,
    icon: path.join(__dirname, "../build/icon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  docsWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  docsWindow.loadFile(path.join(__dirname, "docs", "user-guide.html"));
  docsWindow.on("closed", () => {
    docsWindow = null;
  });
};

const template = [
  {
    label: "File",
    submenu: [
      {
        label: "New Stock Transaction",
        accelerator: "CmdOrCtrl+N",
        click: () => nav("stock"),
      },
      {
        label: "New Purchase Order",
        accelerator: "CmdOrCtrl+Shift+N",
        click: () => nav("purchases"),
      },
      { type: "separator" },
      {
        label: "Settings",
        accelerator: "CmdOrCtrl+,",
        click: () => nav("settings"),
      },
      { type: "separator" },
      { role: "quit", label: "Exit", accelerator: "CmdOrCtrl+Q" },
    ],
  },
  {
    label: "View",
    submenu: [
      { label: "Dashboard", accelerator: "CmdOrCtrl+1", click: () => nav("dashboard") },
      { label: "Products", accelerator: "CmdOrCtrl+2", click: () => nav("products") },
      { label: "Stock", accelerator: "CmdOrCtrl+3", click: () => nav("stock") },
      { label: "Suppliers", accelerator: "CmdOrCtrl+4", click: () => nav("suppliers") },
      { label: "Purchase Orders", accelerator: "CmdOrCtrl+5", click: () => nav("purchases") },
      { label: "Warehouses", accelerator: "CmdOrCtrl+6", click: () => nav("warehouses") },
      { label: "Reports", accelerator: "CmdOrCtrl+7", click: () => nav("reports") },
      { type: "separator" },
      { role: "reload", label: "Reload", accelerator: "CmdOrCtrl+R" },
    ],
  },
  {
    label: "Reports",
    submenu: [
      { label: "Stock Ledger", click: () => nav("reports", "ledger") },
      { label: "Reorder Alerts", click: () => nav("reports", "reorder") },
      { label: "Expiry Risk", click: () => nav("reports", "expiry") },
      { label: "Inventory Valuation", click: () => nav("reports", "valuation") },
    ],
  },
  {
    label: "Help",
    submenu: [
      {
        label: "Documentation",
        click: () => openDocumentationWindow(),
      },
      {
        label: "Online Docs",
        click: () => shell.openExternal("https://xnoll.com/docs"),
      },
      {
        label: "Open Website",
        click: () => shell.openExternal("https://xnoll.com"),
      },
      {
        label: "Report Issue",
        click: () => shell.openExternal("https://xnoll.com/support"),
      },
      { type: "separator" },
      {
        label: "About Xnoll Inventory",
        click: () => {
          dialog.showMessageBox({
            type: "info",
            title: "About Xnoll Inventory",
            message: "Xnoll Inventory",
            detail:
              "Version: 1.0.0\nOffline-first inventory management system\n\n© 2026 Xnoll. All rights reserved.",
            buttons: ["OK"],
          });
        },
      },
    ],
  },
];

module.exports = Menu.buildFromTemplate(template);
