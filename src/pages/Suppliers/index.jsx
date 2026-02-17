import React, { useEffect, useMemo, useState } from "react";
import CustomFieldRenderer from "../../components/CustomField/CustomFieldRenderer";
import Pagination from "../../components/common/Pagination";
import UnifiedLoader from "../../components/common/UnifiedLoader";
import {
  confirmAction,
  ensureSuccess,
  notifyError,
  notifySuccess,
} from "../../utils/feedback";
import {
  deserializeCustomFieldValue,
  formatCustomFieldDisplayValue,
  serializeCustomFieldValue,
} from "../../utils/customFields";
import { formatStatusLabel, getStatusBadgeClass } from "../../utils/status";
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
  const [customFields, setCustomFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});
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
      const [res, fields] = await Promise.all([
        window.xnoll.suppliersQuery({
          page,
          pageSize,
          search,
          sortKey,
          sortDir,
        }),
        window.xnoll.customFieldsList("suppliers"),
      ]);
      ensureSuccess(res, "Unable to load suppliers.");
      setSuppliers(res.rows || []);
      setCustomFields(fields || []);
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
    setCustomFieldValues({});
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
      let supplierId;
      const result = isEditing
        ? await window.xnoll.suppliersUpdate(payload)
        : await window.xnoll.suppliersCreate(payload);
      ensureSuccess(result, "Unable to save supplier.");
      supplierId = isEditing ? payload.id : result.id;

      if (customFields.length > 0 && supplierId) {
        for (const field of customFields) {
          const value = customFieldValues[field.name];
          const serializedValue = serializeCustomFieldValue(field, value);
          if (serializedValue !== "") {
            await window.xnoll.customFieldValuesSave({
              field_id: field.id,
              record_id: supplierId,
              value: serializedValue,
            });
          }
        }
      }

      resetForm();
      setShowModal(false);
      await loadSuppliers();
      notifySuccess(isEditing ? "Supplier updated successfully." : "Supplier created successfully.");
    } catch (error) {
      notifyError(error, "Unable to save supplier.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (supplier) => {
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

    if (customFields.length > 0) {
      try {
        const values = {};
        for (const field of customFields) {
          const result = await window.xnoll.customFieldValuesGet(field.id, supplier.id);
          if (result && result.value !== undefined) {
            values[field.name] = deserializeCustomFieldValue(field, result.value);
          }
        }
        setCustomFieldValues(values);
      } catch (err) {
        notifyError(err, "Unable to load custom field values.");
      }
    }

    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.xnoll) return;
    const confirmed = await confirmAction({
      title: "Delete supplier?",
      text: "This supplier will be removed permanently.",
      confirmButtonText: "Delete",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      ensureSuccess(await window.xnoll.suppliersDelete(id), "Unable to delete supplier.");
      await loadSuppliers();
      notifySuccess("Supplier deleted successfully.");
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
      <UnifiedLoader show={loading} text="Loading suppliers..." />

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
                {(Array.isArray(customFields)
                  ? customFields.filter((f) => f.display_in_grid)
                  : []
                ).map((f) => (
                  <th key={f.id}>{f.label}</th>
                ))}
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      6 +
                      (Array.isArray(customFields)
                        ? customFields.filter((f) => f.display_in_grid)
                        : []
                      ).length
                    }
                    className="text-center text-muted py-4"
                  >
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
                      <span className={getStatusBadgeClass(supplier.status || "active", "supplier")}>
                        {formatStatusLabel(supplier.status || "active")}
                      </span>
                    </td>
                    {(Array.isArray(customFields)
                      ? customFields.filter((f) => f.display_in_grid)
                      : []
                    ).map((f) => (
                      <td key={f.id}>
                        {formatCustomFieldDisplayValue(
                          f,
                          supplier.custom_fields?.[f.name] ?? f.default_value
                        )}
                      </td>
                    ))}
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
                    <div className="col-md-6">
                      <label className="form-label d-block">Status</label>
                      <div className="form-check form-switch ui-switch mt-1">
                        <input
                          id="supplier-active"
                          className="form-check-input"
                          type="checkbox"
                          checked={String(form.status || "active").toLowerCase() === "active"}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              status: e.target.checked ? "active" : "inactive",
                            }))
                          }
                        />
                        <label className="form-check-label" htmlFor="supplier-active">
                          {String(form.status || "active").toLowerCase() === "active"
                            ? "Active"
                            : "Inactive"}
                        </label>
                      </div>
                    </div>
                    <div className="col-12"><label className="form-label">Address</label><textarea className="form-control" rows={3} value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} /></div>
                  </div>
                  {customFields.length > 0 && (
                    <div className="mt-3">
                      <CustomFieldRenderer
                        fields={customFields}
                        values={customFieldValues}
                        onChange={(name, value) =>
                          setCustomFieldValues((prev) => ({ ...prev, [name]: value }))
                        }
                        module="suppliers"
                        loading={loading}
                      />
                    </div>
                  )}
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
