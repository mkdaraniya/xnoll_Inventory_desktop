const { Menu, shell, BrowserWindow, dialog } = require("electron");

const isDev = process.env.NODE_ENV === "development";

const nav = (page, extraType = null) => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;
  win.webContents.send("navigate", page);
  if (extraType) win.webContents.send("reports:type", extraType);
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
      ...(isDev
        ? [
            { type: "separator" },
            {
              role: "toggledevtools",
              label: "Toggle DevTools",
              accelerator: "CmdOrCtrl+Shift+I",
            },
          ]
        : []),
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
        label: "About Xnoll Inventory Desktop",
        click: () => {
          dialog.showMessageBox({
            type: "info",
            title: "About Xnoll Inventory Desktop",
            message: "Xnoll Inventory Desktop",
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
