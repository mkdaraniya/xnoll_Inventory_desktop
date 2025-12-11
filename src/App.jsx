import React, { useState, useEffect } from "react";
import { I18nProvider } from "./i18n/i18nContext";
import LicenseActivation from "./pages/License/Activation";
import TopBar from "./components/layout/TopBar.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";

import Dashboard from "./pages/Dashboard/index.jsx";
import Customers from "./pages/Customers/index.jsx";
import Products from "./pages/Products/index.jsx";
import Booking from "./pages/Booking/index.jsx";
import Invoices from "./pages/Invoices/index.jsx";
import Settings from "./pages/Settings/index.jsx";
import Reports from "./pages/Reports/index.jsx";
import Notes from "./pages/Notes/index.jsx";
import CalendarPage from "./pages/Calendar/index.jsx";

const AppContent = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const env = import.meta.env.VITE_APP_ENV || "production";

  useEffect(() => {
    if (!window.xnoll) return;
    const cleanup = window.xnoll.onNavigate((page) => setActivePage(page));
    return cleanup; // Cleanup function
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "customers":
        return <Customers />;
      case "products":
        return <Products />;
      case "booking":
        return <Booking />;
      case "invoices":
        return <Invoices />;
      case "reports":
        return <Reports />;
      case "calendar":
        return <CalendarPage />;
      case "notes":
        return <Notes />;
      case "settings":
        return <Settings />;
      case "dashboard":
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-root">
      <TopBar env={env} onNavigate={setActivePage} />
      <div className="d-flex app-body">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="app-main flex-grow-1 p-3">{renderPage()}</main>
      </div>
    </div>
  );
};

const App = () => {
  const [licenseValid, setLicenseValid] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    // Skip license check for now - enable after full development
    console.log('License check disabled for development');
    setLicenseValid(true);
    setChecking(false);
    return;

    // Original license check code (commented out for now)
    /*
    const isDev = import.meta.env.MODE === 'development';
    
    if (isDev) {
      console.log('Development mode: Skipping license check');
      setLicenseValid(true);
      setChecking(false);
      return;
    }

    if (!window.xnoll) {
      console.error('Xnoll API not available');
      setLicenseValid(false);
      setChecking(false);
      return;
    }

    try {
      const result = await window.xnoll.licenseCheck();
      setLicenseValid(result.valid);
      setChecking(false);

      if (!result.valid) {
        console.log("License invalid:", result.error);
      } else {
        console.log("License valid. Days remaining:", result.daysRemaining);
      }
    } catch (error) {
      console.error('License check failed:', error);
      setLicenseValid(false);
      setChecking(false);
    }
    */
  };

  const handleLicenseActivated = () => {
    setLicenseValid(true);
  };

  if (checking) {
    return (
      <I18nProvider>
        <div className="min-vh-100 d-flex align-items-center justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </I18nProvider>
    );
  }

  if (!licenseValid) {
    return (
      <I18nProvider>
        <LicenseActivation onActivated={handleLicenseActivated} />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
};

export default App;