import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../i18n/i18nContext';

const LanguageSwitcher = ({ className = '' }) => {
  const { language, changeLanguage, availableLanguages } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = availableLanguages.find(lang => lang.code === language);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = (langCode) => {
    changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className={`dropdown ${className}`} ref={dropdownRef}>
      <button
        className="btn btn-sm btn-outline-secondary dropdown-toggle"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
      >
        🌐 {currentLang?.nativeName || 'English'}
      </button>
      
      {isOpen && (
        <ul 
          className="dropdown-menu dropdown-menu-end show"
          style={{ position: 'absolute', right: 0 }}
        >
          {availableLanguages.map((lang) => (
            <li key={lang.code}>
              <button
                className={`dropdown-item ${lang.code === language ? 'active' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                {lang.nativeName}
                {lang.code === language && (
                  <span className="ms-2">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageSwitcher;