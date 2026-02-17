import React, { useEffect, useMemo, useState } from "react";
import Pagination from "../../components/common/Pagination";
import UnifiedLoader from "../../components/common/UnifiedLoader";
import {
  confirmAction,
  ensureSuccess,
  notifyError,
  notifySuccess,
} from "../../utils/feedback";
import { formatStatusLabel, getStatusBadgeClass } from "../../utils/status";
import { isNonNegativeNumber, isPositiveNumber } from "../../utils/validation";

const emptyItem = { product_id: "", qty: "1", unit_cost: "0", description: "" };
const emptyForm = {
  id: null,
  po_number: "",
  supplier_id: "",
  order_date: new Date().toISOString().slice(0, 10),
  expected_date: "",
  status: "draft",
  notes: "",
  items: [{ ...emptyItem }],
};

const statusOptions = ["draft", "ordered", "partial", "received", "cancelled"];
const buildPoNumber = () => `PO-${Date.now().toString(36).toUpperCase()}`;

const Purchases = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("desc");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const [poRes, supplierRows, productRows] = await Promise.all([
        window.xnoll.purchaseOrdersQuery({ page, pageSize, search, sortKey, sortDir }),
        window.xnoll.suppliersList(),
        window.xnoll.productsList(),
      ]);
      ensureSuccess(poRes, "Unable to load purchase orders.");
      setPurchaseOrders(poRes.rows || []);
      setTotal(Number(poRes.total || 0));
      setTotalPages(Number(poRes.totalPages || 1));
      setSuppliers(supplierRows || []);
      setProducts(productRows || []);
    } catch (error) {
      notifyError(error, "Unable to load purchase orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize, search, sortKey, sortDir]);

  const resetForm = () => {
    setForm({ ...emptyForm, po_number: buildPoNumber(), items: [{ ...emptyItem }] });
    setIsEditing(false);
  };

  const totalAmount = useMemo(
    () =>
      form.items.reduce((sum, item) => {
        const qty = Number(item.qty || 0);
        const unitCost = Number(item.unit_cost || 0);
        return sum + qty * unitCost;
      }, 0),
    [form.items]
  );

  const addRow = () => setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  const removeRow = (index) => {
    setForm((prev) => {
      const nextItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: nextItems.length ? nextItems : [{ ...emptyItem }] };
    });
  };
  const updateRow = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
  };

  const validate = () => {
    if (!form.order_date) return "Order date is required.";
    if (!form.supplier_id) return "Supplier is required.";
    if (form.expected_date && form.expected_date < form.order_date) {
      return "Expected date cannot be earlier than order date.";
    }
    if (!form.items.length) return "Add at least one item.";
    for (const item of form.items) {
      if (!item.product_id) return "Every row must have a product.";
      if (!isPositiveNumber(item.qty)) return "Quantity must be greater than zero.";
      if (!isNonNegativeNumber(item.unit_cost)) return "Unit cost cannot be negative.";
    }
    return null;
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (po) => {
    setForm({
      id: po.id,
      po_number: po.po_number || "",
      supplier_id: po.supplier_id || "",
      order_date: (po.order_date || "").slice(0, 10),
      expected_date: (po.expected_date || "").slice(0, 10),
      status: po.status || "draft",
      notes: po.notes || "",
      items: (po.items || []).map((item) => ({
        product_id: item.product_id || "",
        qty: String(item.qty ?? 1),
        unit_cost: String(item.unit_cost ?? 0),
        description: item.description || "",
      })),
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.xnoll) return;
    const confirmed = await confirmAction({
      title: "Delete purchase order?",
      text: "This purchase order will be removed permanently.",
      confirmButtonText: "Delete",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      ensureSuccess(await window.xnoll.purchaseOrdersDelete(id), "Unable to delete purchase order.");
      await loadData();
      notifySuccess("Purchase order deleted successfully.");
    } catch (error) {
      notifyError(error, "Unable to delete purchase order.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const validationError = validate();
    if (validationError) return notifyError(validationError);

    const payload = {
      id: form.id,
      po_number: String(form.po_number || buildPoNumber()).trim(),
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      order_date: form.order_date,
      expected_date: form.expected_date || null,
      status: form.status,
      notes: form.notes.trim(),
      items: form.items.map((item) => ({
        product_id: Number(item.product_id),
        qty: Number(item.qty || 0),
        unit_cost: Number(item.unit_cost || 0),
        description: item.description?.trim() || "",
      })),
    };

    setLoading(true);
    try {
      const result = isEditing
        ? await window.xnoll.purchaseOrdersUpdate(payload)
        : await window.xnoll.purchaseOrdersCreate(payload);
      ensureSuccess(result, "Unable to save purchase order.");

      setShowModal(false);
      resetForm();
      await loadData();
      notifySuccess(isEditing ? "Purchase order updated successfully." : "Purchase order created successfully.");
    } catch (error) {
      notifyError(error, "Unable to save purchase order.");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const sortIcon = (key) => (sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : "");

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">Purchase Orders</h4>
          <small className="text-muted">Plan procurement and track vendor orders</small>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Purchase Order</button>
      </div>
      <UnifiedLoader show={loading} text="Loading purchase orders..." />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex gap-2">
          <input className="form-control" placeholder="Search PO number, supplier, status" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <button className="btn btn-outline-secondary" onClick={loadData} disabled={loading}>Refresh</button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-striped align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("po_number")}>PO Number {sortIcon("po_number")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("supplier_name")}>Supplier {sortIcon("supplier_name")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("order_date")}>Order Date {sortIcon("order_date")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("status")}>Status {sortIcon("status")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("total_amount")}>Total {sortIcon("total_amount")}</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted py-4">No purchase orders available.</td></tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="fw-semibold">{po.po_number || `PO-${po.id}`}</td>
                    <td>{po.supplier_name || "-"}</td>
                    <td>{po.order_date || "-"}</td>
                    <td>
                      <span className={getStatusBadgeClass(po.status || "draft", "purchase")}>
                        {formatStatusLabel(po.status || "draft")}
                      </span>
                    </td>
                    <td>{Number(po.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(po)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(po.id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={Math.min(page, totalPages || 1)}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.35)" }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <form onSubmit={handleSave}>
                <div className="modal-header"><h5 className="modal-title">{isEditing ? "Edit Purchase Order" : "New Purchase Order"}</h5><button type="button" className="btn-close" onClick={() => setShowModal(false)}></button></div>
                <div className="modal-body">
                  <div className="row g-3 mb-3">
                    <div className="col-md-3"><label className="form-label">PO Number</label><input className="form-control" value={form.po_number} disabled readOnly /></div>
                    <div className="col-md-3"><label className="form-label">Supplier</label><select className="form-select" value={form.supplier_id} onChange={(e) => setForm((prev) => ({ ...prev, supplier_id: e.target.value }))}><option value="">Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
                    <div className="col-md-2"><label className="form-label">Order Date *</label><input type="date" className="form-control" value={form.order_date} onChange={(e) => setForm((prev) => ({ ...prev, order_date: e.target.value }))} /></div>
                    <div className="col-md-2"><label className="form-label">Expected Date</label><input type="date" className="form-control" value={form.expected_date} onChange={(e) => setForm((prev) => ({ ...prev, expected_date: e.target.value }))} /></div>
                    <div className="col-md-2"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
                  </div>

                  <div className="table-responsive border rounded">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light"><tr><th style={{ width: "35%" }}>Product *</th><th style={{ width: "12%" }}>Qty *</th><th style={{ width: "15%" }}>Unit Cost *</th><th>Description</th><th style={{ width: "8%" }}></th></tr></thead>
                      <tbody>
                        {form.items.map((item, index) => (
                          <tr key={index}>
                            <td><select className="form-select form-select-sm" value={item.product_id} onChange={(e) => updateRow(index, "product_id", e.target.value)}><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku || "NA"})</option>)}</select></td>
                            <td><input type="number" min="0.01" step="0.01" className="form-control form-control-sm" value={item.qty} onChange={(e) => updateRow(index, "qty", e.target.value)} /></td>
                            <td><input type="number" min="0" step="0.01" className="form-control form-control-sm" value={item.unit_cost} onChange={(e) => updateRow(index, "unit_cost", e.target.value)} /></td>
                            <td><input className="form-control form-control-sm" value={item.description} onChange={(e) => updateRow(index, "description", e.target.value)} /></td>
                            <td><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeRow(index)}>X</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-3"><button type="button" className="btn btn-sm btn-outline-primary" onClick={addRow}>+ Add Row</button><div className="fw-semibold">Total: {totalAmount.toFixed(2)}</div></div>
                  <div className="mt-3"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
                </div>
                <div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : isEditing ? "Update Purchase Order" : "Create Purchase Order"}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
