import React, { useEffect, useState } from "react";
import UnifiedLoader from "../../components/common/UnifiedLoader";

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    products: 0,
    warehouses: 0,
    suppliers: 0,
    lowStock: 0,
    expiringLots: 0,
    stockValue: 0,
  });
  const [lowStockRows, setLowStockRows] = useState([]);
  const [expiringRows, setExpiringRows] = useState([]);
  const [featureSettings, setFeatureSettings] = useState({
    enable_lot_tracking: 1,
    enable_batch_tracking: 0,
    enable_expiry_tracking: 1,
  });

  const loadData = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const [products, warehouses, suppliers, alerts, valuation, settingsRes] = await Promise.all([
        window.xnoll.productsList(),
        window.xnoll.warehousesList(),
        window.xnoll.suppliersList(),
        window.xnoll.inventoryReorderAlerts({ limit: 300 }),
        window.xnoll.inventoryValuationReport({ limit: 500 }),
        window.xnoll.settingsGet(),
      ]);

      const lowStock = alerts?.lowStock || [];
      const expiringLots = alerts?.expiringLots || [];
      const stockValue = (valuation || []).reduce((sum, row) => sum + Number(row.stock_value || 0), 0);

      setStats({
        products: (products || []).length,
        warehouses: (warehouses || []).length,
        suppliers: (suppliers || []).length,
        lowStock: lowStock.length,
        expiringLots: expiringLots.length,
        stockValue,
      });

      setLowStockRows(lowStock.slice(0, 8));
      setExpiringRows(expiringLots.slice(0, 8));
      if (settingsRes?.success && settingsRes.settings) {
        setFeatureSettings((prev) => ({
          ...prev,
          ...settingsRes.settings,
          enable_lot_tracking: settingsRes.settings.enable_lot_tracking ? 1 : 0,
          enable_batch_tracking: settingsRes.settings.enable_batch_tracking ? 1 : 0,
          enable_expiry_tracking: settingsRes.settings.enable_expiry_tracking ? 1 : 0,
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const expiryEnabled =
    Number(featureSettings.enable_lot_tracking || 0) === 1 &&
    Number(featureSettings.enable_expiry_tracking || 0) === 1;
  const lotLabel = Number(featureSettings.enable_batch_tracking || 0) === 1 ? "Batch" : "Lot";

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">Inventory Control Tower</h4>
          <small className="text-muted">
            Multi-warehouse stock and replenishment at a glance{expiryEnabled ? ", with expiry health." : "."}
          </small>
        </div>
        <button className="btn btn-outline-primary" onClick={loadData} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <UnifiedLoader show={loading} text="Loading dashboard..." />

      <div className="row g-3 mb-3">
        <div className="col-md-2"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="small text-muted">Products</div><div className="h4 mb-0">{stats.products}</div></div></div></div>
        <div className="col-md-2"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="small text-muted">Warehouses</div><div className="h4 mb-0">{stats.warehouses}</div></div></div></div>
        <div className="col-md-2"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="small text-muted">Suppliers</div><div className="h4 mb-0">{stats.suppliers}</div></div></div></div>
        <div className="col-md-2"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="small text-muted">Low Stock Alerts</div><div className="h4 mb-0 text-danger">{stats.lowStock}</div></div></div></div>
        {expiryEnabled && (
          <div className="col-md-2"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="small text-muted">Expiring {lotLabel}s (45d)</div><div className="h4 mb-0 text-warning">{stats.expiringLots}</div></div></div></div>
        )}
        <div className="col-md-2"><div className="card border-0 shadow-sm h-100"><div className="card-body"><div className="small text-muted">Inventory Value</div><div className="h4 mb-0 text-success">{stats.stockValue.toFixed(2)}</div></div></div></div>
      </div>

      <div className="row g-3">
        <div className={expiryEnabled ? "col-lg-6" : "col-12"}>
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Reorder Alerts</span>
              <span className="status-badge status-danger">{stats.lowStock}</span>
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr><th>Product</th><th>Warehouse</th><th className="text-end">On Hand</th><th className="text-end">Reorder</th></tr>
                </thead>
                <tbody>
                  {lowStockRows.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted py-3">No reorder alerts.</td></tr>
                  ) : (
                    lowStockRows.map((row) => (
                      <tr key={`${row.product_id}-${row.warehouse_id}`}>
                        <td>{row.product_name}</td>
                        <td>{row.warehouse_name}</td>
                        <td className="text-end text-danger fw-semibold">{Number(row.on_hand || 0).toFixed(2)}</td>
                        <td className="text-end">{Number(row.reorder_point || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {expiryEnabled && (
          <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Expiry Risk</span>
              <span className="status-badge status-warning">{stats.expiringLots}</span>
            </div>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr><th>Product</th><th>{lotLabel}</th><th>Expiry</th><th className="text-end">Qty</th></tr>
                </thead>
                <tbody>
                  {expiringRows.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted py-3">No near-expiry lots.</td></tr>
                  ) : (
                    expiringRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.product_name}</td>
                        <td>{row.lot_number}</td>
                        <td>{row.expiry_date || "-"}</td>
                        <td className="text-end">{Number(row.quantity_available || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
