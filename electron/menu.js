// electron/menu.js
const { Menu, shell, BrowserWindow, dialog } = require('electron');

const isDev = process.env.NODE_ENV === 'development';

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'New Booking',
        accelerator: 'CmdOrCtrl+N',
        click: () => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('navigate', 'booking');
        }
      },
      { type: 'separator' },
      { type: 'separator' },
      {
        label: 'Settings',
        accelerator: 'CmdOrCtrl+,',
        click: () => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('navigate', 'settings');
        }
      },
      { type: 'separator' },
      { 
        role: 'quit', 
        label: 'Exit',
        accelerator: 'CmdOrCtrl+Q'
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo', label: 'Undo', accelerator: 'CmdOrCtrl+Z' },
      { role: 'redo', label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z' },
      { type: 'separator' },
      { role: 'cut', label: 'Cut', accelerator: 'CmdOrCtrl+X' },
      { role: 'copy', label: 'Copy', accelerator: 'CmdOrCtrl+C' },
      { role: 'paste', label: 'Paste', accelerator: 'CmdOrCtrl+V' },
      { role: 'selectAll', label: 'Select All', accelerator: 'CmdOrCtrl+A' }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Dashboard',
        accelerator: 'CmdOrCtrl+1',
        click: () => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('navigate', 'dashboard');
        }
      },
      {
        label: 'Calendar',
        accelerator: 'CmdOrCtrl+2',
        click: () => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('navigate', 'calendar');
        }
      },
      {
        label: 'Bookings',
        accelerator: 'CmdOrCtrl+3',
        click: () => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('navigate', 'booking');
        }
      },
      {
        label: 'Customers',
        accelerator: 'CmdOrCtrl+4',
        click: () => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('navigate', 'customers');
        }
      },
      {
        label: 'Products',
        accelerator: 'CmdOrCtrl+5',
        click: () => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('navigate', 'products');
        }
      },
      {
        label: 'Invoices',
        accelerator: 'CmdOrCtrl+6',
        click: () => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('navigate', 'invoices');
        }
      },
      {
        label: 'Reports',
        accelerator: 'CmdOrCtrl+7',
        click: () => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) win.webContents.send('navigate', 'reports');
        }
      },
      { type: 'separator' },
      { 
        role: 'reload', 
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R'
      },
      // { 
      //   role: 'togglefullscreen',
      //   label: 'Toggle Fullscreen',
      //   accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11'
      // },
      ...(isDev
        ? [
            { type: 'separator' }, 
            { 
              role: 'toggledevtools', 
              label: 'Toggle DevTools',
              accelerator: 'CmdOrCtrl+Shift+I'
            }
          ]
        : [])
    ]
  },
  {
    label: 'Reports',
    submenu: [
      {
        label: 'Sales Report',
        click: () => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) {
            win.webContents.send('navigate', 'reports');
            win.webContents.send('reports:type', 'sales');
          }
        }
      },
      {
        label: 'Booking Statistics',
        click: () => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) {
            win.webContents.send('navigate', 'reports');
            win.webContents.send('reports:type', 'bookings');
          }
        }
      },
      {
        label: 'Customer Analytics',
        click: () => {
          const win = BrowserWindow.getAllWindows()[0];
          if (win) {
            win.webContents.send('navigate', 'reports');
            win.webContents.send('reports:type', 'customers');
          }
        }
      }
    ]
  },
  {
    label: 'Help',
    submenu: [
      // {
      //   label: 'Keyboard Shortcuts',
      //   accelerator: 'CmdOrCtrl+/',
      //   click: () => {
      //     const win = BrowserWindow.getAllWindows()[0];
      //     if (win) win.webContents.send('show:shortcuts');
      //   }
      // },
      { type: 'separator' },
      {
        label: 'Documentation',
        click: () => shell.openExternal('https://xnoll.com/xnoll-booking-desktop/docs')
      },
      {
        label: 'Open Website',
        click: () => shell.openExternal('https://xnoll.com')
      },
      {
        label: 'Report Issue',
        click: () => shell.openExternal('https://xnoll.com/support')
      },
      { type: 'separator' },
      {
        label: 'About Xnoll Desktop',
        click: () => {
          dialog.showMessageBox({
            type: 'info',
            title: 'About Xnoll Booking Desktop',
            message: 'Xnoll Booking Desktop',
            detail: `Version: 1.0.0\nOffline-first booking and appointment system\n\n© 2024 Xnoll. All rights reserved.`,
            buttons: ['OK']
          });
        }
      }
    ]
  }
];

module.exports = Menu.buildFromTemplate(template);