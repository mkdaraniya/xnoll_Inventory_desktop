import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';

const RemindersSettings = () => {
  const [form, setForm] = useState({
    enable_reminders: 0,
    reminder_lead_minutes: 30,
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadSettings = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const res = await window.xnoll.settingsGet();
      if (res?.success && res.settings) {
        setForm((prev) => ({ ...prev, ...res.settings }));
      }
    } catch (err) {
      console.error('Load reminder settings failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : Number(value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await window.xnoll.settingsSave(form);
      if (res?.success) setMessage('Saved');
      else setMessage(res?.error || 'Save failed');
    } catch (err) {
      setMessage('Save failed');
    } finally {
      setLoading(false);
    }
  };

  const runReminderCheck = async () => {
    if (!window.xnoll) return;
    await window.xnoll.remindersCheck();
    setMessage('Reminder check triggered');
  };

  return (
    <form onSubmit={handleSubmit} className="card shadow-sm border-0">
      <div className="card-body">
        <h6 className="mb-3">Reminders</h6>
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="enableReminders"
            name="enable_reminders"
            checked={!!form.enable_reminders}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="enableReminders">
            Enable local reminders
          </label>
        </div>
        <div className="mb-3">
          <label className="form-label small mb-0">Reminder lead time (minutes)</label>
          <select
            className="form-select form-select-sm"
            name="reminder_lead_minutes"
            value={form.reminder_lead_minutes}
            onChange={handleChange}
            disabled={!form.enable_reminders}
          >
            {[15, 30, 45, 60, 120].map((m) => (
              <option key={m} value={m}>
                {m} minutes before
              </option>
            ))}
          </select>
        </div>
        {message && <div className="alert alert-info py-2">{message}</div>}
        <div className="d-flex justify-content-between">
          <Button variant="outline-secondary" type="button" size="sm" onClick={runReminderCheck}>
            Test reminder check
          </Button>
          <Button variant="primary" type="submit" size="sm" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default RemindersSettings;

