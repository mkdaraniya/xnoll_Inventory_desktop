import React, { useState, useEffect } from "react";
import { I18nProvider } from "./i18n/i18nContext";
import TopBar from "./components/layout/TopBar.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";

import Dashboard from "./pages/Dashboard/index.jsx";
import Customers from "./pages/Customers/index.jsx";
import Products from "./pages/Products/index.jsx";
import Invoices from "./pages/Invoices/index.jsx";
import Settings from "./pages/Settings/index.jsx";
import Reports from "./pages/Reports/index.jsx";
import Notes from "./pages/Notes/index.jsx";
import Suppliers from "./pages/Suppliers/index.jsx";
import Purchases from "./pages/Purchases/index.jsx";
import StockMovements from "./pages/StockMovements/index.jsx";
import Warehouses from "./pages/Warehouses/index.jsx";

const AppContent = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const navigateTo = (page) => {
    if (!page) return;
    setActivePage(page);
  };

  useEffect(() => {
    if (!window.xnoll) return;
    const cleanup = window.xnoll.onNavigate((page) => navigateTo(page));
    return cleanup; // Cleanup function
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "customers":
        return <Customers />;
      case "products":
        return <Products />;
      case "suppliers":
        return <Suppliers />;
      case "purchases":
        return <Purchases />;
      case "stock":
        return <StockMovements />;
      case "warehouses":
        return <Warehouses />;
      case "invoices":
        return <Invoices />;
      case "reports":
        return <Reports />;
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
      <TopBar onNavigate={navigateTo} />
      <div className="d-flex app-body">
        <Sidebar activePage={activePage} setActivePage={navigateTo} />
        <main className="app-main flex-grow-1 p-3">{renderPage()}</main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
};

export default App;
