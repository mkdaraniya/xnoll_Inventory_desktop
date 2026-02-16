import React, { useEffect, useMemo, useState } from "react";
import CustomFieldRenderer from "../../components/CustomField/CustomFieldRenderer";
import Pagination from "../../components/common/Pagination";
import { ensureSuccess, notifyError } from "../../utils/feedback";
import { isValidEmail, isValidPhone, validateRequiredFields } from "../../utils/validation";

const emptyForm = { id: null, name: "", phone: "", email: "" };

const PAGE_SIZE = 10;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("desc"); // 'asc' | 'desc'
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);

  const loadCustomers = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const [res, fields] = await Promise.all([
        window.xnoll.customersQuery({
          page,
          pageSize,
          search,
          sortKey,
          sortDir,
        }),
        window.xnoll.customFieldsList("customers"),
      ]);
      ensureSuccess(res, "Unable to load customers.");
      setCustomers(res.rows || []);
      setTotal(Number(res.total || 0));
      setTotalPages(Number(res.totalPages || 1));
      setCustomFields(fields || []);
    } catch (error) {
      notifyError(error, "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, pageSize, search, sortKey, sortDir]);

  const currentPage = Math.min(page, totalPages || 1);
  const pageData = useMemo(() => customers, [customers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setCustomFieldValues({});
    setIsEditing(false);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const payload = {
      id: form.id,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    };

    const requiredError = validateRequiredFields({ name: payload.name }, { name: "Name" });
    if (requiredError) return notifyError(requiredError);
    if (!isValidEmail(payload.email)) return notifyError("Enter a valid email address.");
    if (!isValidPhone(payload.phone)) return notifyError("Enter a valid phone number.");

    setLoading(true);
    try {
      let customerId;
      if (isEditing && payload.id != null) {
        ensureSuccess(await window.xnoll.customersUpdate(payload), "Unable to update customer.");
        customerId = payload.id;
      } else {
        const result = ensureSuccess(await window.xnoll.customersCreate(payload), "Unable to create customer.");
        customerId = result.id;
      }

      // Save custom field values
      if (customFields.length > 0 && customerId) {
        for (const field of customFields) {
          const value = customFieldValues[field.name];
          if (value !== undefined && value !== "") {
            await window.xnoll.customFieldValuesSave({
              field_id: field.id,
              record_id: customerId,
              value: String(value),
            });
          }
        }
      }

      resetForm();
      setShowModal(false);
      await loadCustomers();
    } catch (error) {
      notifyError(error, "Unable to save customer.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (customer) => {
    setForm({
      id: customer.id,
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
    });

    // Load custom field values for this customer
    if (customFields.length > 0) {
      try {
        const values = {};
        for (const field of customFields) {
          const result = await window.xnoll.customFieldValuesGet(
            field.id,
            customer.id
          );
          if (result && result.value !== undefined) {
            values[field.name] = result.value;
          }
        }
        setCustomFieldValues(values);
      } catch (err) {
        console.error("Failed to load custom field values:", err);
      }
    }

    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.xnoll) return;
    if (!window.confirm("Delete this customer?")) return;

    setLoading(true);
    try {
      ensureSuccess(await window.xnoll.customersDelete(id), "Unable to delete customer.");
      await loadCustomers();
    } catch (error) {
      notifyError(error, "Unable to delete customer.");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
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

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <div>
      <h4 className="mb-3">Customers</h4>

      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body d-flex flex-wrap gap-2 justify-content-between align-items-center">
          <div>
            <strong>Total:</strong> {total}{" "}
            <span className="text-muted small">
              (page {currentPage} of {totalPages})
            </span>
          </div>
          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search name / phone / email"
              style={{ minWidth: 220 }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <button className="btn btn-sm btn-primary" onClick={openNewModal}>
              + New Customer
            </button>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          {loading && <div className="text-muted small mb-2">Loading...</div>}
          <div className="table-responsive" style={{ maxHeight: "60vh" }}>
            <table className="table table-sm table-striped align-middle">
              <thead className="table-light">
                <tr>
                  <th
                    style={{ width: "60px", cursor: "pointer" }}
                    onClick={() => handleSort("id")}
                  >
                    ID {sortIcon("id")}
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("name")}
                  >
                    Name {sortIcon("name")}
                  </th>
                  <th
                    style={{ width: "140px", cursor: "pointer" }}
                    onClick={() => handleSort("phone")}
                  >
                    Phone {sortIcon("phone")}
                  </th>
                  <th
                    style={{ width: "200px", cursor: "pointer" }}
                    onClick={() => handleSort("email")}
                  >
                    Email {sortIcon("email")}
                  </th>
                  {(Array.isArray(customFields)
                    ? customFields.filter((f) => f.display_in_grid)
                    : []
                  ).map((f) => (
                    <th
                      key={f.id}
                      style={{ cursor: f.sortable ? "pointer" : "default" }}
                      onClick={() => f.sortable && handleSort(f.name)}
                    >
                      {f.label} {f.sortable && sortIcon(f.name)}
                    </th>
                  ))}
                  <th style={{ width: "140px" }} className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{c.email}</td>
                    {(Array.isArray(customFields)
                      ? customFields.filter((f) => f.display_in_grid)
                      : []
                    ).map((f) => (
                      <td key={f.id}>
                        {c.custom_fields?.[f.name] ?? f.default_value ?? "-"}
                      </td>
                    ))}
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => handleEdit(c)}
                        disabled={loading}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(c.id)}
                        disabled={loading}
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
                {!pageData.length && !loading && (
                  <tr>
                    <td
                      colSpan={
                        5 +
                        (Array.isArray(customFields)
                          ? customFields.filter((f) => f.display_in_grid)
                          : []
                        ).length
                      }
                      className="text-center text-muted"
                    >
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={goToPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1); // Reset to first page when changing page size
            }}
            totalItems={total}
          />

          <small className="text-muted d-block mt-2">
            Data stored locally in SQLite.
          </small>
        </div>
      </div>

      {/* Modal for add/edit */}
      {showModal && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            style={{ zIndex: 1050 }}
            onClick={closeModal}
          >
            <div
              className="modal-dialog modal-dialog-centered modal-sm"
              style={{ maxWidth: "420px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <form onSubmit={handleSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {isEditing ? "Edit Customer" : "New Customer"}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={closeModal}
                      disabled={loading}
                    />
                  </div>
                  <div className="modal-body">
                    <div className="mb-2">
                      <label className="form-label mb-0 small">Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label mb-0 small">Phone</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>
                    <div className="mb-0">
                      <label className="form-label mb-0 small">Email</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>
                    {customFields.length > 0 && (
                      <div className="mt-3">
                        <CustomFieldRenderer
                          fields={customFields}
                          values={customFieldValues}
                          onChange={(name, value) =>
                            setCustomFieldValues((prev) => ({
                              ...prev,
                              [name]: value,
                            }))
                          }
                          module="customers"
                          loading={loading}
                        />
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={closeModal}
                      disabled={loading}
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary"
                      disabled={loading}
                    >
                      {isEditing ? "Update" : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1040 }}
            onClick={closeModal}
          />
        </>
      )}
    </div>
  );
};

export default Customers;
