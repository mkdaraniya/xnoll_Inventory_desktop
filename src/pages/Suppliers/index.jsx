import React, { useEffect, useMemo, useState } from "react";
import Pagination from "../../components/common/Pagination";
import { ensureSuccess, notifyError } from "../../utils/feedback";
import { isValidEmail, isValidPhone, validateRequiredFields } from "../../utils/validation";

const emptyForm = {
  id: null,
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  tax_number: "",
  address: "",
  status: "active",
};

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("desc");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadSuppliers = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const res = await window.xnoll.suppliersQuery({
        page,
        pageSize,
        search,
        sortKey,
        sortDir,
      });
      ensureSuccess(res, "Unable to load suppliers.");
      setSuppliers(res.rows || []);
      setTotal(Number(res.total || 0));
      setTotalPages(Number(res.totalPages || 1));
    } catch (error) {
      notifyError(error, "Unable to load suppliers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [page, pageSize, search, sortKey, sortDir]);

  const resetForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
  };

  const validate = () => {
    const name = form.name.trim();
    const requiredError = validateRequiredFields({ name }, { name: "Supplier name" });
    if (requiredError) return requiredError;
    if (!isValidEmail(form.email)) return "Please enter a valid email address.";
    if (!isValidPhone(form.phone)) return "Please enter a valid phone number.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const validationError = validate();
    if (validationError) return notifyError(validationError);

    const payload = {
      ...form,
      name: form.name.trim(),
      contact_person: form.contact_person.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      tax_number: form.tax_number.trim(),
      address: form.address.trim(),
    };

    setLoading(true);
    try {
      const result = isEditing
        ? await window.xnoll.suppliersUpdate(payload)
        : await window.xnoll.suppliersCreate(payload);
      ensureSuccess(result, "Unable to save supplier.");

      resetForm();
      setShowModal(false);
      await loadSuppliers();
    } catch (error) {
      notifyError(error, "Unable to save supplier.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier) => {
    setForm({
      id: supplier.id,
      name: supplier.name || "",
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      tax_number: supplier.tax_number || "",
      address: supplier.address || "",
      status: supplier.status || "active",
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.xnoll) return;
    if (!window.confirm("Delete this supplier?")) return;

    setLoading(true);
    try {
      ensureSuccess(await window.xnoll.suppliersDelete(id), "Unable to delete supplier.");
      await loadSuppliers();
    } catch (error) {
      notifyError(error, "Unable to delete supplier.");
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

  const sortIcon = (key) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? "▲" : "▼";
  };

  const currentPage = useMemo(() => Math.min(page, totalPages || 1), [page, totalPages]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">Suppliers</h4>
          <small className="text-muted">Manage vendors and procurement contacts</small>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + New Supplier
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex gap-2">
          <input
            className="form-control"
            placeholder="Search name, contact, phone, email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button className="btn btn-outline-secondary" onClick={loadSuppliers} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-striped align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("name")}>Name {sortIcon("name")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("contact_person")}>Contact Person {sortIcon("contact_person")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("phone")}>Phone {sortIcon("phone")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("email")}>Email {sortIcon("email")}</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("status")}>Status {sortIcon("status")}</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="fw-semibold">{supplier.name}</td>
                    <td>{supplier.contact_person || "-"}</td>
                    <td>{supplier.phone || "-"}</td>
                    <td>{supplier.email || "-"}</td>
                    <td>
                      <span className={`badge ${supplier.status === "active" ? "bg-success" : "bg-secondary"}`}>
                        {supplier.status || "active"}
                      </span>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleEdit(supplier)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(supplier.id)}>Delete</button>
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
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.35)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">{isEditing ? "Edit Supplier" : "New Supplier"}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">Supplier Name *</label><input className="form-control" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
                    <div className="col-md-6"><label className="form-label">Contact Person</label><input className="form-control" value={form.contact_person} onChange={(e) => setForm((prev) => ({ ...prev, contact_person: e.target.value }))} /></div>
                    <div className="col-md-6"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} /></div>
                    <div className="col-md-6"><label className="form-label">Email</label><input className="form-control" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
                    <div className="col-md-6"><label className="form-label">Tax / GST Number</label><input className="form-control" value={form.tax_number} onChange={(e) => setForm((prev) => ({ ...prev, tax_number: e.target.value }))} /></div>
                    <div className="col-md-6"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                    <div className="col-12"><label className="form-label">Address</label><textarea className="form-control" rows={3} value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} /></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Saving..." : isEditing ? "Update Supplier" : "Create Supplier"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
