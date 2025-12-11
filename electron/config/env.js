// electron/config/env.js
const path = require('path');
const { app } = require('electron');

module.exports = {
  isDev: process.env.NODE_ENV === 'development',
  dbPath: process.env.NODE_ENV === 'development' 
    ? path.join(__dirname, '..', 'database', 'sqlite.db')
    : path.join(app.getPath('userData'), 'xnoll-offline.sqlite'),
  apiBaseUrl: process.env.VITEAPIBASEURL || 'https://api.xnoll.com',
  syncEnabled: process.env.VITESYNCENABLED === 'true',
  logLevel: process.env.VITELOGLEVEL || 'info'
};
