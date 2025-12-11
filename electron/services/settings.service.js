// electron/services/settings.service.js
const path = require('path');
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const isDev = process.env.NODE_ENV === 'development';

const dbPath = isDev
  ? path.join(__dirname, '../database/sqlite.db')
  : path.join(app.getPath('userData'), 'xnoll-offline.sqlite');

  const db = new Database(dbPath);

class SettingsService {
  /**
   * Get all settings
   */
  getSettings() {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
        if (err) return reject(err);
        resolve(row || {});
      });
    });
  }

  /**
   * Update settings
   */
  updateSettings(settings) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];

      // Build dynamic SQL based on provided fields
      Object.keys(settings).forEach(key => {
        if (key !== 'id' && key !== 'created_at') {
          fields.push(`${key} = ?`);
          values.push(settings[key]);
        }
      });

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(1); // id

      const sql = `UPDATE settings SET ${fields.join(', ')} WHERE id = ?`;

      db.run(sql, values, function(err) {
        if (err) return reject(err);
        resolve({ success: true, changes: this.changes });
      });
    });
  }

  /**
   * Get specific setting by key
   */
  getSetting(key) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT ${key} FROM settings WHERE id = 1`, (err, row) => {
        if (err) return reject(err);
        resolve(row ? row[key] : null);
      });
    });
  }

  /**
   * Update specific setting
   */
  updateSetting(key, value) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE settings SET ${key} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`;
      
      db.run(sql, [value], function(err) {
        if (err) return reject(err);
        resolve({ success: true, changes: this.changes });
      });
    });
  }
}

module.exports = new SettingsService();