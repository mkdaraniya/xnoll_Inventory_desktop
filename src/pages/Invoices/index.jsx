import React, { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "../../components/common/Pagination";
import { formatCurrency } from "../../utils/format";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ensureSuccess, notifyError } from "../../utils/feedback";

const STATUS_OPTIONS = ["unpaid", "partially_paid", "paid", "cancelled"];

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState("invoice_date");
  const [sortDir, setSortDir] = useState("desc");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [currency, setCurrency] = useState("INR");
  const [invoiceSettings, setInvoiceSettings] = useState({
    enable_tax: 1,
    default_tax_name: "Tax",
    default_tax_mode: "exclusive",
    invoice_prefix: "INV",
    invoice_terms: "",
    invoice_footer: "Thank you for your business!",
    invoice_show_company_address: 1,
    invoice_show_company_phone: 1,
    invoice_show_company_email: 1,
    invoice_show_company_tax_id: 1,
    invoice_show_due_date: 1,
    invoice_show_notes: 1,
    invoice_decimal_places: 2,
  });
  const [viewInvoice, setViewInvoice] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const viewInvoiceRef = useRef(null);

  const [company, setCompany] = useState({
    name: "Xnoll Inventory",
    tax_id: "",
    phone: "",
    email: "",
    website: "",
    address: "",
  });

  const loadInvoices = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const [invoiceRes, settingsRes] = await Promise.all([
        window.xnoll.invoicesQuery({
          page,
          pageSize,
          search,
          status: statusFilter,
          sortKey,
          sortDir,
        }),
        window.xnoll.settingsGet(),
      ]);
      ensureSuccess(invoiceRes, "Unable to load invoices.");
      setInvoices(invoiceRes.rows || []);
      setTotal(Number(invoiceRes.total || 0));
      setTotalPages(Number(invoiceRes.totalPages || 1));
      if (settingsRes?.success && settingsRes.settings) {
        const s = settingsRes.settings;
        setCurrency(s.currency || "INR");
        setInvoiceSettings((prev) => ({ ...prev, ...s }));
      }
    } catch (error) {
      notifyError(error, "Unable to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [page, pageSize, search, statusFilter, sortKey, sortDir]);

  useEffect(() => {
    const loadCompany = async () => {
      if (!window.xnoll) return;
      try {
        const res = await window.xnoll.companyGet();
        if (res.success && res.company) {
          setCompany(res.company);
        }
      } catch (err) {
        notifyError(err, "Failed to load company settings.");
      }
    };
    loadCompany();
  }, []);

  const currentPage = Math.min(page, totalPages || 1);
  const pageData = useMemo(() => invoices || [], [invoices]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (value) => {
    const decimals = Math.min(
      4,
      Math.max(0, Number(invoiceSettings.invoice_decimal_places ?? 2))
    );
    return formatCurrency(Number(value || 0).toFixed(decimals), currency);
  };

  const handleView = async (invoice) => {
    if (!window.xnoll) return;

    try {
      const full = await window.xnoll.invoicesGetById(invoice.id);
      if (!full) throw new Error("Invoice not found");
      setViewInvoice(full);
      setShowViewModal(true);
    } catch (err) {
      notifyError(err, "Failed to load invoice.");
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
    setPage(1);
  };

  const sortIcon = (key) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? "▲" : "▼";
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  const handleDelete = async (id) => {
    if (!window.xnoll) return;
    if (!window.confirm("Delete this invoice?")) return;

    setLoading(true);
    try {
      await window.xnoll.invoicesDelete(id);
      await loadInvoices();
    } catch (err) {
      notifyError(err, "Unable to delete invoice.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!viewInvoiceRef.current || !viewInvoice) return;

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
      notifyError(err, "Failed to generate PDF.");
    }
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
              setPage(1);
            }}
            totalItems={total}
          />

          <small className="text-muted d-block mt-2">
            Invoices are stored in local.
          </small>
        </div>
      </div>

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
                    {viewInvoice.invoice_number ||
                      `${invoiceSettings.invoice_prefix || "INV"}-${viewInvoice.id}`}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowViewModal(false)}
                  />
                </div>

                <div className="modal-body p-0">
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
                    <div className="text-center mb-5 pb-4 border-bottom">
                      <h3
                        className="fw-bold text-primary mb-1"
                        style={{ fontSize: "24px" }}
                      >
                        {company?.name || "Your Company Name"}
                      </h3>
                      {company?.legal_name && (
                        <p className="text-muted small mb-1">
                          Legal Name: {company.legal_name}
                        </p>
                      )}
                      {!!invoiceSettings.invoice_show_company_tax_id && (
                        <>
                          {company?.gstin && (
                            <p className="text-muted small mb-1">
                              GSTIN: {company.gstin}
                            </p>
                          )}
                          {company?.pan && (
                            <p className="text-muted small mb-1">
                              PAN: {company.pan}
                            </p>
                          )}
                          {!company?.gstin && !company?.pan && company?.tax_id && (
                            <p className="text-muted small mb-1">
                              Tax ID: {company.tax_id}
                            </p>
                          )}
                        </>
                      )}
                      {!!invoiceSettings.invoice_show_company_address &&
                        company?.address && (
                          <p className="text-muted small mb-1">
                            Address: {company.address}
                          </p>
                        )}
                      {!!invoiceSettings.invoice_show_company_phone && company?.phone && (
                        <p className="text-muted small mb-1">
                          Phone: {company.phone}
                        </p>
                      )}
                      {!!invoiceSettings.invoice_show_company_email && company?.email && (
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
                          <strong>Invoice #:</strong>{" "}
                          {viewInvoice.invoice_number ||
                            `${invoiceSettings.invoice_prefix || "INV"}-${viewInvoice.id}`}
                        </p>
                        <p className="mb-1">
                          <strong>Date:</strong> {formatDate(viewInvoice.invoice_date)}
                        </p>
                        {!!invoiceSettings.invoice_show_due_date &&
                          viewInvoice.due_date && (
                            <p className="mb-1">
                              <strong>Due Date:</strong>{" "}
                              {formatDate(viewInvoice.due_date)}
                            </p>
                          )}
                        <p className="mb-0">
                          <strong>Status:</strong> {getStatusBadge(viewInvoice.status)}
                        </p>
                      </div>
                    </div>

                    <div className="table-responsive mb-5">
                      <table
                        className="table table-bordered"
                        style={{ borderCollapse: "collapse" }}
                      >
                        <thead className="bg-light">
                          <tr>
                            <th className="py-2 px-3 text-start fw-semibold">Item</th>
                            <th className="py-2 px-3 text-center fw-semibold">Qty</th>
                            <th className="py-2 px-3 text-end fw-semibold">Rate</th>
                            <th className="py-2 px-3 text-end fw-semibold">
                              {viewInvoice.tax_name || invoiceSettings.default_tax_name || "Tax"}
                            </th>
                            <th className="py-2 px-3 text-end fw-semibold">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewInvoice.items?.map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3">
                                {it.product_name || it.description || "Item"}
                              </td>
                              <td className="py-2 px-3 text-center">{it.qty}</td>
                              <td className="py-2 px-3 text-end">
                                {formatAmount(it.unit_price)}
                              </td>
                              <td className="py-2 px-3 text-end">
                                {formatAmount(it.tax_amount)}
                              </td>
                              <td className="py-2 px-3 text-end fw-semibold">
                                {formatAmount(it.line_total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="row justify-content-end">
                      <div className="col-lg-5 col-md-6">
                        <div className="bg-light p-4 rounded">
                          <div className="d-flex justify-content-between mb-2">
                            <span className="fw-medium">Subtotal:</span>
                            <span>{formatAmount(viewInvoice.subtotal || 0)}</span>
                          </div>
                          {!!(viewInvoice.tax_total > 0) && (
                            <div className="d-flex justify-content-between mb-2">
                              <span className="fw-medium">
                                {viewInvoice.tax_name ||
                                  invoiceSettings.default_tax_name ||
                                  "Tax"}
                                {Number(viewInvoice.tax_rate || 0) > 0
                                  ? ` (${Number(viewInvoice.tax_rate).toFixed(2)}%)`
                                  : ""}
                                :
                              </span>
                              <span>{formatAmount(viewInvoice.tax_total || 0)}</span>
                            </div>
                          )}
                          {viewInvoice.discount > 0 && (
                            <div className="d-flex justify-content-between mb-2">
                              <span className="fw-medium">Discount:</span>
                              <span>{formatAmount(viewInvoice.discount)}</span>
                            </div>
                          )}
                          <div className="d-flex justify-content-between border-top pt-3">
                            <h4 className="fw-bold text-dark mb-0">Total:</h4>
                            <h4 className="fw-bold text-primary mb-0">
                              {formatAmount(viewInvoice.total)}
                            </h4>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center mt-5 pt-4 border-top text-muted small">
                      {!!invoiceSettings.invoice_show_notes && viewInvoice.notes && (
                        <p className="mb-2">
                          <strong>Notes:</strong> {viewInvoice.notes}
                        </p>
                      )}
                      {!!invoiceSettings.invoice_terms && (
                        <p className="mb-2">
                          <strong>Terms:</strong> {invoiceSettings.invoice_terms}
                        </p>
                      )}
                      <p className="mb-1">
                        {invoiceSettings.invoice_footer || "Thank you for your business!"}
                      </p>
                      <p className="mb-1">
                        Powered by <strong>Xnoll</strong> -{" "}
                        <a
                          href="https://www.xnoll.com"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          www.xnoll.com
                        </a>
                      </p>
                      {!!invoiceSettings.invoice_show_company_email && company?.email && (
                        <p className="mb-0">
                          For support: <strong>{company.email}</strong>
                        </p>
                      )}
                    </div>
                  </div>
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
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

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
