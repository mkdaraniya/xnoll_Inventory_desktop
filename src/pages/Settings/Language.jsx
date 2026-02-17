import React from 'react';
import { useTranslation } from '../../i18n/i18nContext';

const LanguageSettings = () => {
  const { language, changeLanguage, availableLanguages } = useTranslation();

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        <h6 className="mb-3">Language</h6>
        <div className="row g-3">
          {availableLanguages.map((lang) => (
            <div className="col-md-4" key={lang.code}>
              <div className={`card border ${language === lang.code ? 'border-primary' : 'border-light'}`}>
                <div className="card-body d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold">{lang.name}</div>
                    <small className="text-muted">{lang.nativeName}</small>
                  </div>
                  <input
                    type="radio"
                    name="language"
                    checked={language === lang.code}
                    onChange={() => changeLanguage(lang.code)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <small className="text-muted d-block mt-3">
          Language preference is applied instantly across the app.
        </small>
      </div>
    </div>
  );
};

export default LanguageSettings;
