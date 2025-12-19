import React, { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "../../components/common/Pagination";
import { formatCurrency } from "../../utils/format";

const STATUS_OPTIONS = ["unpaid", "partially_paid", "paid", "cancelled"];
const PAGE_SIZE = 10;

const emptyForm = {
  id: null,
  customer_id: "",
  total: "",
  invoice_date: "",
  status: "unpaid",
};

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState("invoice_date");
  const [sortDir, setSortDir] = useState("desc");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [currency, setCurrency] = useState("INR");

  const customerInputRef = useRef(null);

  const loadInvoices = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const [invoiceRows, customerRows, settingsRes] = await Promise.all([
        window.xnoll.invoicesList(),
        window.xnoll.customersList(),
        window.xnoll.settingsGet(),
      ]);
      setInvoices(invoiceRows);
      setCustomers(customerRows);
      if (settingsRes?.success && settingsRes.settings) {
        setCurrency(settingsRes.settings.currency || "INR");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) => {
      return (
        (c.name || "").toLowerCase().includes(term) ||
        (c.phone || "").toLowerCase().includes(term) ||
        String(c.id || "").includes(term)
      );
    });
  }, [customers, customerSearch]);

  // maps for quick lookup
  const customerMap = useMemo(() => {
    const m = {};
    customers.forEach((c) => {
      m[c.id] = c;
    });
    return m;
  }, [customers]);

  // attach display names
  const enrichedInvoices = useMemo(
    () =>
      invoices.map((inv) => {
        const cust = customerMap[inv.customer_id];
        return {
          ...inv,
          customer_name: cust ? cust.name : `#${inv.customer_id || "-"}`,
        };
      }),
    [invoices, customerMap]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let data = [...enrichedInvoices];

    if (statusFilter) {
      data = data.filter((inv) => (inv.status || "") === statusFilter);
    }

    if (term) {
      data = data.filter((inv) => {
        return (
          String(inv.id || "").includes(term) ||
          (inv.customer_name || "").toLowerCase().includes(term) ||
          String(inv.customer_id || "").includes(term)
        );
      });
    }

    data.sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [enrichedInvoices, search, statusFilter, sortKey, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const s = status || "unpaid";
    const cap = s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    let bgClass = "bg-secondary";
    if (s === "unpaid") bgClass = "bg-warning text-dark";
    else if (s === "partially_paid") bgClass = "bg-info";
    else if (s === "paid") bgClass = "bg-success";
    else if (s === "cancelled") bgClass = "bg-danger";
    return <span className={`badge ${bgClass}`}>{cap}</span>;
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? "▲" : "▼";
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  // -------- form / modal ----------
  const resetForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
  };

  const openNewModal = () => {
    resetForm();
    setCustomerSearch("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setCustomerSearch("");
    setShowCustomerDropdown(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const payload = {
      id: form.id,
      customer_id: Number(form.customer_id) || null,
      total: parseFloat(form.total || "0") || 0,
      invoice_date: form.invoice_date.trim(),
      status: form.status || "unpaid",
    };

    if (!payload.customer_id || !payload.invoice_date) {
      alert("Please fill all required fields.");
      return;
    }

    setLoading(true);
    try {
      if (isEditing && payload.id != null) {
        await window.xnoll.invoicesUpdate(payload);
      } else {
        await window.xnoll.invoicesCreate(payload);
      }
      resetForm();
      setShowModal(false);
      await loadInvoices();
    } catch (err) {
      console.error("Error saving invoice:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (inv) => {
    setForm({
      id: inv.id,
      customer_id: inv.customer_id || "",
      total: inv.total != null ? String(inv.total) : "",
      invoice_date: inv.invoice_date || "",
      status: inv.status || "unpaid",
    });
    const cust = customerMap[inv.customer_id];
    setCustomerSearch(cust ? `${cust.name} (ID: ${inv.customer_id})` : "");
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.xnoll) return;
    if (!window.confirm("Delete this invoice?")) return;

    setLoading(true);
    try {
      await window.xnoll.invoicesDelete(id);
      await loadInvoices();
    } catch (err) {
      console.error("Error deleting invoice:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (invoice) => {
    if (!window.xnoll) return;

    // Generate HTML for invoice
    const htmlContent = generateInvoiceHTML(invoice);

    try {
      await window.xnoll.print(htmlContent);
    } catch (err) {
      console.error("Error printing invoice:", err);
      alert("Print failed. Please try again.");
    }
  };

  const generateInvoiceHTML = (invoice) => {
    const customer = customers.find((c) => c.id === invoice.customer_id);
    const date = new Date(invoice.invoice_date).toLocaleDateString();
    const status = invoice.status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice #${invoice.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .customer-info { margin-bottom: 20px; }
            .amount { font-size: 24px; font-weight: bold; text-align: right; }
            .status { padding: 5px 10px; border-radius: 4px; color: white; }
            .status-unpaid { background-color: #dc3545; }
            .status-paid { background-color: #28a745; }
            .status-partially_paid { background-color: #ffc107; color: #000; }
            .status-cancelled { background-color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Xnoll Invoice</h1>
            <h2>Invoice #${invoice.id}</h2>
          </div>

          <div class="invoice-details">
            <div>
              <strong>Date:</strong> ${date}<br>
              <strong>Status:</strong> <span class="status status-${invoice.status}">${status}</span>
            </div>
            <div class="amount">
{formatCurrency(invoice.total, currency)}
            </div>
          </div>

          ${
            customer
              ? `
            <div class="customer-info">
              <h3>Bill To:</h3>
              <p>
                ${customer.name}<br>
                ${customer.phone ? `Phone: ${customer.phone}<br>` : ""}
                ${customer.email ? `Email: ${customer.email}<br>` : ""}
              </p>
            </div>
          `
              : ""
          }

          <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
            Thank you for your business!
          </div>
        </body>
      </html>
    `;
  };

  return (
    <div>
      <h4 className="mb-3">Invoices</h4>

      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body d-flex flex-wrap gap-2 justify-content-between align-items-center">
          <div>
            <strong>Total:</strong> {total}{" "}
            <span className="text-muted small">
              (page {currentPage} of {totalPages})
            </span>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: 150 }}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value || "");
                setPage(1);
              }}
            >
              <option value="">All status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search customer / ID"
              style={{ minWidth: 220 }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <button
              className="btn btn-sm btn-primary"
              onClick={openNewModal}
              disabled={loading || !customers.length}
              title={!customers.length ? "Add customers first" : ""}
            >
              + New Invoice
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
                    style={{ width: "180px", cursor: "pointer" }}
                    onClick={() => handleSort("customer_name")}
                  >
                    Customer {sortIcon("customer_name")}
                  </th>
                  <th
                    style={{ width: "140px", cursor: "pointer" }}
                    onClick={() => handleSort("invoice_date")}
                  >
                    Date {sortIcon("invoice_date")}
                  </th>
                  <th
                    style={{ width: "120px", cursor: "pointer" }}
                    onClick={() => handleSort("total")}
                  >
                    Total {sortIcon("total")}
                  </th>
                  <th
                    style={{ width: "120px", cursor: "pointer" }}
                    onClick={() => handleSort("status")}
                  >
                    Status {sortIcon("status")}
                  </th>
                  <th style={{ width: "140px" }} className="text-end">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.id}</td>
                    <td
                      style={{
                        maxWidth: "180px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {inv.customer_name}
                    </td>
                    <td>{formatDate(inv.invoice_date)}</td>
                    <td>{formatCurrency(inv.total, currency)}</td>
                    <td>{getStatusBadge(inv.status)}</td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1 flex-wrap">
                        <button
                          className="btn btn-sm btn-outline-info"
                          disabled={loading}
                          onClick={() => handlePrint(inv)}
                          title="Print Invoice"
                        >
                          🖨️
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          disabled={loading}
                          onClick={() => handleEdit(inv)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          disabled={loading}
                          onClick={() => handleDelete(inv.id)}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!pageData.length && !loading && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
            Invoices are stored in local.
          </small>
        </div>
      </div>

      {/* Modal for add/edit invoice */}
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
              className="modal-dialog modal-dialog-centered"
              style={{ maxWidth: "480px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <form onSubmit={handleSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">
                      {isEditing ? "Edit Invoice" : "New Invoice"}
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
                      <label className="form-label mb-0 small">
                        Customer *
                      </label>
                      <div className="position-relative mb-1">
                        <input
                          ref={customerInputRef}
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Search by name / phone / ID"
                          value={customerSearch}
                          onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setShowCustomerDropdown(true);
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          onBlur={() =>
                            setTimeout(
                              () => setShowCustomerDropdown(false),
                              150
                            )
                          }
                          disabled={loading || !customers.length}
                        />
                        {showCustomerDropdown &&
                          filteredCustomers.length > 0 && (
                            <div
                              className="position-absolute top-100 start-0 w-100 bg-white border shadow-sm"
                              style={{
                                zIndex: 10,
                                maxHeight: "150px",
                                overflowY: "auto",
                              }}
                            >
                              {filteredCustomers.slice(0, 10).map((c) => (
                                <div
                                  key={c.id}
                                  className="p-2 border-bottom small"
                                  style={{ cursor: "pointer" }}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setForm((prev) => ({
                                      ...prev,
                                      customer_id: c.id,
                                    }));
                                    setCustomerSearch(
                                      `${c.name}${
                                        c.phone ? ` - ${c.phone}` : ""
                                      } (ID: ${c.id})`
                                    );
                                    setShowCustomerDropdown(false);
                                  }}
                                >
                                  <div className="fw-bold">{c.name}</div>
                                  <small className="text-muted">
                                    {c.phone || "No phone"} • ID: {c.id}
                                  </small>
                                </div>
                              ))}
                              {filteredCustomers.length > 10 && (
                                <div className="p-2 small text-muted">
                                  ... and {filteredCustomers.length - 10} more
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                      <small className="text-muted">
                        {form.customer_id
                          ? `Selected: ${customerMap[form.customer_id]?.name || "Unknown"}`
                          : "No customer selected"}
                      </small>
                    </div>
                    <div className="mb-2">
                      <label className="form-label mb-0 small">
                        Invoice Date *
                      </label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        name="invoice_date"
                        value={form.invoice_date}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label mb-0 small">
                        Total Amount *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control form-control-sm"
                        name="total"
                        value={form.total}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="mb-0">
                      <label className="form-label mb-0 small">Status</label>
                      <select
                        className="form-select form-select-sm"
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        disabled={loading}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>
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

export default Invoices;
