import React, { useState } from 'react';
import General from './General';
import Company from './Company';
import Tax from './Tax';
import TaxRates from './TaxRates';
import CustomFields from './CustomFields';

const tabs = [
  { key: 'general', label: 'General' },
  { key: 'company', label: 'Company' },
  { key: 'tax', label: 'Tax' },
  { key: 'tax-rates', label: 'Tax Rates' },
  // { key: 'language', label: 'Language' },
  { key: 'custom', label: 'Custom Fields' },
  // { key: 'code-generator', label: 'Code Generator' },
];

const Settings = () => {
  const [active, setActive] = useState('general');

  const renderTab = () => {
    switch (active) {
      case 'general':
        return <General />;
      case 'company':
        return <Company />;
      case 'tax':
        return <Tax />;
      case 'tax-rates':
        return <TaxRates />;
      // case 'language':
      //   return <Language />;
      case 'custom':
        return <CustomFields />;
      default:
        return <General />;
    }
  };

  return (
    <div>
      <h4 className="mb-3">Settings</h4>
      <div className="d-flex flex-wrap gap-2 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`btn btn-sm ${active === tab.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {renderTab()}
    </div>
  );
};

export default Settings;
