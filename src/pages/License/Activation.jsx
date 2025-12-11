import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import { useTranslation } from '../../i18n/i18nContext';

const LicenseActivation = ({ onActivated }) => {
  const { t } = useTranslation();
  const [licenseKey, setLicenseKey] = useState('');
  const [machineId, setMachineId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedKey, setGeneratedKey] = useState(''); // For demo/testing only

  useEffect(() => {
    loadMachineId();
  }, []);

  const loadMachineId = async () => {
    if (!window.xnoll) return;
    try {
      const result = await window.xnoll.licenseGetMachineId();
      if (result.success) {
        setMachineId(result.machineId);
      }
    } catch (error) {
      console.error('Failed to get machine ID:', error);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const key = licenseKey.trim().toUpperCase();
    if (!key) {
      setError(t('errors.required'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await window.xnoll.licenseActivate(key);
      
      if (result.success) {
        // License activated successfully
        if (onActivated) {
          onActivated({
            licenseKey: key,
            expiryDate: result.expiryDate,
            daysRemaining: result.daysRemaining
          });
        }
      } else {
        setError(result.error || t('errors.invalidLicense'));
      }
    } catch (error) {
      console.error('License activation error:', error);
      setError(t('errors.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  // Demo/testing function - REMOVE IN PRODUCTION
  const handleGenerateDemo = async () => {
    if (!window.xnoll || !machineId) return;
    
    setLoading(true);
    try {
      const result = await window.xnoll.licenseGenerate({
        machineId,
        daysValid: 365
      });
      
      if (result.success) {
        setGeneratedKey(result.licenseKey);
        setLicenseKey(result.licenseKey);
      }
    } catch (error) {
      console.error('Failed to generate demo license:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLicenseKey = (value) => {
    // Remove non-alphanumeric characters
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Split into groups of 4
    const parts = [];
    for (let i = 0; i < cleaned.length && i < 20; i += 4) {
      parts.push(cleaned.substring(i, i + 4));
    }
    
    return parts.join('-');
  };

  const handleLicenseKeyChange = (e) => {
    const formatted = formatLicenseKey(e.target.value);
    setLicenseKey(formatted);
    setError('');
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-lg border-0">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <h3 className="fw-bold">{t('license.title')}</h3>
                  <p className="text-muted">
                    {t('license.enterKey')}
                  </p>
                </div>

                <form onSubmit={handleActivate}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      {t('settings.licenseKey')} *
                    </label>
                    <input
                      type="text"
                      className={`form-control form-control-lg text-center font-monospace ${
                        error ? 'is-invalid' : ''
                      }`}
                      placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                      value={licenseKey}
                      onChange={handleLicenseKeyChange}
                      maxLength={24}
                      disabled={loading}
                      autoFocus
                      style={{ letterSpacing: '0.1em' }}
                    />
                    {error && <div className="invalid-feedback">{error}</div>}
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      {t('license.machineId')}
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control font-monospace bg-light"
                        value={machineId}
                        readOnly
                        style={{ fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(machineId);
                          alert('Machine ID copied to clipboard!');
                        }}
                        title="Copy to clipboard"
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                          <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                        </svg>
                      </button>
                    </div>
                    <small className="text-muted">
                      Share this ID when requesting a license
                    </small>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    disabled={!licenseKey || loading}
                  >
                    {t('license.activate')}
                  </Button>
                </form>

                {/* Demo/Testing Section - REMOVE IN PRODUCTION */}
                <div className="mt-4 pt-4 border-top">
                  <div className="alert alert-warning d-flex align-items-center" role="alert">
                    <svg
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                      className="me-2 flex-shrink-0"
                    >
                      <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                    </svg>
                    <div>
                      <strong>Demo Mode</strong>
                      <p className="mb-0 small">Click below to generate a test license (365 days)</p>
                    </div>
                  </div>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    fullWidth
                    onClick={handleGenerateDemo}
                    disabled={loading}
                  >
                    Generate Demo License
                  </Button>
                  {generatedKey && (
                    <div className="alert alert-success mt-2 mb-0">
                      <small className="font-monospace">{generatedKey}</small>
                    </div>
                  )}
                </div>

                <div className="text-center mt-4">
                  <small className="text-muted">
                    {t('license.contactSupport')}
                    <br />
                    <a href="mailto:support@xnoll.com">support@xnoll.com</a>
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseActivation;