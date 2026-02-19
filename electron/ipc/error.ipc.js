// electron/ipc/error.ipc.js
const { ipcMain } = require('electron');
const { logError } = require('../utils/errorLogger');

function normalizeErrorPayload(errorData) {
  const safeContext = String(errorData?.context || "renderer").slice(0, 120);
  const rawError = errorData?.error;
  const message =
    typeof rawError === "string"
      ? rawError
      : rawError?.message || JSON.stringify(rawError || "Unknown error");
  return {
    context: safeContext,
    error: String(message || "Unknown error").slice(0, 4000),
  };
}

async function handleErrorReport(_event, errorData) {
  try {
    const payload = normalizeErrorPayload(errorData);
    logError(payload.error, payload.context);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

ipcMain.handle("error:report", handleErrorReport);
// Backward-compatible alias
ipcMain.handle("errorReport", handleErrorReport);
