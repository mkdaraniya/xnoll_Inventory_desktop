// electron/utils/errorLogger.js
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, `error-${new Date().toISOString().split('T')[0]}.log`);

function logError(error, context = 'Unknown') {
  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    error: error.message || error,
    stack: error.stack
  };
  
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  console.error(`[${context}]`, error);
}

module.exports = { logError };
