import React, { useEffect, useMemo, useState } from "react";
import Pagination from "../../components/common/Pagination";
import { ensureSuccess, notifyError } from "../../utils/feedback";

const TXN_FORM = {
  product_id: "",
  warehouse_id: "",
  txn_type: "in",
  quantity: "",
  unit_cost: "0",
  lot_number: "",
  lot_id: "",
  expiry_date: "",
  manufacture_date: "",
  notes: "",
};

const TRANSFER_FORM = {
  product_id: "",
  from_warehouse_id: "",
  to_warehouse_id: "",
  quantity: "",
  lot_id: "",
  unit_cost: "0",
  notes: "",
};

const REORDER_FORM = {
  product_id: "",
  warehouse_id: "",
  reorder_point: "",
  safety_stock: "",
  preferred_stock: "",
  lead_time_days: "",
};

const StockMovements = () => {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [lots, setLots] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [summary, setSummary] = useState([]);
  const [alerts, setAlerts] = useState({ lowStock: [], expiringLots: [] });

  const [txnForm, setTxnForm] = useState(TXN_FORM);
  const [transferForm, setTransferForm] = useState(TRANSFER_FORM);
  const [reorderForm, setReorderForm] = useState(REORDER_FORM);

  const [activeTab, setActiveTab] = useState("transactions");
  const [loading, setLoading] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(10);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);

  const loadData = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const [productRows, warehouseRows, summaryRows, lotRows, alertRows, ledgerRes] =
        await Promise.all([
          window.xnoll.productsList(),
          window.xnoll.warehousesList(),
          window.xnoll.inventoryStockSummary(),
          window.xnoll.inventoryLotsList({ only_active: true }),
          window.xnoll.inventoryReorderAlerts(),
          window.xnoll.inventoryLedgerQuery({ page: ledgerPage, pageSize: ledgerPageSize }),
        ]);

      setProducts(productRows || []);
      setWarehouses(warehouseRows || []);
      setSummary(summaryRows || []);
      setLots(lotRows || []);
      setAlerts(alertRows || { lowStock: [], expiringLots: [] });
      ensureSuccess(ledgerRes, "Unable to load stock ledger.");
      setLedger(ledgerRes.rows || []);
      setLedgerTotal(Number(ledgerRes.total || 0));
      setLedgerTotalPages(Number(ledgerRes.totalPages || 1));
    } catch (error) {
      notifyError(error, "Unable to load stock data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [ledgerPage, ledgerPageSize]);

  const filteredLotsForTxn = useMemo(() => {
    return lots.filter(
      (l) =>
        (!txnForm.product_id || Number(l.product_id) === Number(txnForm.product_id)) &&
        (!txnForm.warehouse_id || Number(l.warehouse_id) === Number(txnForm.warehouse_id))
    );
  }, [lots, txnForm.product_id, txnForm.warehouse_id]);

  const filteredLotsForTransfer = useMemo(() => {
    return lots.filter(
      (l) =>
        (!transferForm.product_id || Number(l.product_id) === Number(transferForm.product_id)) &&
        (!transferForm.from_warehouse_id || Number(l.warehouse_id) === Number(transferForm.from_warehouse_id))
    );
  }, [lots, transferForm.product_id, transferForm.from_warehouse_id]);

  const stats = useMemo(() => {
    const totalSkus = new Set(summary.map((row) => row.product_id)).size;
    const totalWarehouses = new Set(summary.map((row) => row.warehouse_id)).size;
    const lowStock = (alerts.lowStock || []).length;
    const totalUnits = summary.reduce((acc, row) => acc + Number(row.on_hand || 0), 0);
    return { totalSkus, totalWarehouses, lowStock, totalUnits };
  }, [summary, alerts.lowStock]);

  const submitTransaction = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const quantity = Number(txnForm.quantity || 0);
    if (!txnForm.product_id || !txnForm.warehouse_id) {
      notifyError("Product and warehouse are required.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity === 0) {
      notifyError("Quantity must be a non-zero number.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        product_id: Number(txnForm.product_id),
        warehouse_id: Number(txnForm.warehouse_id),
        txn_type: txnForm.txn_type,
        quantity,
        unit_cost: Number(txnForm.unit_cost || 0),
        lot_number: txnForm.lot_number?.trim() || null,
        lot_id: txnForm.lot_id ? Number(txnForm.lot_id) : null,
        expiry_date: txnForm.expiry_date || null,
        manufacture_date: txnForm.manufacture_date || null,
        notes: txnForm.notes?.trim() || "",
      };

      const result = await window.xnoll.inventoryTransactionCreate(payload);
      if (result?.success === false) throw new Error(result.error || "Unable to save transaction");

      setTxnForm(TXN_FORM);
      await loadData();
    } catch (error) {
      notifyError(error, "Unable to save transaction.");
    } finally {
      setLoading(false);
    }
  };

  const submitTransfer = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    if (!transferForm.product_id || !transferForm.from_warehouse_id || !transferForm.to_warehouse_id) {
      notifyError("Product and both warehouses are required.");
      return;
    }
    if (transferForm.from_warehouse_id === transferForm.to_warehouse_id) {
      notifyError("Source and destination warehouse must be different.");
      return;
    }

    const quantity = Number(transferForm.quantity || 0);
    if (!(quantity > 0)) {
      notifyError("Transfer quantity must be greater than zero.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        product_id: Number(transferForm.product_id),
        from_warehouse_id: Number(transferForm.from_warehouse_id),
        to_warehouse_id: Number(transferForm.to_warehouse_id),
        quantity,
        lot_id: transferForm.lot_id ? Number(transferForm.lot_id) : null,
        unit_cost: Number(transferForm.unit_cost || 0),
        notes: transferForm.notes?.trim() || "",
      };

      const result = await window.xnoll.inventoryTransferCreate(payload);
      if (result?.success === false) throw new Error(result.error || "Unable to transfer stock");

      setTransferForm(TRANSFER_FORM);
      await loadData();
    } catch (error) {
      notifyError(error, "Unable to transfer stock.");
    } finally {
      setLoading(false);
    }
  };

  const submitReorder = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    if (!reorderForm.product_id || !reorderForm.warehouse_id) {
      notifyError("Product and warehouse are required.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        product_id: Number(reorderForm.product_id),
        warehouse_id: Number(reorderForm.warehouse_id),
        reorder_point: Number(reorderForm.reorder_point || 0),
        safety_stock: Number(reorderForm.safety_stock || 0),
        preferred_stock: Number(reorderForm.preferred_stock || 0),
        lead_time_days: Number(reorderForm.lead_time_days || 0),
      };

      const result = await window.xnoll.inventoryReorderUpsert(payload);
      if (result?.success === false) throw new Error(result.error || "Unable to save reorder levels");

      setReorderForm(REORDER_FORM);
      await loadData();
    } catch (error) {
      notifyError(error, "Unable to save reorder levels.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-3">
        <h4 className="mb-1">Stock Management</h4>
        <small className="text-muted">Warehouse-wise stock control, lot traceability and replenishment setup</small>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-3"><div className="card border-0 shadow-sm"><div className="card-body"><div className="small text-muted">Active SKUs</div><div className="h4 mb-0">{stats.totalSkus}</div></div></div></div>
        <div className="col-md-3"><div className="card border-0 shadow-sm"><div className="card-body"><div className="small text-muted">Warehouses</div><div className="h4 mb-0">{stats.totalWarehouses}</div></div></div></div>
        <div className="col-md-3"><div className="card border-0 shadow-sm"><div className="card-body"><div className="small text-muted">Low Stock Alerts</div><div className="h4 mb-0 text-danger">{stats.lowStock}</div></div></div></div>
        <div className="col-md-3"><div className="card border-0 shadow-sm"><div className="card-body"><div className="small text-muted">Total On-hand Units</div><div className="h4 mb-0 text-success">{stats.totalUnits.toFixed(2)}</div></div></div></div>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item"><button className={`nav-link ${activeTab === "transactions" ? "active" : ""}`} onClick={() => setActiveTab("transactions")}>Transactions</button></li>
        <li className="nav-item"><button className={`nav-link ${activeTab === "transfer" ? "active" : ""}`} onClick={() => setActiveTab("transfer")}>Transfers</button></li>
        <li className="nav-item"><button className={`nav-link ${activeTab === "reorder" ? "active" : ""}`} onClick={() => setActiveTab("reorder")}>Reorder Setup</button></li>
      </ul>

      {activeTab === "transactions" && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white fw-semibold">Create Stock Transaction</div>
          <div className="card-body">
            <form onSubmit={submitTransaction}>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">Product *</label>
                  <select className="form-select" value={txnForm.product_id} onChange={(e) => setTxnForm((p) => ({ ...p, product_id: e.target.value }))}>
                    <option value="">Select product</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku || "NA"})</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Warehouse *</label>
                  <select className="form-select" value={txnForm.warehouse_id} onChange={(e) => setTxnForm((p) => ({ ...p, warehouse_id: e.target.value }))}>
                    <option value="">Select warehouse</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Type *</label>
                  <select className="form-select" value={txnForm.txn_type} onChange={(e) => setTxnForm((p) => ({ ...p, txn_type: e.target.value }))}>
                    <option value="in">IN</option>
                    <option value="out">OUT</option>
                    <option value="adjustment">ADJUSTMENT</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Quantity *</label>
                  <input type="number" step="0.01" className="form-control" value={txnForm.quantity} onChange={(e) => setTxnForm((p) => ({ ...p, quantity: e.target.value }))} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Unit Cost</label>
                  <input type="number" step="0.01" className="form-control" value={txnForm.unit_cost} onChange={(e) => setTxnForm((p) => ({ ...p, unit_cost: e.target.value }))} />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Select Existing Lot</label>
                  <select className="form-select" value={txnForm.lot_id} onChange={(e) => setTxnForm((p) => ({ ...p, lot_id: e.target.value }))}>
                    <option value="">None</option>
                    {filteredLotsForTxn.map((l) => (
                      <option key={l.id} value={l.id}>{l.lot_number} | Qty: {Number(l.quantity_available || 0).toFixed(2)} | Exp: {l.expiry_date || "NA"}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">New Lot Number</label>
                  <input className="form-control" value={txnForm.lot_number} onChange={(e) => setTxnForm((p) => ({ ...p, lot_number: e.target.value }))} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">MFG Date</label>
                  <input type="date" className="form-control" value={txnForm.manufacture_date} onChange={(e) => setTxnForm((p) => ({ ...p, manufacture_date: e.target.value }))} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Expiry Date</label>
                  <input type="date" className="form-control" value={txnForm.expiry_date} onChange={(e) => setTxnForm((p) => ({ ...p, expiry_date: e.target.value }))} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Notes</label>
                  <input className="form-control" value={txnForm.notes} onChange={(e) => setTxnForm((p) => ({ ...p, notes: e.target.value }))} />
                </div>

                <div className="col-12">
                  <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Saving..." : "Save Transaction"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "transfer" && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white fw-semibold">Inter-Warehouse Transfer</div>
          <div className="card-body">
            <form onSubmit={submitTransfer}>
              <div className="row g-3">
                <div className="col-md-3"><label className="form-label">Product *</label><select className="form-select" value={transferForm.product_id} onChange={(e) => setTransferForm((p) => ({ ...p, product_id: e.target.value }))}><option value="">Select product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div className="col-md-2"><label className="form-label">From *</label><select className="form-select" value={transferForm.from_warehouse_id} onChange={(e) => setTransferForm((p) => ({ ...p, from_warehouse_id: e.target.value }))}><option value="">Source</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                <div className="col-md-2"><label className="form-label">To *</label><select className="form-select" value={transferForm.to_warehouse_id} onChange={(e) => setTransferForm((p) => ({ ...p, to_warehouse_id: e.target.value }))}><option value="">Destination</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                <div className="col-md-2"><label className="form-label">Quantity *</label><input type="number" step="0.01" className="form-control" value={transferForm.quantity} onChange={(e) => setTransferForm((p) => ({ ...p, quantity: e.target.value }))} /></div>
                <div className="col-md-3"><label className="form-label">Lot (Optional)</label><select className="form-select" value={transferForm.lot_id} onChange={(e) => setTransferForm((p) => ({ ...p, lot_id: e.target.value }))}><option value="">Any lot</option>{filteredLotsForTransfer.map((l) => <option key={l.id} value={l.id}>{l.lot_number} | Qty: {Number(l.quantity_available || 0).toFixed(2)}</option>)}</select></div>
                <div className="col-md-2"><label className="form-label">Unit Cost</label><input type="number" step="0.01" className="form-control" value={transferForm.unit_cost} onChange={(e) => setTransferForm((p) => ({ ...p, unit_cost: e.target.value }))} /></div>
                <div className="col-md-10"><label className="form-label">Notes</label><input className="form-control" value={transferForm.notes} onChange={(e) => setTransferForm((p) => ({ ...p, notes: e.target.value }))} /></div>
                <div className="col-12"><button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Transferring..." : "Transfer Stock"}</button></div>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "reorder" && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white fw-semibold">Reorder Parameters by Product & Warehouse</div>
          <div className="card-body">
            <form onSubmit={submitReorder}>
              <div className="row g-3 align-items-end">
                <div className="col-md-3"><label className="form-label">Product *</label><select className="form-select" value={reorderForm.product_id} onChange={(e) => setReorderForm((p) => ({ ...p, product_id: e.target.value }))}><option value="">Select product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div className="col-md-3"><label className="form-label">Warehouse *</label><select className="form-select" value={reorderForm.warehouse_id} onChange={(e) => setReorderForm((p) => ({ ...p, warehouse_id: e.target.value }))}><option value="">Select warehouse</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
                <div className="col-md-2"><label className="form-label">Reorder Point</label><input type="number" step="0.01" className="form-control" value={reorderForm.reorder_point} onChange={(e) => setReorderForm((p) => ({ ...p, reorder_point: e.target.value }))} /></div>
                <div className="col-md-2"><label className="form-label">Safety Stock</label><input type="number" step="0.01" className="form-control" value={reorderForm.safety_stock} onChange={(e) => setReorderForm((p) => ({ ...p, safety_stock: e.target.value }))} /></div>
                <div className="col-md-2"><label className="form-label">Preferred Stock</label><input type="number" step="0.01" className="form-control" value={reorderForm.preferred_stock} onChange={(e) => setReorderForm((p) => ({ ...p, preferred_stock: e.target.value }))} /></div>
                <div className="col-md-2"><label className="form-label">Lead Time (days)</label><input type="number" step="1" className="form-control" value={reorderForm.lead_time_days} onChange={(e) => setReorderForm((p) => ({ ...p, lead_time_days: e.target.value }))} /></div>
                <div className="col-md-10"><small className="text-muted">Reorder alert triggers when on-hand is less than or equal to reorder point.</small></div>
                <div className="col-md-2"><button className="btn btn-primary w-100" type="submit" disabled={loading}>Save Rule</button></div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Warehouse Stock Snapshot</div>
            <div className="table-responsive" style={{ maxHeight: 320 }}>
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light"><tr><th>Product</th><th>Warehouse</th><th className="text-end">On-hand</th><th className="text-end">Reorder</th></tr></thead>
                <tbody>
                  {summary.length === 0 ? <tr><td colSpan={4} className="text-center text-muted py-3">No stock records.</td></tr> : summary.slice(0, 60).map((row) => (
                    <tr key={`${row.product_id}-${row.warehouse_id}`}>
                      <td>{row.product_name}</td>
                      <td>{row.warehouse_name}</td>
                      <td className={`text-end ${Number(row.is_below_reorder) ? "text-danger fw-semibold" : "text-success"}`}>{Number(row.on_hand || 0).toFixed(2)}</td>
                      <td className="text-end">{Number(row.reorder_point || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Recent Ledger</div>
            <div className="table-responsive" style={{ maxHeight: 320 }}>
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light"><tr><th>Date</th><th>Product</th><th>Warehouse</th><th>Type</th><th className="text-end">Qty</th></tr></thead>
                <tbody>
                  {ledger.length === 0 ? <tr><td colSpan={5} className="text-center text-muted py-3">No transactions yet.</td></tr> : ledger.map((row) => (
                    <tr key={row.id}>
                      <td>{String(row.txn_date || "").replace("T", " ").slice(0, 16)}</td>
                      <td>{row.product_name}</td>
                      <td>{row.warehouse_name}</td>
                      <td className="text-uppercase">{row.txn_type}</td>
                      <td className="text-end">{Number(row.quantity || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-2">
              <Pagination
                currentPage={ledgerPage}
                totalPages={ledgerTotalPages}
                pageSize={ledgerPageSize}
                totalItems={ledgerTotal}
                onPageChange={setLedgerPage}
                onPageSizeChange={(size) => {
                  setLedgerPageSize(size);
                  setLedgerPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockMovements;
