import React, { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "../../components/common/Pagination";
import { formatCurrency } from "../../utils/format";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const STATUS_OPTIONS = ["unpaid", "partially_paid", "paid", "cancelled"];
const PAGE_SIZE = 10;

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
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [viewInvoice, setViewInvoice] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const invoiceRef = useRef(null);
  const viewInvoiceRef = useRef(null);

  const [company, setCompany] = useState({
    name: "Xnoll Booking",
    tax_id: "",
    phone: "",
    email: "",
    website: "",
    address: "",
  });

  const customerInputRef = useRef(null);

  const handleDownloadPDF = async () => {
    console.log(
      "handle download pdf clicked",
      viewInvoiceRef.current,
      viewInvoice
    );
    if (!viewInvoiceRef.current || !viewInvoice) return;
    console.log("Downloading PDF for invoice:", viewInvoice.id);

    const element = viewInvoiceRef.current;

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pageHeight = 297;
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Invoice_${viewInvoice.id}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF");
    }
  };

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

  useEffect(() => {
    const loadCompany = async () => {
      if (!window.xnoll) return;
      try {
        const res = await window.xnoll.companyGet();
        if (res.success && res.company) {
          setCompany(res.company);
        }
      } catch (err) {
        console.error("Failed to load company:", err);
      }
    };
    loadCompany();
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
  const handleView = async (invoice) => {
    if (!window.xnoll) return;

    try {
      const full = await window.xnoll.invoicesGetById(invoice.id);
      setViewInvoice(full);
      setShowViewModal(true);
    } catch (err) {
      console.error("Failed to load invoice", err);
      alert("Failed to load invoice");
    }
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
                          className="btn btn-sm btn-outline-primary"
                          disabled={loading}
                          onClick={() => handleView(inv)}
                          title="View Invoice"
                        >
                          View
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
                <div className="modal-header">
                  <h5 className="modal-title">{"New Invoice"}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeModal}
                    disabled={loading}
                  />
                </div>
                <div className="modal-body" ref={viewInvoiceRef}>
                  <div className="mb-2">
                    <label className="form-label mb-0 small">Customer *</label>
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
                          setTimeout(() => setShowCustomerDropdown(false), 150)
                        }
                        disabled={loading || !customers.length}
                      />
                      {showCustomerDropdown && filteredCustomers.length > 0 && (
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
                    {"Save"}
                  </button>
                </div>
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

      {showViewModal && viewInvoice && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ zIndex: 1050 }}
            onClick={() => setShowViewModal(false)}
          >
            <div
              className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header border-0">
                  <h5 className="modal-title fw-bold text-primary">
                    Invoice #{viewInvoice.id}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowViewModal(false)}
                  />
                </div>

                <div className="modal-body p-0">
                  {/* === PRINTABLE INVOICE CONTENT === */}
                  <div
                    ref={viewInvoiceRef}
                    className="bg-white"
                    style={{
                      padding: "40px",
                      fontFamily: "'Segoe UI', Arial, sans-serif",
                      color: "#333",
                      minHeight: "100vh",
                    }}
                  >
                    {/* Company Header */}
                    <div className="text-center mb-5 pb-4 border-bottom">
                      <h3
                        className="fw-bold text-primary mb-1"
                        style={{ fontSize: "24px" }}
                      >
                        {company?.name || "Your Company Name"}
                      </h3>
                      {company?.tax_id && (
                        <p className="text-muted small mb-1">
                          Tax ID: {company.tax_id}
                        </p>
                      )}
                      {company?.phone && (
                        <p className="text-muted small mb-1">
                          Phone: {company.phone}
                        </p>
                      )}
                      {company?.email && (
                        <p className="text-muted small mb-1">
                          Email: {company.email}
                        </p>
                      )}
                      {company?.website && (
                        <p className="text-muted small mb-0">
                          Website: {company.website}
                        </p>
                      )}
                    </div>

                    {/* Invoice Info & Customer */}
                    <div className="row mb-5">
                      <div className="col-6">
                        <h5 className="fw-bold text-dark">Bill To:</h5>
                        <p className="mb-0 fw-semibold">
                          {viewInvoice.customer_name}
                        </p>
                        <p className="text-muted small">
                          Customer ID: {viewInvoice.customer_id}
                        </p>
                      </div>
                      <div className="col-6 text-end">
                        <h5 className="fw-bold text-dark">Invoice Details</h5>
                        <p className="mb-1">
                          <strong>Invoice #:</strong> {viewInvoice.id}
                        </p>
                        <p className="mb-1">
                          <strong>Date:</strong>{" "}
                          {formatDate(viewInvoice.invoice_date)}
                        </p>
                        <p className="mb-0">
                          <strong>Status:</strong>{" "}
                          {getStatusBadge(viewInvoice.status)}
                        </p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="table-responsive mb-5">
                      <table
                        className="table table-bordered"
                        style={{ borderCollapse: "collapse" }}
                      >
                        <thead className="bg-light">
                          <tr>
                            <th className="py-2 px-3 text-start fw-semibold">
                              Item
                            </th>
                            <th className="py-2 px-3 text-center fw-semibold">
                              Qty
                            </th>
                            <th className="py-2 px-3 text-end fw-semibold">
                              Rate
                            </th>
                            <th className="py-2 px-3 text-end fw-semibold">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewInvoice.items?.map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3">
                                {it.product_name || it.description || "Item"}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {it.qty}
                              </td>
                              <td className="py-2 px-3 text-end">
                                {formatCurrency(it.unit_price, currency)}
                              </td>
                              <td className="py-2 px-3 text-end fw-semibold">
                                {formatCurrency(it.line_total, currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Total Section */}
                    <div className="row justify-content-end">
                      <div className="col-lg-5 col-md-6">
                        <div className="bg-light p-4 rounded">
                          {viewInvoice.discount > 0 && (
                            <div className="d-flex justify-content-between mb-2">
                              <span className="fw-medium">Discount:</span>
                              <span>
                                {formatCurrency(viewInvoice.discount, currency)}
                              </span>
                            </div>
                          )}
                          <div className="d-flex justify-content-between border-top pt-3">
                            <h4 className="fw-bold text-dark mb-0">Total:</h4>
                            <h4 className="fw-bold text-primary mb-0">
                              {formatCurrency(viewInvoice.total, currency)}
                            </h4>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-5 pt-4 border-top text-muted small">
                      <p className="mb-1">Thank you for your business!</p>
                      <p className="mb-1">
                        Powered by <strong>Xnoll</strong> —{" "}
                        <a
                          href="https://www.xnoll.com"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          www.xnoll.com
                        </a>
                      </p>
                      {company?.email && (
                        <p className="mb-0">
                          For support: <strong>{company.email}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                  {/* === END PRINTABLE CONTENT === */}
                </div>

                <div className="modal-footer border-0">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowViewModal(false)}
                  >
                    Close
                  </button>
                  <button
                    className="btn btn-primary btn-sm px-4"
                    onClick={handleDownloadPDF}
                  >
                    📄 Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Backdrop */}
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1040 }}
            onClick={() => setShowViewModal(false)}
          />
        </>
      )}
    </div>
  );
};

export default Invoices;
