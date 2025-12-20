import React, { useState } from 'react';
import General from './General';
import Company from './Company';
import Language from './Language';
import CustomFields from './CustomFields';
import CodeGenerator from './CodeGenerator';

const tabs = [
  { key: 'general', label: 'General' },
  { key: 'company', label: 'Company' },
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
      // case 'language':
      //   return <Language />;
      case 'custom':
        return <CustomFields />;
      case 'code-generator':
        return <CodeGenerator />;
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
