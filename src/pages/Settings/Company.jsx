import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';

const empty = {
  name: '',
  address: '',
  phone: '',
  email: '',
  tax_id: '',
  website: '',
};

const CompanySettings = () => {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadCompany = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const res = await window.xnoll.companyGet();
      if (res?.success && res.company) {
        setForm({
          name: res.company.name || '',
          address: res.company.address || '',
          phone: res.company.phone || '',
          email: res.company.email || '',
          website: res.company.website || '',
          tax_id: res.company.tax_id || '',
          logo_path: res.company.logo_path || ''
        });
      }
    } catch (err) {
      console.error('Load company failed', err);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await window.xnoll.companySave(form);
      if (res?.success) {
        setMessage('Saved');
      } else {
        setMessage(res?.error || 'Save failed');
      }
    } catch (err) {
      setMessage('Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card shadow-sm border-0">
      <div className="card-body">
        <h6 className="mb-3">Company / Organization Profile</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small mb-0">Name *</label>
            <input
              className="form-control form-control-sm"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small mb-0">Phone</label>
            <input
              className="form-control form-control-sm"
              name="phone"
              value={form.phone}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small mb-0">Email</label>
            <input
              type="email"
              className="form-control form-control-sm"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small mb-0">Website</label>
            <input
              className="form-control form-control-sm"
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label small mb-0">Tax ID</label>
            <input
              className="form-control form-control-sm"
              name="tax_id"
              value={form.tax_id}
              onChange={handleChange}
            />
          </div>
          <div className="col-12">
            <label className="form-label small mb-0">Address</label>
            <textarea
              className="form-control form-control-sm"
              rows="3"
              name="address"
              value={form.address}
              onChange={handleChange}
            />
          </div>
        </div>
        {message && <div className="alert alert-info py-2 mt-3">{message}</div>}
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

