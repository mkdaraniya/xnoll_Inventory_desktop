import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import { ensureSuccess, notifyError, notifySuccess } from '../../utils/feedback';
import { isNonNegativeNumber } from '../../utils/validation';

const TaxSettings = () => {
  const [form, setForm] = useState({
    enable_tax: 1,
    tax_scheme: 'simple',
    default_tax_name: 'GST',
    default_tax_rate: 0,
    default_tax_mode: 'exclusive',
    default_gst_tax_type: 'intra',
    cgst_label: 'CGST',
    sgst_label: 'SGST',
    igst_label: 'IGST',
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
      return notifyError('Tax rate must be 0 or greater.');
    }

    if (!String(form.cgst_label || '').trim()) return notifyError('CGST label is required.');
    if (!String(form.sgst_label || '').trim()) return notifyError('SGST label is required.');
    if (!String(form.igst_label || '').trim()) return notifyError('IGST label is required.');

    const decimalPlaces = Number(form.invoice_decimal_places || 2);
    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 4) {
      return notifyError('Decimal places must be between 0 and 4.');
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        default_tax_name: String(form.default_tax_name || '').trim(),
        tax_scheme: String(form.tax_scheme || 'simple').trim(),
        invoice_prefix: String(form.invoice_prefix || '').trim(),
        invoice_terms: String(form.invoice_terms || '').trim(),
        invoice_footer: String(form.invoice_footer || '').trim(),
        default_tax_rate: Number(form.default_tax_rate || 0),
        default_gst_tax_type: String(form.default_gst_tax_type || 'intra').trim(),
        cgst_label: String(form.cgst_label || '').trim(),
        sgst_label: String(form.sgst_label || '').trim(),
        igst_label: String(form.igst_label || '').trim(),
        invoice_decimal_places: Number(form.invoice_decimal_places || 2),
      };
      ensureSuccess(await window.xnoll.settingsSave(payload), 'Unable to save tax settings.');
      notifySuccess('Tax settings saved successfully.');
    } catch (err) {
      notifyError(err, 'Unable to save tax settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card shadow-sm border-0">
      <div className="card-body">
        <h6 className="mb-3">Tax</h6>
        <div className="form-check form-switch ui-switch mb-3">
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
          <div className="col-md-3">
            <label className="form-label small mb-0">Tax Scheme</label>
            <select
              className="form-select form-select-sm"
              name="tax_scheme"
              value={form.tax_scheme || 'simple'}
              onChange={handleChange}
            >
              <option value="simple">Simple Tax</option>
              <option value="gst_india">India GST (CGST/SGST/IGST)</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label small mb-0">
              {form.tax_scheme === 'gst_india' ? 'Tax Name (Display)' : 'Tax Name'}
            </label>
            <input
              className="form-control form-control-sm"
              name="default_tax_name"
              value={form.default_tax_name || 'GST'}
              onChange={handleChange}
              placeholder="GST"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-0">
              {form.tax_scheme === 'gst_india' ? 'GST Rate (%)' : 'Tax Rate (%)'}
            </label>
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
          <div className="col-md-2">
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

        {form.tax_scheme === 'gst_india' && (
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <label className="form-label small mb-0">Default GST Type</label>
              <select
                className="form-select form-select-sm"
                name="default_gst_tax_type"
                value={form.default_gst_tax_type || 'intra'}
                onChange={handleChange}
              >
                <option value="intra">Intra-state (CGST + SGST)</option>
                <option value="inter">Inter-state (IGST)</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-0">CGST Label</label>
              <input
                className="form-control form-control-sm"
                name="cgst_label"
                value={form.cgst_label || 'CGST'}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-0">SGST Label</label>
              <input
                className="form-control form-control-sm"
                name="sgst_label"
                value={form.sgst_label || 'SGST'}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-0">IGST Label</label>
              <input
                className="form-control form-control-sm"
                name="igst_label"
                value={form.igst_label || 'IGST'}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

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
            <div className="form-check form-switch ui-switch">
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
            <div className="form-check form-switch ui-switch">
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
            <div className="form-check form-switch ui-switch">
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
            <div className="form-check form-switch ui-switch">
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
            <div className="form-check form-switch ui-switch">
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
            <div className="form-check form-switch ui-switch">
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
