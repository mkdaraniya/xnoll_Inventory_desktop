import React, { useEffect, useState } from 'react';
import Button from '../../components/common/Button';

const LicenseSettings = () => {
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  const check = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const res = await window.xnoll.licenseCheck();
      setStatus(res);
    } catch (err) {
      setStatus({ valid: false, error: 'Check failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check();
  }, []);

  const activate = async (e) => {
    e.preventDefault();
    if (!window.xnoll || !licenseKey.trim()) return;
    setLoading(true);
    try {
      const res = await window.xnoll.licenseActivate(licenseKey.trim());
      if (res?.success) {
        setStatus({ valid: true, licenseKey: licenseKey.trim(), daysRemaining: res.daysRemaining });
        if (consent && navigator.onLine) {
          try {
            await fetch(`https://xnoll.com/offline-desktop/xnoll-booking/${encodeURIComponent(licenseKey.trim())}`, {
              method: 'GET',
            });
          } catch (err) {
            console.warn('Optional server check failed', err);
          }
        }
      } else {
        setStatus({ valid: false, error: res?.error || 'Invalid license' });
      }
    } catch (err) {
      setStatus({ valid: false, error: 'Activation failed' });
    } finally {
      setLoading(false);
    }
  };

  const deactivate = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      await window.xnoll.licenseDeactivate();
      setStatus({ valid: false, error: 'Not activated' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        <h6 className="mb-3">License Activation</h6>
        <form className="row g-2" onSubmit={activate}>
          <div className="col-md-8">
            <input
              className="form-control form-control-sm"
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              required
            />
          </div>
          <div className="col-md-4 d-flex gap-2">
            <Button variant="primary" type="submit" size="sm" disabled={loading}>
              {loading ? 'Checking...' : 'Activate'}
            </Button>
            <Button variant="outline-secondary" type="button" size="sm" onClick={check} disabled={loading}>
              Refresh
            </Button>
          </div>
        </form>
        <div className="form-check form-check-inline mt-2">
          <input
            className="form-check-input"
            type="checkbox"
            id="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="consent">
            If online, allow validation ping to xnoll.com
          </label>
        </div>
        <div className="mt-3">
          {status?.valid ? (
            <div className="alert alert-success py-2 mb-2">
              Activated. Days remaining: {status.daysRemaining ?? '-'}
            </div>
          ) : (
            <div className="alert alert-warning py-2 mb-2">
              {status?.error || 'Not activated'}
            </div>
          )}
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" size="sm" onClick={deactivate} disabled={loading}>
              Deactivate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseSettings;

