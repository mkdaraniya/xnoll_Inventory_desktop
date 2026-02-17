import React, { useEffect, useState } from 'react';
import { confirmAction, ensureSuccess, notifyError, notifySuccess } from '../../utils/feedback';

const EMPTY_FORM = {
  id: null,
  name: '',
  rate: '0',
  is_active: 1,
  is_default: 0,
};

const TaxRates = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const result = ensureSuccess(await window.xnoll.taxRatesList(), 'Unable to load tax rates.');
      setRows(result.rows || []);
    } catch (err) {
      notifyError(err, 'Unable to load tax rates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => setForm(EMPTY_FORM);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const name = String(form.name || '').trim();
    const rate = Number(form.rate || 0);
    if (!name) return notifyError('Tax name is required.');
    if (!Number.isFinite(rate) || rate < 0) return notifyError('Tax rate must be 0 or greater.');

    setSaving(true);
    try {
      const payload = {
        id: form.id,
        name,
        rate,
        is_active: form.is_active ? 1 : 0,
        is_default: form.is_default ? 1 : 0,
      };
      if (form.id) {
        ensureSuccess(await window.xnoll.taxRatesUpdate(payload), 'Unable to update tax rate.');
        notifySuccess('Tax rate updated.');
      } else {
        ensureSuccess(await window.xnoll.taxRatesCreate(payload), 'Unable to create tax rate.');
        notifySuccess('Tax rate created.');
      }
      resetForm();
      await load();
    } catch (err) {
      notifyError(err, 'Unable to save tax rate.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setForm({
      id: row.id,
      name: row.name || '',
      rate: String(row.rate ?? 0),
      is_active: row.is_active ? 1 : 0,
      is_default: row.is_default ? 1 : 0,
    });
  };

  const handleDelete = async (id) => {
    if (!window.xnoll) return;
    const ok = await confirmAction({
      title: 'Delete tax rate?',
      text: 'This tax rate will be removed.',
      confirmButtonText: 'Delete',
      icon: 'warning',
    });
    if (!ok) return;

    setSaving(true);
    try {
      ensureSuccess(await window.xnoll.taxRatesDelete(id), 'Unable to delete tax rate.');
      notifySuccess('Tax rate deleted.');
      if (Number(form.id || 0) === Number(id)) resetForm();
      await load();
    } catch (err) {
      notifyError(err, 'Unable to delete tax rate.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        <h6 className="mb-3">Tax Rates</h6>
        <form onSubmit={handleSubmit} className="row g-2 mb-3">
          <div className="col-md-4">
            <label className="form-label small mb-0">Tax Name *</label>
            <input
              className="form-control form-control-sm"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              disabled={saving}
              placeholder="GST 18%"
            />
          </div>
          <div className="col-md-2">
            <label className="form-label small mb-0">Rate (%) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control form-control-sm"
              value={form.rate}
              onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
              disabled={saving}
            />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <div className="form-check form-switch ui-switch m-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="taxRateActive"
                checked={!!form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked ? 1 : 0 }))}
                disabled={saving}
              />
              <label className="form-check-label" htmlFor="taxRateActive">Active</label>
            </div>
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <div className="form-check form-switch ui-switch m-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="taxRateDefault"
                checked={!!form.is_default}
                onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked ? 1 : 0 }))}
                disabled={saving}
              />
              <label className="form-check-label" htmlFor="taxRateDefault">Default</label>
            </div>
          </div>
          <div className="col-md-2 d-flex align-items-end gap-2">
            <button className="btn btn-sm btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : form.id ? 'Update' : 'Add'}
            </button>
            <button className="btn btn-sm btn-outline-secondary" type="button" onClick={resetForm} disabled={saving}>
              Reset
            </button>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th>Name</th>
                <th style={{ width: 140 }} className="text-end">Rate (%)</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 120 }}>Default</th>
                <th style={{ width: 140 }} className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td className="text-end">{Number(row.rate || 0).toFixed(2)}</td>
                  <td>{row.is_active ? 'Active' : 'Inactive'}</td>
                  <td>{row.is_default ? 'Yes' : 'No'}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleEdit(row)} disabled={saving}>Edit</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(row.id)} disabled={saving}>Delete</button>
                  </td>
                </tr>
              ))}
              {!loading && !(rows || []).length && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-3">No tax rates found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TaxRates;
