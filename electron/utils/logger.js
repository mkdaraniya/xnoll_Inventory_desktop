// electron/utils/logger.js
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);

function log(level, message, data = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...data
  };
  
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  console.log(`[${level.toUpperCase()}]`, message);
}

module.exports = {
  info: (msg, data) => log('info', msg, data),
  warn: (msg, data) => log('warn', msg, data),
  error: (msg, data) => log('error', msg, data),
  debug: (msg, data) => log('debug', msg, data)
};
