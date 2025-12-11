// electron/ipc/backup.ipc.js
const { ipcMain, app } = require('electron');
const fs = require('fs-extra');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
const dbPath = isDev
  ? path.join(__dirname, '../database/sqlite.db')
  : path.join(app.getPath('userData'), 'xnoll-offline.sqlite');

function getBackupDir() {
  const dir = path.join(app.getPath('documents'), 'XnollBackups');
  fs.ensureDirSync(dir);
  return dir;
}

ipcMain.handle('backup:create', async (_event, location) => {
  try {
    const targetDir = location || getBackupDir();
    const backupPath = path.join(targetDir, `xnoll-backup-${Date.now()}.sqlite`);
    await fs.copy(dbPath, backupPath);
    return { success: true, backupPath };
  } catch (error) {
    console.error('backup:create error', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:list', async () => {
  try {
    const dir = getBackupDir();
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sqlite'));
    return files.map((f) => {
      const full = path.join(dir, f);
      return { name: f, path: full, modified: fs.statSync(full).mtimeMs };
    });
  } catch (error) {
    console.error('backup:list error', error);
  return [];
  }
});

ipcMain.handle('backup:restore', async (_event, filePath) => {
  try {
    if (!filePath) throw new Error('No file selected');
    await fs.copy(filePath, dbPath);
    // remove shm/wal if present
    const wal = `${dbPath}-wal`;
    const shm = `${dbPath}-shm`;
    if (fs.existsSync(wal)) fs.removeSync(wal);
    if (fs.existsSync(shm)) fs.removeSync(shm);
    return { success: true };
  } catch (error) {
    console.error('backup:restore error', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:export', async () => {
  try {
    const dir = getBackupDir();
    const backupPath = path.join(dir, `xnoll-export-${Date.now()}.sqlite`);
    await fs.copy(dbPath, backupPath);
    return { success: true, backupPath };
  } catch (error) {
    console.error('backup:export error', error);
    return { success: false, error: error.message };
  }
});
