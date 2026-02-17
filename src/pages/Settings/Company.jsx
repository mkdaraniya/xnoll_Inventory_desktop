import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import { ensureSuccess, notifyError, notifySuccess } from '../../utils/feedback';
import { isValidEmail, isValidGSTIN, isValidPAN, isValidPhone } from '../../utils/validation';

const empty = {
  name: '',
  legal_name: '',
  contact_person: '',
  phone: '',
  email: '',
  website: '',
  tax_id: '',
  gstin: '',
  pan: '',
  state_code: '',
  business_registration_no: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  bank_name: '',
  bank_account_number: '',
  bank_ifsc: '',
  bank_branch: '',
  logo: '',
};

const CompanySettings = () => {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

  const loadCompany = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const res = await window.xnoll.companyGet();
      if (res?.success && res.company) {
        setForm((prev) => ({
          ...prev,
          ...res.company,
        }));
      }
    } catch (err) {
      notifyError(err, 'Unable to load company details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompany();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validateForm = () => {
    if (!String(form.name || '').trim()) return 'Company name is required.';
    if (!isValidPhone(form.phone)) return 'Please enter a valid phone number.';
    if (!isValidEmail(form.email)) return 'Please enter a valid email address.';
    if (!isValidGSTIN(form.gstin)) return 'Please enter a valid GSTIN.';
    if (!isValidPAN(form.pan)) return 'Please enter a valid PAN.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const validationMessage = validateForm();
    if (validationMessage) {
      return notifyError(validationMessage);
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        name: String(form.name || '').trim(),
        legal_name: String(form.legal_name || '').trim(),
        contact_person: String(form.contact_person || '').trim(),
        phone: String(form.phone || '').trim(),
        email: String(form.email || '').trim(),
        website: String(form.website || '').trim(),
        tax_id: String(form.tax_id || '').trim(),
        state_code: String(form.state_code || '').trim(),
        business_registration_no: String(form.business_registration_no || '').trim(),
        address: String(form.address || '').trim(),
        city: String(form.city || '').trim(),
        state: String(form.state || '').trim(),
        postal_code: String(form.postal_code || '').trim(),
        country: String(form.country || '').trim(),
        bank_name: String(form.bank_name || '').trim(),
        bank_account_number: String(form.bank_account_number || '').trim(),
        bank_ifsc: String(form.bank_ifsc || '').trim(),
        bank_branch: String(form.bank_branch || '').trim(),
        gstin: String(form.gstin || '').trim().toUpperCase(),
        pan: String(form.pan || '').trim().toUpperCase(),
      };
      ensureSuccess(await window.xnoll.companySave(payload), 'Unable to save company details.');
      notifySuccess('Company details saved successfully.');
    } catch (err) {
      notifyError(err, 'Unable to save company details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card shadow-sm border-0">
      <div className="card-body">
        <h6 className="mb-3">Company Profile</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small mb-0">Display Name *</label>
            <input
              className="form-control form-control-sm"
              name="name"
              value={form.name || ''}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small mb-0">Legal Name</label>
            <input
              className="form-control form-control-sm"
              name="legal_name"
              value={form.legal_name || ''}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small mb-0">Contact Person</label>
            <input
              className="form-control form-control-sm"
              name="contact_person"
              value={form.contact_person || ''}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small mb-0">Phone</label>
            <input
              className="form-control form-control-sm"
              name="phone"
              value={form.phone || ''}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small mb-0">Email</label>
            <input
              type="email"
              className="form-control form-control-sm"
              name="email"
              value={form.email || ''}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small mb-0">Website</label>
            <input
              className="form-control form-control-sm"
              name="website"
              value={form.website || ''}
              onChange={handleChange}
              placeholder="https://"
            />
          </div>

          <div className="col-md-3">
            <label className="form-label small mb-0">GSTIN</label>
            <input
              className="form-control form-control-sm"
              name="gstin"
              value={form.gstin || ''}
              onChange={handleChange}
              placeholder="27ABCDE1234F1Z5"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-0">PAN</label>
            <input
              className="form-control form-control-sm"
              name="pan"
              value={form.pan || ''}
              onChange={handleChange}
              placeholder="ABCDE1234F"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-0">State Code</label>
            <input
              className="form-control form-control-sm"
              name="state_code"
              value={form.state_code || ''}
              onChange={handleChange}
              placeholder="27"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-0">Tax ID</label>
            <input
              className="form-control form-control-sm"
              name="tax_id"
              value={form.tax_id || ''}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small mb-0">Business Registration No.</label>
            <input
              className="form-control form-control-sm"
              name="business_registration_no"
              value={form.business_registration_no || ''}
              onChange={handleChange}
            />
          </div>

          <div className="col-12">
            <label className="form-label small mb-0">Address</label>
            <textarea
              className="form-control form-control-sm"
              rows="2"
              name="address"
              value={form.address || ''}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-0">City</label>
            <input
              className="form-control form-control-sm"
              name="city"
              value={form.city || ''}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-0">State</label>
            <input
              className="form-control form-control-sm"
              name="state"
              value={form.state || ''}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-0">Postal Code</label>
            <input
              className="form-control form-control-sm"
              name="postal_code"
              value={form.postal_code || ''}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-0">Country</label>
            <input
              className="form-control form-control-sm"
              name="country"
              value={form.country || ''}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-4">
            <label className="form-label small mb-0">Bank Name</label>
            <input
              className="form-control form-control-sm"
              name="bank_name"
              value={form.bank_name || ''}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small mb-0">Bank Account Number</label>
            <input
              className="form-control form-control-sm"
              name="bank_account_number"
              value={form.bank_account_number || ''}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small mb-0">IFSC</label>
            <input
              className="form-control form-control-sm"
              name="bank_ifsc"
              value={form.bank_ifsc || ''}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label small mb-0">Bank Branch</label>
            <input
              className="form-control form-control-sm"
              name="bank_branch"
              value={form.bank_branch || ''}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="d-flex justify-content-end mt-2">
          <Button variant="primary" type="submit" disabled={loading} size="sm">
            {loading ? 'Saving...' : 'Save Company'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default CompanySettings;
