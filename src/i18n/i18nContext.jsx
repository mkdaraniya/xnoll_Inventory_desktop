import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from './translations';

const I18nContext = createContext();

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
};

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    // Load saved language from localStorage
    const savedLang = localStorage.getItem('app_language');
    if (savedLang && translations[savedLang]) {
      setLanguage(savedLang);
    }
  }, []);

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
      localStorage.setItem('app_language', lang);
      // Also save to settings if available
      if (window.xnoll) {
        window.xnoll.settingsSave({ language: lang });
      }
    }
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        // Fallback to English
        value = translations.en;
        for (const k2 of keys) {
          if (value && value[k2]) {
            value = value[k2];
          } else {
            return key; // Return key if not found
          }
        }
        break;
      }
    }

    // Replace parameters
    if (typeof value === 'string') {
      Object.keys(params).forEach((param) => {
        value = value.replace(`{{${param}}}`, params[param]);
      });
    }

    return value || key;
  };

  const availableLanguages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' }
  ];

  return (
    <I18nContext.Provider
      value={{
        language,
        changeLanguage,
        t,
        availableLanguages
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};