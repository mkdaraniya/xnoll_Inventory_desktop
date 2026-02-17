import React, { useEffect, useMemo, useState } from "react";
import { formatStatusLabel, getStatusBadgeClass } from "../../utils/status";
import UnifiedLoader from "../../components/common/UnifiedLoader";

const csvExport = (rows, filename) => {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState({
    fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
    warehouseId: "",
    productId: "",
  });

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [alerts, setAlerts] = useState({ lowStock: [], expiringLots: [] });
  const [valuation, setValuation] = useState([]);
  const [expiry, setExpiry] = useState([]);
  const [featureSettings, setFeatureSettings] = useState({
    enable_lot_tracking: 1,
    enable_batch_tracking: 0,
    enable_expiry_tracking: 1,
  });

  const loadData = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const [summaryRows, alertRows, valuationRows, expiryRows, settingsRes] =
        await Promise.all([
          window.xnoll.inventoryStockSummary({
            warehouse_id: filters.warehouseId || undefined,
            product_id: filters.productId || undefined,
            limit: 1000,
          }),
          window.xnoll.inventoryReorderAlerts({ limit: 1000 }),
          window.xnoll.inventoryValuationReport({
            warehouse_id: filters.warehouseId || undefined,
            product_id: filters.productId || undefined,
            limit: 2000,
          }),
          window.xnoll.inventoryExpiryReport({ limit: 2000 }),
          window.xnoll.settingsGet(),
        ]);

      const ledgerRows = await window.xnoll.inventoryLedgerList({
        from_date: filters.fromDate,
        to_date: filters.toDate,
        warehouse_id: filters.warehouseId || undefined,
        product_id: filters.productId || undefined,
        limit: 2000,
      });

      setStockSummary(summaryRows || []);
      setAlerts(alertRows || { lowStock: [], expiringLots: [] });
      setValuation(valuationRows || []);
      setExpiry(expiryRows || []);
      setLedger(ledgerRows || []);
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

  useEffect(() => {
    const loadFilterOptions = async () => {
      if (!window.xnoll) return;
      try {
        const [warehouseRows, productRows] = await Promise.all([
          window.xnoll.inventoryWarehouseOptions({ limit: 500 }),
          window.xnoll.inventoryProductOptions({ limit: 1200 }),
        ]);
        setWarehouses(warehouseRows || []);
        setProducts(productRows || []);
      } catch (_err) {
        // keep existing UI without blocking reports
      }
    };
    loadFilterOptions();
  }, []);

  useEffect(() => {
    const cleanup = window.xnoll?.onReportsType?.((type) => {
      if (type === "ledger") setActiveTab("ledger");
      if (type === "reorder") setActiveTab("reorder");
      if (type === "expiry") setActiveTab("expiry");
      if (type === "valuation") setActiveTab("valuation");
    });
    return cleanup;
  }, []);

  const filteredSummary = useMemo(() => {
    return stockSummary.filter((row) => {
      const warehouseOk = !filters.warehouseId || Number(row.warehouse_id) === Number(filters.warehouseId);
      const productOk = !filters.productId || Number(row.product_id) === Number(filters.productId);
      return warehouseOk && productOk;
    });
  }, [stockSummary, filters.warehouseId, filters.productId]);

  const totals = useMemo(() => {
    const stockUnits = filteredSummary.reduce((sum, row) => sum + Number(row.on_hand || 0), 0);
    const lowStock = (alerts.lowStock || []).length;
    const valuationTotal = valuation.reduce((sum, row) => sum + Number(row.stock_value || 0), 0);
    const expiringCount = expiry.filter((row) => Number(row.days_to_expiry || 9999) <= 45).length;
    return { stockUnits, lowStock, valuationTotal, expiringCount };
  }, [filteredSummary, alerts.lowStock, valuation, expiry]);

  const lotTrackingEnabled = Number(featureSettings.enable_lot_tracking || 0) === 1;
  const expiryEnabled = lotTrackingEnabled && Number(featureSettings.enable_expiry_tracking || 0) === 1;
  const lotLabel = Number(featureSettings.enable_batch_tracking || 0) === 1 ? "Batch" : "Lot";

  useEffect(() => {
    if (activeTab === "expiry" && !expiryEnabled) setActiveTab("overview");
  }, [activeTab, expiryEnabled]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Inventory Reports</h4>
        <button className="btn btn-outline-primary" onClick={loadData} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      <UnifiedLoader show={loading} text="Loading reports..." />

      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label small">From</label>
              <input type="date" className="form-control form-control-sm" value={filters.fromDate} onChange={(e) => setFilters((p) => ({ ...p, fromDate: e.target.value }))} />
            </div>
            <div className="col-md-2">
              <label className="form-label small">To</label>
              <input type="date" className="form-control form-control-sm" value={filters.toDate} onChange={(e) => setFilters((p) => ({ ...p, toDate: e.target.value }))} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Warehouse</label>
              <select className="form-select form-select-sm" value={filters.warehouseId} onChange={(e) => setFilters((p) => ({ ...p, warehouseId: e.target.value }))}>
                <option value="">All</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">Product</label>
              <select className="form-select form-select-sm" value={filters.productId} onChange={(e) => setFilters((p) => ({ ...p, productId: e.target.value }))}>
                <option value="">All</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary btn-sm w-100" onClick={loadData}>Apply</button>
            </div>
          </div>
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button></li>
        <li className="nav-item"><button className={`nav-link ${activeTab === "ledger" ? "active" : ""}`} onClick={() => setActiveTab("ledger")}>Stock Ledger</button></li>
        <li className="nav-item"><button className={`nav-link ${activeTab === "reorder" ? "active" : ""}`} onClick={() => setActiveTab("reorder")}>Reorder Alerts</button></li>
        {expiryEnabled && <li className="nav-item"><button className={`nav-link ${activeTab === "expiry" ? "active" : ""}`} onClick={() => setActiveTab("expiry")}>Expiry Tracking</button></li>}
        <li className="nav-item"><button className={`nav-link ${activeTab === "valuation" ? "active" : ""}`} onClick={() => setActiveTab("valuation")}>Valuation</button></li>
      </ul>

      {activeTab === "overview" && (
        <div className="row g-3">
          <div className="col-md-3"><div className="card border-0 shadow-sm"><div className="card-body"><div className="small text-muted">On-hand Units</div><div className="h4 mb-0">{totals.stockUnits.toFixed(2)}</div></div></div></div>
          <div className="col-md-3"><div className="card border-0 shadow-sm"><div className="card-body"><div className="small text-muted">Low Stock Alerts</div><div className="h4 mb-0 text-danger">{totals.lowStock}</div></div></div></div>
          {expiryEnabled && <div className="col-md-3"><div className="card border-0 shadow-sm"><div className="card-body"><div className="small text-muted">Expiring {lotLabel}s (&lt;=45d)</div><div className="h4 mb-0 text-warning">{totals.expiringCount}</div></div></div></div>}
          <div className="col-md-3"><div className="card border-0 shadow-sm"><div className="card-body"><div className="small text-muted">Inventory Value</div><div className="h4 mb-0 text-success">{totals.valuationTotal.toFixed(2)}</div></div></div></div>
        </div>
      )}

      {activeTab === "ledger" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Stock Ledger ({ledger.length})</h6>
            <button className="btn btn-sm btn-outline-success" onClick={() => csvExport(ledger, `stock-ledger-${filters.fromDate}-to-${filters.toDate}.csv`)} disabled={!ledger.length}>Export CSV</button>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped mb-0 align-middle">
              <thead><tr><th>Date</th><th>SKU</th><th>Product</th><th>Warehouse</th><th>Type</th><th className="text-end">Qty</th><th className="text-end">Cost</th>{lotTrackingEnabled && <th>{lotLabel}</th>}<th>Reference</th></tr></thead>
              <tbody>
                {ledger.length === 0 ? <tr><td colSpan={lotTrackingEnabled ? 9 : 8} className="text-center text-muted py-4">No records.</td></tr> : ledger.map((r) => (
                  <tr key={r.id}>
                    <td>{String(r.txn_date || "").replace("T", " ").slice(0, 16)}</td>
                    <td>{r.product_sku || "-"}</td>
                    <td>{r.product_name}</td>
                    <td>{r.warehouse_name}</td>
                    <td>
                      <span className={getStatusBadgeClass(r.txn_type, "stock_txn")}>
                        {formatStatusLabel(r.txn_type)}
                      </span>
                    </td>
                    <td className="text-end">{Number(r.quantity || 0).toFixed(2)}</td>
                    <td className="text-end">{Number(r.unit_cost || 0).toFixed(2)}</td>
                    {lotTrackingEnabled && <td>{r.lot_number || "-"}</td>}
                    <td>{r.reference_type || "manual"}{r.reference_id ? ` #${r.reference_id}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "reorder" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Reorder Alerts ({(alerts.lowStock || []).length})</h6>
            <button className="btn btn-sm btn-outline-success" onClick={() => csvExport(alerts.lowStock || [], "reorder-alerts.csv")} disabled={!(alerts.lowStock || []).length}>Export CSV</button>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped mb-0 align-middle">
              <thead><tr><th>SKU</th><th>Product</th><th>Warehouse</th><th className="text-end">On Hand</th><th className="text-end">Reorder</th><th className="text-end">Preferred</th></tr></thead>
              <tbody>
                {(alerts.lowStock || []).length === 0 ? <tr><td colSpan={6} className="text-center text-muted py-4">No reorder alerts.</td></tr> : (alerts.lowStock || []).map((r) => (
                  <tr key={`${r.product_id}-${r.warehouse_id}`}>
                    <td>{r.sku || "-"}</td>
                    <td>{r.product_name}</td>
                    <td>{r.warehouse_name}</td>
                    <td className="text-end text-danger fw-semibold">{Number(r.on_hand || 0).toFixed(2)}</td>
                    <td className="text-end">{Number(r.reorder_point || 0).toFixed(2)}</td>
                    <td className="text-end">{Number(r.preferred_stock || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "expiry" && expiryEnabled && (
        <div className="card border-0 shadow-sm">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Expiry Tracking ({expiry.length})</h6>
            <button className="btn btn-sm btn-outline-success" onClick={() => csvExport(expiry, "expiry-tracking.csv")} disabled={!expiry.length}>Export CSV</button>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped mb-0 align-middle">
              <thead><tr><th>SKU</th><th>Product</th><th>Warehouse</th><th>{lotLabel}</th><th>Expiry</th><th className="text-end">Days Left</th><th className="text-end">Qty</th></tr></thead>
              <tbody>
                {expiry.length === 0 ? <tr><td colSpan={7} className="text-center text-muted py-4">No lots with expiry found.</td></tr> : expiry.map((r) => (
                  <tr key={r.id}>
                    <td>{r.sku || "-"}</td>
                    <td>{r.product_name}</td>
                    <td>{r.warehouse_name}</td>
                    <td>{r.lot_number}</td>
                    <td>{r.expiry_date}</td>
                    <td className={`text-end ${Number(r.days_to_expiry) <= 15 ? "text-danger fw-semibold" : Number(r.days_to_expiry) <= 45 ? "text-warning fw-semibold" : ""}`}>{Number(r.days_to_expiry || 0)}</td>
                    <td className="text-end">{Number(r.quantity_available || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "valuation" && (
        <div className="card border-0 shadow-sm">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Inventory Valuation ({valuation.length})</h6>
            <button className="btn btn-sm btn-outline-success" onClick={() => csvExport(valuation, "inventory-valuation.csv")} disabled={!valuation.length}>Export CSV</button>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped mb-0 align-middle">
              <thead><tr><th>SKU</th><th>Product</th><th>Warehouse</th><th className="text-end">On Hand</th><th className="text-end">Avg Cost</th><th className="text-end">Stock Value</th></tr></thead>
              <tbody>
                {valuation.length === 0 ? <tr><td colSpan={6} className="text-center text-muted py-4">No valuation data found.</td></tr> : valuation.map((r) => (
                  <tr key={`${r.product_id}-${r.warehouse_id}`}>
                    <td>{r.sku || "-"}</td>
                    <td>{r.product_name}</td>
                    <td>{r.warehouse_name}</td>
                    <td className="text-end">{Number(r.on_hand || 0).toFixed(2)}</td>
                    <td className="text-end">{Number(r.avg_cost || 0).toFixed(2)}</td>
                    <td className="text-end fw-semibold">{Number(r.stock_value || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
