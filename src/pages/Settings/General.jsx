import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';

const GeneralSettings = () => {
  const [form, setForm] = useState({
    auto_generate_sku: 1,
    sku_prefix: 'SKU',
    currency: 'INR',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadSettings = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const result = await window.xnoll.settingsGet();
      if (result?.success && result.settings) {
        setForm((prev) => ({
          ...prev,
          ...result.settings,
        }));
      }
    } catch (err) {
      console.error('Load settings failed', err);
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
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
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

  return (
    <form onSubmit={handleSubmit} className="card shadow-sm border-0">
      <div className="card-body">
        <h6 className="mb-3">General</h6>
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="autoSku"
            name="auto_generate_sku"
            checked={!!form.auto_generate_sku}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="autoSku">
            Auto generate SKU for products/services
          </label>
        </div>
        <div className="mb-3">
          <label className="form-label small mb-0">SKU Prefix</label>
          <input
            className="form-control form-control-sm"
            name="sku_prefix"
            value={form.sku_prefix || ''}
            onChange={handleChange}
            placeholder="SKU"
          />
          <small className="text-muted">Used when auto generating SKUs.</small>
        </div>
        <div className="mb-3">
          <label className="form-label small mb-0">Currency</label>
          <select
            className="form-select form-select-sm"
            name="currency"
            value={form.currency || 'INR'}
            onChange={handleChange}
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="AUD">AUD (A$)</option>
            <option value="CAD">CAD (C$)</option>
          </select>
          <small className="text-muted">Default currency for the application.</small>
        </div>
        {message && <div className="alert alert-info py-2">{message}</div>}
        <div className="d-flex justify-content-end">
          <Button variant="primary" type="submit" disabled={loading} size="sm">
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default GeneralSettings;

