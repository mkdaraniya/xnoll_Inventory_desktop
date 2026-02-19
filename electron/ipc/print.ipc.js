const { ipcMain, BrowserWindow } = require("electron");

ipcMain.handle("print:html", async (_event, htmlContent) => {
  try {
    const safeHtml = String(htmlContent || "");
    if (!safeHtml.trim()) throw new Error("Print content is empty");
    if (safeHtml.length > 1_000_000) {
      throw new Error("Print content too large");
    }

    // Create a new hidden browser window for printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        javascript: true,
      },
    });

    printWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    printWindow.webContents.on("will-navigate", (event) => event.preventDefault());

    // Load the HTML content
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(safeHtml)}`);

    // Wait for content to load
    await new Promise((resolve) => {
      printWindow.webContents.once("did-finish-load", resolve);
    });

    // Print the content
    const result = await printWindow.webContents.print({}, {
      silent: false,
      printBackground: true,
      deviceName: "",
    });

    // Close the print window
    printWindow.close();

    return { success: true, result };
  } catch (error) {
    console.error("Print error:", error);
    return { success: false, error: error.message };
  }
});
