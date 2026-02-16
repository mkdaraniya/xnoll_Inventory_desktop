import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import { notifyError } from '../../utils/feedback';
import { isNonNegativeNumber } from '../../utils/validation';

const TaxSettings = () => {
  const [form, setForm] = useState({
    enable_tax: 1,
    default_tax_name: 'GST',
    default_tax_rate: 0,
    default_tax_mode: 'exclusive',
    invoice_prefix: 'INV',
    invoice_terms: '',
    invoice_footer: 'Thank you for your business!',
    invoice_show_company_address: 1,
    invoice_show_company_phone: 1,
    invoice_show_company_email: 1,
    invoice_show_company_tax_id: 1,
    invoice_show_due_date: 1,
    invoice_show_notes: 1,
    invoice_decimal_places: 2,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadSettings = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const result = await window.xnoll.settingsGet();
      if (result?.success && result.settings) {
        setForm((prev) => ({ ...prev, ...result.settings }));
      }
    } catch (err) {
      notifyError(err, 'Unable to load tax settings.');
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

    const taxRate = Number(form.default_tax_rate || 0);
    if (!isNonNegativeNumber(taxRate)) {
      setMessage('Tax rate must be 0 or greater.');
      return;
    }

    const decimalPlaces = Number(form.invoice_decimal_places || 2);
    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 4) {
      setMessage('Decimal places must be between 0 and 4.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await window.xnoll.settingsSave(form);
      if (res?.success) setMessage('Saved');
      else setMessage(res?.error || 'Save failed');
    } catch (err) {
      notifyError(err, 'Unable to save tax settings.');
      setMessage('Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card shadow-sm border-0">
      <div className="card-body">
        <h6 className="mb-3">Tax</h6>
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="enableTax"
            name="enable_tax"
            checked={!!form.enable_tax}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="enableTax">
            Enable tax on invoices
          </label>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <label className="form-label small mb-0">Tax Name</label>
            <input
              className="form-control form-control-sm"
              name="default_tax_name"
              value={form.default_tax_name || 'GST'}
              onChange={handleChange}
              placeholder="GST"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small mb-0">Tax Rate (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control form-control-sm"
              name="default_tax_rate"
              value={form.default_tax_rate}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small mb-0">Tax Mode</label>
            <select
              className="form-select form-select-sm"
              name="default_tax_mode"
              value={form.default_tax_mode || 'exclusive'}
              onChange={handleChange}
            >
              <option value="exclusive">Add tax over price</option>
              <option value="inclusive">Tax included in price</option>
              <option value="none">No tax</option>
            </select>
          </div>
        </div>

        <hr />
        <h6 className="mb-3">Invoice</h6>

        <div className="row g-3 mb-3">
          <div className="col-md-3">
            <label className="form-label small mb-0">Invoice Prefix</label>
            <input
              className="form-control form-control-sm"
              name="invoice_prefix"
              value={form.invoice_prefix || 'INV'}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-0">Decimal Places</label>
            <input
              type="number"
              min="0"
              max="4"
              className="form-control form-control-sm"
              name="invoice_decimal_places"
              value={form.invoice_decimal_places}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label small mb-0">Invoice Terms</label>
          <textarea
            className="form-control form-control-sm"
            rows="2"
            name="invoice_terms"
            value={form.invoice_terms || ''}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label className="form-label small mb-0">Invoice Footer</label>
          <textarea
            className="form-control form-control-sm"
            rows="2"
            name="invoice_footer"
            value={form.invoice_footer || ''}
            onChange={handleChange}
          />
        </div>

        <div className="row g-2 mb-2">
          <div className="col-md-4">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="showAddress"
                name="invoice_show_company_address"
                checked={!!form.invoice_show_company_address}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="showAddress">Show company address</label>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="showPhone"
                name="invoice_show_company_phone"
                checked={!!form.invoice_show_company_phone}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="showPhone">Show company phone</label>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="showEmail"
                name="invoice_show_company_email"
                checked={!!form.invoice_show_company_email}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="showEmail">Show company email</label>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="showTaxId"
                name="invoice_show_company_tax_id"
                checked={!!form.invoice_show_company_tax_id}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="showTaxId">Show tax details</label>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="showDueDate"
                name="invoice_show_due_date"
                checked={!!form.invoice_show_due_date}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="showDueDate">Show due date</label>
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="showNotes"
                name="invoice_show_notes"
                checked={!!form.invoice_show_notes}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="showNotes">Show notes</label>
            </div>
          </div>
        </div>

        {message && <div className="alert alert-info py-2">{message}</div>}

        <div className="d-flex justify-content-end">
          <Button variant="primary" type="submit" disabled={loading} size="sm">
            {loading ? 'Saving...' : 'Save Tax Settings'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default TaxSettings;
