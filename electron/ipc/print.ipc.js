const { ipcMain, BrowserWindow, dialog } = require('electron');
const path = require('path');

ipcMain.handle('print:html', async (_event, htmlContent) => {
  try {
    // Create a new hidden browser window for printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load the HTML content
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    // Wait for content to load
    await new Promise((resolve) => {
      printWindow.webContents.once('did-finish-load', resolve);
    });

    // Print the content
    const result = await printWindow.webContents.print({}, {
      silent: false,
      printBackground: true,
      deviceName: '',
    });

    // Close the print window
    printWindow.close();

    return { success: true, result };
  } catch (error) {
    console.error('Print error:', error);
    return { success: false, error: error.message };
  }
});
