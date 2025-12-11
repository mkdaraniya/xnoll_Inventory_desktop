import React from "react";
import { useTranslation } from "../../i18n/i18nContext";

const Sidebar = ({ activePage, setActivePage }) => {
  const { t } = useTranslation();

  const itemClass = (key) =>
    "list-group-item list-group-item-action border-0 rounded-0 " +
    (activePage === key ? "active" : "");

  return (
    <aside className="sidebar border-end bg-white">
      <div className="p-3 border-bottom">
        <h6 className="mb-0 text-primary fw-bold">Xnoll Menu</h6>
        <small className="text-muted">{t('nav.quickAccess', 'Quick access')}</small>
      </div>
      <div className="list-group list-group-flush">
        <button
          className={itemClass("dashboard")}
          onClick={() => setActivePage("dashboard")}
        >
          📊 {t('nav.dashboard')}
        </button>
        <button
          className={itemClass("calendar")}
          onClick={() => setActivePage("calendar")}
        >
          🗓️ {t('nav.calendar')}
        </button>
        <button
          className={itemClass("booking")}
          onClick={() => setActivePage("booking")}
        >
          📅 {t('nav.bookings')}
        </button>
        <button
          className={itemClass("customers")}
          onClick={() => setActivePage("customers")}
        >
          👥 {t('nav.customers')}
        </button>
        <button
          className={itemClass("products")}
          onClick={() => setActivePage("products")}
        >
          📦 {t('nav.products')}
        </button>
        <button
          className={itemClass("invoices")}
          onClick={() => setActivePage("invoices")}
        >
          🧾 {t('nav.invoices')}
        </button>
        <button
          className={itemClass("reports")}
          onClick={() => setActivePage("reports")}
        >
          📈 {t('nav.reports')}
        </button>
        <button
          className={itemClass("notes")}
          onClick={() => setActivePage("notes")}
        >
          📝 {t('nav.notes')}
        </button>

        <button
          className={itemClass("settings")}
          onClick={() => setActivePage("settings")}
        >
          ⚙️ {t('nav.settings')}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
