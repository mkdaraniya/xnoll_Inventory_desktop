import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import crypto from 'crypto';

const SECRET_KEY = "YOUR_OBFUSCATED_SECRET"; // Must match server's secret

const LicenseActivation = ({ onActivated }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState(null);
  const [machineId, setMachineId] = useState('');
  const [loading, setLoading] = useState(false);

  // Load machine ID once
  useEffect(() => {
    if (!window.xnoll) return;
    window.xnoll.licenseGetMachineId().then(res => {
      if (res.success) setMachineId(res.machineId);
    }).catch(console.error);
  }, []);

  // Check weekly Monday API ping
  useEffect(() => {
    const tryWeeklyPing = async () => {
      if (!navigator.onLine) return;

      const lastPing = localStorage.getItem('lastWeeklyPing');
      const today = new Date();
      const dayOfWeek = today.getDay(); // 1 = Monday

      if (dayOfWeek === 1 && lastPing !== today.toDateString()) {
        try {
          if (status?.valid) {
            await fetch(`https://xnoll.com/offline-desktop/xnoll-booking/${encodeURIComponent(licenseKey)}`, {
              method: 'GET',
            });
            localStorage.setItem('lastWeeklyPing', today.toDateString());
          }
        } catch (err) {
          console.warn('Weekly API ping failed', err);
        }
      }
    };

    tryWeeklyPing();
    const interval = setInterval(tryWeeklyPing, 1000 * 60 * 60); // check hourly
    return () => clearInterval(interval);
  }, [licenseKey, status]);

  // Validate license offline
  const validateLicense = (key) => {
    try {
      const parts = key.split('-');
      if (parts.length !== 4) return false;

      const prefix = parts[0];
      const username = parts[1];
      const expiry = parts[2];
      const signature = parts[3];

      if (prefix !== 'XN') return false;

      // Check expiry
      const year = parseInt(expiry.substring(0, 4));
      const month = parseInt(expiry.substring(4, 6)) - 1;
      const day = parseInt(expiry.substring(6, 8));
      const expiryDate = new Date(year, month, day);
      if (new Date() > expiryDate) return false;

      // Check HMAC
      const raw = `${username}|${expiry}`;
      const expected = crypto.createHmac('sha256', SECRET_KEY).update(raw).digest('hex').substring(0, 16);

      return expected === signature;
    } catch (err) {
      console.error('License validation failed', err);
      return false;
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    const key = licenseKey.trim().toUpperCase();
    if (!key) return;

    setLoading(true);
    const valid = validateLicense(key);

    if (valid) {
      setStatus({ valid: true, licenseKey: key });
      localStorage.setItem('activatedLicense', key);

      if (onActivated) onActivated({ licenseKey: key });
    } else {
      setStatus({ valid: false, error: 'Invalid or expired license' });
    }

    setLoading(false);
  };

  const handleLicenseKeyChange = (e) => {
    const value = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const formatted = value.match(/.{1,4}/g)?.join('-') || '';
    setLicenseKey(formatted);
  };

  // Load saved license on startup
  useEffect(() => {
    const saved = localStorage.getItem('activatedLicense');
    if (saved) setLicenseKey(saved);
    if (saved && validateLicense(saved)) setStatus({ valid: true, licenseKey: saved });
  }, []);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-lg border-0">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h3 className="fw-bold">License Activation</h3>
                  <p className="text-muted">Enter your activation key to unlock the software.</p>
                </div>

                <form onSubmit={handleActivate}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">License Key *</label>
                    <input
                      type="text"
                      className={`form-control form-control-lg text-center font-monospace ${status?.valid === false ? 'is-invalid' : ''}`}
                      placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                      value={licenseKey}
                      onChange={handleLicenseKeyChange}
                      maxLength={24}
                      disabled={loading}
                      autoFocus
                      style={{ letterSpacing: '0.1em' }}
                    />
                    {status?.valid === false && <div className="invalid-feedback">{status.error}</div>}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Machine ID</label>
                    <div className="input-group">
                      <input type="text" className="form-control font-monospace bg-light" value={machineId} readOnly />
                      <button type="button" className="btn btn-outline-secondary" onClick={() => { navigator.clipboard.writeText(machineId); alert('Copied!'); }}>Copy</button>
                    </div>
                    <small className="text-muted">Share this ID when requesting a license</small>
                  </div>

                  <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
                    {loading ? 'Checking...' : 'Activate'}
                  </Button>
                </form>

                {status?.valid && (
                  <div className="alert alert-success mt-3">
                    License activated successfully.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseActivation;
