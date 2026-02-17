import React, { useEffect, useMemo, useState } from "react";
import { ensureSuccess, notifyError, notifySuccess } from "../../utils/feedback";
import { formatStatusLabel, getStatusBadgeClass } from "../../utils/status";
import UnifiedLoader from "../../components/common/UnifiedLoader";

const QUICK_FORM = {
  product_id: "",
  warehouse_id: "",
  quantity: "",
  unit_cost: "0",
  lot_number: "",
  lot_id: "",
  expiry_date: "",
  manufacture_date: "",
  notes: "",
};

const PREFS_KEY = "xnoll_stock_flow_prefs";

const readPrefs = () => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { receive_warehouse_id: "", sell_warehouse_id: "" };
    const parsed = JSON.parse(raw);
    return {
      receive_warehouse_id: String(parsed.receive_warehouse_id || ""),
      sell_warehouse_id: String(parsed.sell_warehouse_id || ""),
    };
  } catch (_err) {
    return { receive_warehouse_id: "", sell_warehouse_id: "" };
  }
};

const savePrefs = (prefs) => {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs || {}));
  } catch (_err) {
    // noop
  }
};

const StockMovements = () => {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [lots, setLots] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [summary, setSummary] = useState([]);
  const [alerts, setAlerts] = useState({ lowStock: [], expiringLots: [] });

  const [operation, setOperation] = useState("receive");
  const [quickForm, setQuickForm] = useState(QUICK_FORM);
  const [featureSettings, setFeatureSettings] = useState({
    enable_lot_tracking: 1,
    enable_batch_tracking: 0,
    enable_expiry_tracking: 1,
    enable_manufacture_date: 0,
  });
  const [prefs, setPrefs] = useState(readPrefs);
  const [autoReset, setAutoReset] = useState(true);
  const [loading, setLoading] = useState(false);

  const [viewWarehouseId, setViewWarehouseId] = useState("");
  const [viewProductId, setViewProductId] = useState("");

  const loadLotsForSelection = async (productId, warehouseId) => {
    if (!window.xnoll) return;
    if (!productId || !warehouseId) {
      setLots([]);
      return;
    }
    try {
      const rows = await window.xnoll.inventoryLotsList({
        only_active: true,
        product_id: Number(productId),
        warehouse_id: Number(warehouseId),
        limit: 300,
      });
      setLots(rows || []);
    } catch (_err) {
      setLots([]);
    }
  };

  const loadData = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const [productRows, warehouseRows, summaryRows, alertRows, ledgerRes, settingsRes] = await Promise.all([
        window.xnoll.productsList(),
        window.xnoll.warehousesList(),
        window.xnoll.inventoryStockSummary({
          product_id: viewProductId ? Number(viewProductId) : undefined,
          warehouse_id: viewWarehouseId ? Number(viewWarehouseId) : undefined,
          limit: 400,
        }),
        window.xnoll.inventoryReorderAlerts({ limit: 300 }),
        window.xnoll.inventoryLedgerQuery({ page: 1, pageSize: 25 }),
        window.xnoll.settingsGet(),
      ]);

      setProducts(productRows || []);
      setWarehouses(warehouseRows || []);
      setSummary(summaryRows || []);
      setAlerts(alertRows || { lowStock: [], expiringLots: [] });
      if (settingsRes?.success && settingsRes.settings) {
        setFeatureSettings((prev) => ({
          ...prev,
          ...settingsRes.settings,
          enable_lot_tracking: settingsRes.settings.enable_lot_tracking ? 1 : 0,
          enable_batch_tracking: settingsRes.settings.enable_batch_tracking ? 1 : 0,
          enable_expiry_tracking: settingsRes.settings.enable_expiry_tracking ? 1 : 0,
          enable_manufacture_date: settingsRes.settings.enable_manufacture_date ? 1 : 0,
        }));
      }

      ensureSuccess(ledgerRes, "Unable to load stock ledger.");
      setLedger(ledgerRes.rows || []);
    } catch (error) {
      notifyError(error, "Unable to load stock data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [viewWarehouseId, viewProductId]);

  useEffect(() => {
    if (!warehouses.length) return;

    const primary = warehouses.find((w) => Number(w.is_primary) === 1) || warehouses[0];
    const fallbackId = String(primary?.id || "");

    setPrefs((prev) => {
      const next = {
        receive_warehouse_id: prev.receive_warehouse_id || fallbackId,
        sell_warehouse_id: prev.sell_warehouse_id || fallbackId,
      };
      if (
        next.receive_warehouse_id !== prev.receive_warehouse_id ||
        next.sell_warehouse_id !== prev.sell_warehouse_id
      ) {
        savePrefs(next);
      }
      return next;
    });

    setQuickForm((prev) => {
      if (prev.warehouse_id) return prev;
      return {
        ...prev,
        warehouse_id:
          operation === "sell"
            ? prefs.sell_warehouse_id || fallbackId
            : prefs.receive_warehouse_id || fallbackId,
      };
    });
  }, [warehouses, operation, prefs.receive_warehouse_id, prefs.sell_warehouse_id]);

  const stats = useMemo(() => {
    const totalSkus = new Set(summary.map((row) => row.product_id)).size;
    const totalWarehouses = new Set(summary.map((row) => row.warehouse_id)).size;
    const lowStock = (alerts.lowStock || []).length;
    const totalUnits = summary.reduce((acc, row) => acc + Number(row.on_hand || 0), 0);
    return { totalSkus, totalWarehouses, lowStock, totalUnits };
  }, [summary, alerts.lowStock]);

  const filteredLotsForQuick = useMemo(() => {
    return lots;
  }, [lots, quickForm.product_id, quickForm.warehouse_id]);

  useEffect(() => {
    loadLotsForSelection(quickForm.product_id, quickForm.warehouse_id);
  }, [quickForm.product_id, quickForm.warehouse_id]);

  const filteredSummary = useMemo(() => {
    return summary.filter(
      (row) =>
        (!viewWarehouseId || Number(row.warehouse_id) === Number(viewWarehouseId)) &&
        (!viewProductId || Number(row.product_id) === Number(viewProductId))
    );
  }, [summary, viewWarehouseId, viewProductId]);

  const filteredLedger = useMemo(() => {
    return ledger.filter(
      (row) =>
        (!viewWarehouseId || Number(row.warehouse_id) === Number(viewWarehouseId)) &&
        (!viewProductId || Number(row.product_id) === Number(viewProductId))
    );
  }, [ledger, viewWarehouseId, viewProductId]);

  const filteredTotals = useMemo(() => {
    const onHand = filteredSummary.reduce((acc, row) => acc + Number(row.on_hand || 0), 0);
    const lowRows = filteredSummary.filter((row) => Number(row.is_below_reorder) === 1).length;
    return { onHand, lowRows };
  }, [filteredSummary]);

  const lotTrackingEnabled = Number(featureSettings.enable_lot_tracking || 0) === 1;
  const batchLabelEnabled = Number(featureSettings.enable_batch_tracking || 0) === 1;
  const expiryEnabled = lotTrackingEnabled && Number(featureSettings.enable_expiry_tracking || 0) === 1;
  const manufactureEnabled = lotTrackingEnabled && Number(featureSettings.enable_manufacture_date || 0) === 1;
  const lotLabel = batchLabelEnabled ? "Batch" : "Lot";

  const setOperationMode = (nextMode) => {
    setOperation(nextMode);
    const preferredWarehouse = nextMode === "sell" ? prefs.sell_warehouse_id : prefs.receive_warehouse_id;
    setQuickForm((prev) => ({
      ...prev,
      warehouse_id: preferredWarehouse || prev.warehouse_id,
      quantity: "",
      lot_id: "",
      lot_number: "",
      expiry_date: "",
      manufacture_date: "",
      notes: "",
    }));
  };

  const saveQuickTransaction = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const rawQuantity = Number(quickForm.quantity || 0);
    if (!quickForm.product_id || !quickForm.warehouse_id) {
      notifyError("Product and location are required.");
      return;
    }

    if (operation === "adjust") {
      if (!Number.isFinite(rawQuantity) || rawQuantity === 0) {
        notifyError("Adjustment quantity must be non-zero (use - for decrease).");
        return;
      }
    } else if (!(rawQuantity > 0)) {
      notifyError("Quantity must be greater than zero.");
      return;
    }

    const txnType = operation === "receive" ? "in" : operation === "sell" ? "out" : "adjustment";
    const quantity = operation === "adjust" ? rawQuantity : Math.abs(rawQuantity);

    setLoading(true);
    try {
      const payload = {
        product_id: Number(quickForm.product_id),
        warehouse_id: Number(quickForm.warehouse_id),
        txn_type: txnType,
        quantity,
        unit_cost: Number(quickForm.unit_cost || 0),
        lot_number: lotTrackingEnabled ? quickForm.lot_number?.trim() || null : null,
        lot_id: lotTrackingEnabled && quickForm.lot_id ? Number(quickForm.lot_id) : null,
        expiry_date: expiryEnabled ? quickForm.expiry_date || null : null,
        manufacture_date: manufactureEnabled ? quickForm.manufacture_date || null : null,
        notes: quickForm.notes?.trim() || "",
        reference_type: operation === "receive" ? "buy" : operation === "sell" ? "sell" : "adjustment",
      };

      const result = await window.xnoll.inventoryTransactionCreate(payload);
      if (result?.success === false) throw new Error(result.error || "Unable to save transaction");

      notifySuccess(
        operation === "receive"
          ? "Stock inward saved."
          : operation === "sell"
          ? "Stock outward saved."
          : "Stock adjustment saved."
      );

      const keep = {
        product_id: quickForm.product_id,
        warehouse_id: quickForm.warehouse_id,
        unit_cost: quickForm.unit_cost,
      };
      setQuickForm(autoReset ? { ...QUICK_FORM, ...keep } : { ...quickForm, quantity: "" });
      await loadData();
    } catch (error) {
      notifyError(error, "Unable to save stock operation.");
    } finally {
      setLoading(false);
    }
  };

  const updatePrefs = (key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      savePrefs(next);
      return next;
    });
  };

  return (
    <div>
      <div className="mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h4 className="mb-1">Stock Operations</h4>
          <small className="text-muted">Single simple form for Inward, Outward and Adjustment entries.</small>
        </div>
        <div className="form-check form-switch ui-switch m-0">
          <input
            className="form-check-input"
            type="checkbox"
            id="autoResetStock"
            checked={autoReset}
            onChange={(e) => setAutoReset(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="autoResetStock">
            Auto reset after save
          </label>
        </div>
      </div>
      <UnifiedLoader show={loading} text="Loading stock data..." />

      <div className="row g-3 mb-3">
        <div className="col-md-3"><div className="card border-0 shadow-sm"><div className="card-body"><div className="small text-muted">Products</div><div className="h4 mb-0">{stats.totalSkus}</div></div></div></div>
        <div className="col-md-3"><div className="card border-0 shadow-sm"><div className="card-body"><div className="small text-muted">Locations</div><div className="h4 mb-0">{stats.totalWarehouses}</div></div></div></div>
        <div className="col-md-3"><div className="card border-0 shadow-sm"><div className="card-body"><div className="small text-muted">Low Stock Alerts</div><div className="h4 mb-0 text-danger">{stats.lowStock}</div></div></div></div>
        <div className="col-md-3"><div className="card border-0 shadow-sm"><div className="card-body"><div className="small text-muted">Total Units</div><div className="h4 mb-0 text-success">{stats.totalUnits.toFixed(2)}</div></div></div></div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">Shop / Godown Defaults</div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Default Inward Location (Godown)</label>
              <select
                className="form-select"
                value={prefs.receive_warehouse_id}
                onChange={(e) => {
                  const value = e.target.value;
                  updatePrefs("receive_warehouse_id", value);
                  if (operation !== "sell") {
                    setQuickForm((prev) => ({ ...prev, warehouse_id: value }));
                  }
                }}
              >
                <option value="">Select location</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Default Outward Location (Shop)</label>
              <select
                className="form-select"
                value={prefs.sell_warehouse_id}
                onChange={(e) => {
                  const value = e.target.value;
                  updatePrefs("sell_warehouse_id", value);
                  if (operation === "sell") {
                    setQuickForm((prev) => ({ ...prev, warehouse_id: value }));
                  }
                }}
              >
                <option value="">Select location</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">Stock Entry Form</div>
        <div className="card-body">
          <form onSubmit={saveQuickTransaction}>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Action *</label>
                <select
                  className="form-select"
                  value={operation}
                  onChange={(e) => setOperationMode(e.target.value)}
                >
                  <option value="receive">Inward (In)</option>
                  <option value="sell">Outward (Out)</option>
                  <option value="adjust">Adjustment</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Product *</label>
                <select
                  className="form-select"
                  value={quickForm.product_id}
                  onChange={(e) => setQuickForm((p) => ({ ...p, product_id: e.target.value, lot_id: "" }))}
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku || "NA"})</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Location *</label>
                <select
                  className="form-select"
                  value={quickForm.warehouse_id}
                  onChange={(e) => setQuickForm((p) => ({ ...p, warehouse_id: e.target.value, lot_id: "" }))}
                >
                  <option value="">Select location</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Quantity * {operation === "adjust" ? "(use - for decrease)" : ""}</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={quickForm.quantity}
                  onChange={(e) => setQuickForm((p) => ({ ...p, quantity: e.target.value }))}
                />
              </div>

              {(operation === "receive" || operation === "adjust") && (
                <>
                  <div className="col-md-3">
                    <label className="form-label">Unit Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={quickForm.unit_cost}
                      onChange={(e) => setQuickForm((p) => ({ ...p, unit_cost: e.target.value }))}
                    />
                  </div>
                  {lotTrackingEnabled && (
                    <div className="col-md-3">
                      <label className="form-label">{lotLabel} Number</label>
                      <input
                        className="form-control"
                        value={quickForm.lot_number}
                        onChange={(e) => setQuickForm((p) => ({ ...p, lot_number: e.target.value }))}
                      />
                    </div>
                  )}
                  {manufactureEnabled && (
                    <div className="col-md-3">
                      <label className="form-label">MFG Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={quickForm.manufacture_date}
                        onChange={(e) => setQuickForm((p) => ({ ...p, manufacture_date: e.target.value }))}
                      />
                    </div>
                  )}
                  {expiryEnabled && (
                    <div className="col-md-3">
                      <label className="form-label">Expiry Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={quickForm.expiry_date}
                        onChange={(e) => setQuickForm((p) => ({ ...p, expiry_date: e.target.value }))}
                      />
                    </div>
                  )}
                </>
              )}

              {operation === "sell" && lotTrackingEnabled && (
                <div className="col-md-4">
                  <label className="form-label">{lotLabel} (optional)</label>
                  <select
                    className="form-select"
                    value={quickForm.lot_id}
                    onChange={(e) => setQuickForm((p) => ({ ...p, lot_id: e.target.value }))}
                  >
                    <option value="">Any {lotLabel.toLowerCase()}</option>
                    {filteredLotsForQuick.map((l) => (
                      <option key={l.id} value={l.id}>{l.lot_number} | Qty: {Number(l.quantity_available || 0).toFixed(2)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="col-md-8">
                <label className="form-label">Notes</label>
                <input
                  className="form-control"
                  value={quickForm.notes}
                  onChange={(e) => setQuickForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                  {loading
                    ? "Saving..."
                    : operation === "receive"
                    ? "Save Inward"
                    : operation === "sell"
                    ? "Save Outward"
                    : "Save Adjustment"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-white fw-semibold">Simple Stock View</div>
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label className="form-label">Choose Location (Godown / Shop)</label>
              <select
                className="form-select"
                value={viewWarehouseId}
                onChange={(e) => setViewWarehouseId(e.target.value)}
              >
                <option value="">All locations</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Choose Product</label>
              <select
                className="form-select"
                value={viewProductId}
                onChange={(e) => setViewProductId(e.target.value)}
              >
                <option value="">All products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku || "NA"})</option>
                ))}
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary w-100"
                type="button"
                onClick={() => {
                  setViewWarehouseId("");
                  setViewProductId("");
                }}
              >
                Clear Filter
              </button>
            </div>
          </div>

          <div className="row g-3 mb-2">
            <div className="col-md-4"><div className="card bg-light border-0"><div className="card-body"><div className="small text-muted">Filtered Stock Qty</div><div className="h5 mb-0 text-success">{filteredTotals.onHand.toFixed(2)}</div></div></div></div>
            <div className="col-md-4"><div className="card bg-light border-0"><div className="card-body"><div className="small text-muted">Items in View</div><div className="h5 mb-0">{filteredSummary.length}</div></div></div></div>
            <div className="col-md-4"><div className="card bg-light border-0"><div className="card-body"><div className="small text-muted">Low Stock in View</div><div className="h5 mb-0 text-danger">{filteredTotals.lowRows}</div></div></div></div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Current Stock (Top 8)</div>
            <div className="card-body">
              {filteredSummary.length === 0 ? (
                <div className="text-muted">No stock records for selected filters.</div>
              ) : (
                <div className="list-group list-group-flush">
                  {filteredSummary.slice(0, 8).map((row) => (
                    <div className="list-group-item px-0" key={`${row.product_id}-${row.warehouse_id}`}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold">{row.product_name}</div>
                          <small className="text-muted">{row.warehouse_name}</small>
                        </div>
                        <div className="text-end">
                          <div className={Number(row.is_below_reorder) ? "text-danger fw-semibold" : "text-success fw-semibold"}>
                            {Number(row.on_hand || 0).toFixed(2)}
                          </div>
                          <small className="text-muted">Reorder {Number(row.reorder_point || 0).toFixed(2)}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Recent Activity</div>
            <div className="card-body">
              {filteredLedger.length === 0 ? (
                <div className="text-muted">No transactions for selected filters.</div>
              ) : (
                <div className="list-group list-group-flush">
                  {filteredLedger.slice(0, 8).map((row) => (
                    <div className="list-group-item px-0" key={row.id}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-semibold">{row.product_name}</div>
                          <small className="text-muted">
                            {row.warehouse_name} | {String(row.txn_date || "").replace("T", " ").slice(0, 16)}
                          </small>
                        </div>
                        <div className="text-end">
                          <div className="mb-1">
                            <span className={getStatusBadgeClass(row.txn_type, "stock_txn")}>
                              {formatStatusLabel(row.txn_type)}
                            </span>
                          </div>
                          <small className="fw-semibold">{Number(row.quantity || 0).toFixed(2)}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockMovements;
