import React, { useEffect, useMemo, useState } from "react";
import Pagination from "../../components/common/Pagination";
import { ensureSuccess, notifyError } from "../../utils/feedback";
import { validateRequiredFields } from "../../utils/validation";

const emptyForm = {
  id: null,
  code: "",
  name: "",
  address: "",
  city: "",
  state: "",
  country: "",
  is_active: 1,
  is_primary: 0,
};

const Warehouses = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const res = await window.xnoll.warehousesQuery({
        page,
        pageSize,
        search,
        sortKey,
        sortDir,
      });
      ensureSuccess(res, "Unable to load warehouses.");
      setRows(res.rows || []);
      setTotal(Number(res.total || 0));
      setTotalPages(Number(res.totalPages || 1));
    } catch (error) {
      notifyError(error, "Unable to load warehouses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize, search, sortKey, sortDir]);

  const openCreate = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setForm({ ...row });
    setIsEditing(true);
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const err = validateRequiredFields({ name: form.name }, { name: "Warehouse name" });
    if (err) return notifyError(err);

    setLoading(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        code: form.code?.trim(),
        address: form.address?.trim(),
        city: form.city?.trim(),
        state: form.state?.trim(),
        country: form.country?.trim(),
        is_active: form.is_active ? 1 : 0,
        is_primary: form.is_primary ? 1 : 0,
      };

      const res = isEditing
        ? await window.xnoll.warehousesUpdate(payload)
        : await window.xnoll.warehousesCreate(payload);
      ensureSuccess(res, "Unable to save warehouse.");

      setShowModal(false);
      await loadData();
    } catch (error) {
      notifyError(error, "Unable to save warehouse.");
    } finally {
      setLoading(false);
    }
  };

  const removeWarehouse = async (id) => {
    if (!window.xnoll) return;
    if (!window.confirm("Delete this warehouse?")) return;

    setLoading(true);
    try {
      ensureSuccess(await window.xnoll.warehousesDelete(id), "Unable to delete warehouse.");
      await loadData();
    } catch (error) {
      notifyError(error, "Unable to delete warehouse.");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const sortIcon = (key) => (sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : "");
  const currentPage = useMemo(() => Math.min(page, totalPages || 1), [page, totalPages]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">Warehouses</h4>
          <small className="text-muted">Manage multiple storage locations and fulfillment nodes</small>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Warehouse</button>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex gap-2">
          <input className="form-control" placeholder="Search code, name, city, state" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <button className="btn btn-outline-secondary" onClick={loadData} disabled={loading}>Refresh</button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-striped align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("code")}>Code {sortIcon("code")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("name")}>Name {sortIcon("name")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("city")}>City {sortIcon("city")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("state")}>State {sortIcon("state")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("country")}>Country {sortIcon("country")}</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted py-4">No warehouses available.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.code || "-"}</td>
                    <td>{row.name}{row.is_primary ? <span className="badge bg-primary ms-2">Primary</span> : null}</td>
                    <td>{row.city || "-"}</td>
                    <td>{row.state || "-"}</td>
                    <td>{row.country || "-"}</td>
                    <td><span className={`badge ${row.is_active ? "bg-success" : "bg-secondary"}`}>{row.is_active ? "Active" : "Inactive"}</span></td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(row)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => removeWarehouse(row.id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />

      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0, 0, 0, 0.35)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={save}>
                <div className="modal-header">
                  <h5 className="modal-title">{isEditing ? "Edit Warehouse" : "New Warehouse"}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-4"><label className="form-label">Code</label><input className="form-control" value={form.code || ""} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} /></div>
                    <div className="col-md-8"><label className="form-label">Name *</label><input className="form-control" value={form.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
                    <div className="col-md-12"><label className="form-label">Address</label><input className="form-control" value={form.address || ""} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /></div>
                    <div className="col-md-4"><label className="form-label">City</label><input className="form-control" value={form.city || ""} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} /></div>
                    <div className="col-md-4"><label className="form-label">State</label><input className="form-control" value={form.state || ""} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} /></div>
                    <div className="col-md-4"><label className="form-label">Country</label><input className="form-control" value={form.country || ""} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} /></div>
                    <div className="col-md-6 form-check ms-2"><input id="wh-active" type="checkbox" className="form-check-input" checked={!!form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked ? 1 : 0 }))} /><label htmlFor="wh-active" className="form-check-label">Active</label></div>
                    <div className="col-md-6 form-check ms-2"><input id="wh-primary" type="checkbox" className="form-check-input" checked={!!form.is_primary} onChange={(e) => setForm((p) => ({ ...p, is_primary: e.target.checked ? 1 : 0 }))} /><label htmlFor="wh-primary" className="form-check-label">Primary warehouse</label></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouses;
