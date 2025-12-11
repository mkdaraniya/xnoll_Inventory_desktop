import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button';

const BackupSettings = () => {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState([]);

  const loadBackups = async () => {
    try {
      const backups = await window.xnoll.backupList();
      setBackups(backups || []);
    } catch (err) {
      console.error('Failed to load backups:', err);
      setBackups([]);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleBackup = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    setStatus('');
    try {
      const dir = await window.xnoll.selectDirectory();
      if (!dir) {
        setLoading(false);
        return;
      }
      const res = await window.xnoll.backupCreate(dir);
      if (res?.success) {
        setStatus(`✅ Backup created successfully at ${res.backupPath || dir}`);
        loadBackups(); // Refresh backup list
      } else {
        setStatus(`❌ Backup failed: ${res?.error || 'Unknown error'}`);
      }
    } catch (err) {
      setStatus(`❌ Backup failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    setStatus('');
    try {
      const file = await window.xnoll.selectFile({
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite'] }]
      });
      if (!file) {
        setLoading(false);
        return;
      }

      // Show confirmation dialog
      const confirmed = window.confirm(
        '⚠️ Warning: Restoring from backup will replace all current data. ' +
        'Make sure you have a recent backup of your current data. Continue?'
      );

      if (!confirmed) {
        setLoading(false);
        return;
      }

      const res = await window.xnoll.backupRestore(file);
      if (res?.success) {
        setStatus('✅ Restore completed successfully. Please restart the application.');
      } else {
        setStatus(`❌ Restore failed: ${res?.error || 'Unknown error'}`);
      }
    } catch (err) {
      setStatus(`❌ Restore failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        <h6 className="mb-3">Backup & Restore</h6>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="primary" size="sm" onClick={handleBackup} disabled={loading}>
            {loading ? 'Working...' : 'Create Backup'}
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={handleRestore} disabled={loading}>
            Restore from file
          </Button>
        </div>
        <small className="text-muted d-block mt-2">
          Backups are stored locally. Keep a copy on external drive/cloud.
        </small>
        {status && <div className="alert alert-info py-2 mt-3">{status}</div>}
      </div>
    </div>
  );
};

export default BackupSettings;

