import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import { ensureSuccess, notifyError, notifySuccess } from '../../utils/feedback';
import { validateRequiredFields } from '../../utils/validation';

const GeneralSettings = () => {
  const [form, setForm] = useState({
    auto_generate_sku: 1,
    sku_prefix: 'SKU',
    currency: 'INR',
    enable_lot_tracking: 1,
    enable_batch_tracking: 0,
    enable_expiry_tracking: 1,
    enable_manufacture_date: 0,
  });
  const [loading, setLoading] = useState(false);
  const loadSettings = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const result = await window.xnoll.settingsGet();
      if (result?.success && result.settings) {
        setForm((prev) => ({
          ...prev,
          auto_generate_sku: result.settings.auto_generate_sku ? 1 : 0,
          sku_prefix: result.settings.sku_prefix || 'SKU',
          currency: result.settings.currency || 'INR',
          enable_lot_tracking: result.settings.enable_lot_tracking ? 1 : 0,
          enable_batch_tracking: result.settings.enable_batch_tracking ? 1 : 0,
          enable_expiry_tracking: result.settings.enable_expiry_tracking ? 1 : 0,
          enable_manufacture_date: result.settings.enable_manufacture_date ? 1 : 0,
        }));
      }
    } catch (err) {
      notifyError(err, 'Unable to load settings.');
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
    const validationError = validateRequiredFields(
      { sku_prefix: form.sku_prefix },
      { sku_prefix: 'SKU Prefix' }
    );
    if (validationError) {
      setLoading(false);
      return notifyError(validationError);
    }
    try {
      const lotEnabled = !!form.enable_lot_tracking;
      const payload = {
        ...form,
        sku_prefix: String(form.sku_prefix || "").trim(),
        enable_lot_tracking: lotEnabled ? 1 : 0,
        enable_batch_tracking: lotEnabled && form.enable_batch_tracking ? 1 : 0,
        enable_expiry_tracking: lotEnabled && form.enable_expiry_tracking ? 1 : 0,
        enable_manufacture_date: lotEnabled && form.enable_manufacture_date ? 1 : 0,
      };
      ensureSuccess(await window.xnoll.settingsSave(payload), 'Unable to save settings.');
      notifySuccess('Settings saved successfully.');
    } catch (err) {
      notifyError(err, 'Unable to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card shadow-sm border-0">
      <div className="card-body">
        <h6 className="mb-3">General</h6>
        <div className="form-check form-switch ui-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="autoSku"
            name="auto_generate_sku"
            checked={!!form.auto_generate_sku}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="autoSku">
            Auto generate SKU
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
        </div>
        <hr />
        <h6 className="mb-3">Inventory Features</h6>
        <div className="form-check form-switch ui-switch mb-2">
          <input
            className="form-check-input"
            type="checkbox"
            id="enableLotTracking"
            name="enable_lot_tracking"
            checked={!!form.enable_lot_tracking}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="enableLotTracking">
            Enable Lot/Bin tracking in inventory
          </label>
        </div>
        <div className="form-check form-switch ui-switch mb-2">
          <input
            className="form-check-input"
            type="checkbox"
            id="enableBatchTracking"
            name="enable_batch_tracking"
            checked={!!form.enable_batch_tracking}
            onChange={handleChange}
            disabled={!form.enable_lot_tracking}
          />
          <label className="form-check-label" htmlFor="enableBatchTracking">
            Use Batch label (instead of Lot)
          </label>
        </div>
        <div className="form-check form-switch ui-switch mb-2">
          <input
            className="form-check-input"
            type="checkbox"
            id="enableExpiryTracking"
            name="enable_expiry_tracking"
            checked={!!form.enable_expiry_tracking}
            onChange={handleChange}
            disabled={!form.enable_lot_tracking}
          />
          <label className="form-check-label" htmlFor="enableExpiryTracking">
            Enable Expiry tracking
          </label>
        </div>
        <div className="form-check form-switch ui-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="enableMfgDate"
            name="enable_manufacture_date"
            checked={!!form.enable_manufacture_date}
            onChange={handleChange}
            disabled={!form.enable_lot_tracking}
          />
          <label className="form-check-label" htmlFor="enableMfgDate">
            Enable Manufacture date
          </label>
        </div>
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
