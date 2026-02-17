import React, { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "../../components/common/Pagination";
import UnifiedLoader from "../../components/common/UnifiedLoader";
import { formatCurrency } from "../../utils/format";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  confirmAction,
  ensureSuccess,
  notifyError,
  notifySuccess,
} from "../../utils/feedback";
import { formatStatusLabel, getStatusBadgeClass } from "../../utils/status";

const STATUS_OPTIONS = ["unpaid", "partially_paid", "paid", "cancelled"];
const CREATE_STATUS_OPTIONS = ["unpaid", "cancelled"];
const PAYMENT_METHOD_OPTIONS = ["cash", "card", "bank_transfer", "upi", "other"];
const emptyItem = { product_id: "", description: "", qty: "1", unit_price: "0", tax_id: "", tax_rate: "0", tax_name: "" };
const today = () => new Date().toISOString().slice(0, 10);

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxRates, setTaxRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    tax_scheme: "simple",
    default_tax_name: "Tax",
    default_tax_rate: 0,
    default_tax_mode: "exclusive",
    default_gst_tax_type: "intra",
    cgst_label: "CGST",
    sgst_label: "SGST",
    igst_label: "IGST",
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: today(),
    payment_method: "cash",
    reference_no: "",
    notes: "",
  });
  const viewInvoiceRef = useRef(null);
  const [createForm, setCreateForm] = useState({
    invoice_number: "",
    customer_id: "",
    invoice_date: today(),
    due_date: "",
    tax_type: "simple",
    status: "unpaid",
    discount: "0",
    notes: "",
    items: [{ ...emptyItem }],
  });

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
      const [customerRows, productRows, taxRes] = await Promise.all([
        window.xnoll.customersList(),
        window.xnoll.productsList(),
        window.xnoll.taxRatesList(),
      ]);
      ensureSuccess(invoiceRes, "Unable to load invoices.");
      setInvoices(invoiceRes.rows || []);
      setCustomers(customerRows || []);
      setProducts(productRows || []);
      setTaxRates(taxRes?.rows || []);
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
  const createTotals = useMemo(() => {
    const subtotal = (createForm.items || []).reduce((sum, item) => {
      const qty = Number(item.qty || 0);
      const rate = Number(item.unit_price || 0);
      return sum + Math.max(0, qty) * Math.max(0, rate);
    }, 0);
    const discount = Math.max(0, Number(createForm.discount || 0));
    const taxMode = String(invoiceSettings.default_tax_mode || "exclusive").toLowerCase();
    const taxScheme = String(invoiceSettings.tax_scheme || "simple").toLowerCase();
    const isGst = taxScheme === "gst_india";
    const taxType = isGst
      ? (createForm.tax_type === "inter" ? "inter" : "intra")
      : "simple";

    let tax = 0;
    if (Number(invoiceSettings.enable_tax) === 1 && taxMode !== "none") {
      for (const item of createForm.items || []) {
        const qty = Math.max(0, Number(item.qty || 0));
        const unitPrice = Math.max(0, Number(item.unit_price || 0));
        const amount = qty * unitPrice;
        const selectedTax = (taxRates || []).find((t) => Number(t.id) === Number(item.tax_id || 0));
        const itemTaxRate = Math.max(
          0,
          Number(
            item.tax_rate != null && String(item.tax_rate) !== ""
              ? item.tax_rate
              : selectedTax?.rate != null
              ? selectedTax.rate
              : invoiceSettings.default_tax_rate || 0
          )
        );
        if (!(itemTaxRate > 0)) continue;
        tax += taxMode === "inclusive"
          ? (amount * itemTaxRate) / (100 + itemTaxRate)
          : (amount * itemTaxRate) / 100;
      }
    }
    const total = Math.max(0, subtotal + (taxMode === "exclusive" ? tax : 0) - discount);
    const cgst = taxType === "intra" ? tax / 2 : 0;
    const sgst = taxType === "intra" ? tax - cgst : 0;
    const igst = taxType === "inter" ? tax : 0;
    return { subtotal, tax, total, taxType, cgst, sgst, igst };
  }, [createForm.items, createForm.discount, createForm.tax_type, invoiceSettings, taxRates]);

  const parseTaxBreakup = (invoice) => {
    const fallback = {
      tax_type: invoice?.tax_type || "simple",
      cgst_label: invoiceSettings.cgst_label || "CGST",
      sgst_label: invoiceSettings.sgst_label || "SGST",
      igst_label: invoiceSettings.igst_label || "IGST",
      cgst: 0,
      sgst: 0,
      igst: 0,
    };
    const raw = invoice?.tax_breakup;
    if (!raw) return fallback;
    if (typeof raw === "object") return { ...fallback, ...raw };
    try {
      return { ...fallback, ...JSON.parse(raw) };
    } catch (_err) {
      return fallback;
    }
  };

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

  const getInvoicePaid = (invoice) => Number(invoice?.paid_amount || 0);
  const getInvoiceBalance = (invoice) =>
    Math.max(0, Number(invoice?.balance_due ?? Number(invoice?.total || 0) - getInvoicePaid(invoice)));

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

  const openPaymentModal = (invoice) => {
    if (!invoice || Number(invoice.id || 0) <= 0) return;
    const balance = getInvoiceBalance(invoice);
    if (!(balance > 0)) {
      notifyError("This invoice has no pending balance.");
      return;
    }
    if (String(invoice.status || "").toLowerCase() === "cancelled") {
      notifyError("Cannot add payment to cancelled invoice.");
      return;
    }
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: String(balance.toFixed(2)),
      payment_date: today(),
      payment_method: "cash",
      reference_no: "",
      notes: "",
    });
    setShowPaymentModal(true);
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!window.xnoll || !selectedInvoice) return;
    const amount = Number(paymentForm.amount || 0);
    const pending = getInvoiceBalance(selectedInvoice);
    if (!(amount > 0)) return notifyError("Payment amount must be greater than zero.");
    if (amount > pending) return notifyError("Payment amount cannot exceed pending balance.");
    if (!paymentForm.payment_date) return notifyError("Payment date is required.");

    setSaving(true);
    try {
      ensureSuccess(
        await window.xnoll.invoicesPaymentsCreate({
          invoice_id: selectedInvoice.id,
          amount,
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          reference_no: paymentForm.reference_no,
          notes: paymentForm.notes,
        }),
        "Unable to record payment."
      );
      setShowPaymentModal(false);
      notifySuccess("Payment recorded successfully.");
      await loadInvoices();
      if (showViewModal && viewInvoice?.id === selectedInvoice.id) {
        const full = await window.xnoll.invoicesGetById(selectedInvoice.id);
        if (full) setViewInvoice(full);
      }
    } catch (err) {
      notifyError(err, "Unable to record payment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.xnoll || !(Number(paymentId) > 0) || !viewInvoice) return;
    const confirmed = await confirmAction({
      title: "Delete payment?",
      text: "This payment entry will be removed.",
      confirmButtonText: "Delete",
      icon: "warning",
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      ensureSuccess(
        await window.xnoll.invoicesPaymentsDelete(paymentId),
        "Unable to delete payment."
      );
      notifySuccess("Payment deleted successfully.");
      await loadInvoices();
      const full = await window.xnoll.invoicesGetById(viewInvoice.id);
      if (full) setViewInvoice(full);
    } catch (err) {
      notifyError(err, "Unable to delete payment.");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => (
    <span className={getStatusBadgeClass(status || "unpaid", "invoice")}>
      {formatStatusLabel(status || "unpaid")}
    </span>
  );

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
    const confirmed = await confirmAction({
      title: "Delete invoice?",
      text: "This invoice will be removed permanently.",
      confirmButtonText: "Delete",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      ensureSuccess(await window.xnoll.invoicesDelete(id), "Unable to delete invoice.");
      await loadInvoices();
      notifySuccess("Invoice deleted successfully.");
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

  const buildInvoiceNumber = () => {
    const prefix = String(invoiceSettings.invoice_prefix || "INV").trim().toUpperCase();
    const serial = Date.now().toString().slice(-6);
    return `${prefix}-${serial}`;
  };

  const openCreateModal = () => {
    const isGst = String(invoiceSettings.tax_scheme || "simple").toLowerCase() === "gst_india";
    setCreateForm({
      invoice_number: buildInvoiceNumber(),
      customer_id: "",
      invoice_date: today(),
      due_date: "",
      tax_type: isGst
        ? String(invoiceSettings.default_gst_tax_type || "intra").toLowerCase() === "inter"
          ? "inter"
          : "intra"
        : "simple",
      status: "unpaid",
      discount: "0",
      notes: "",
      items: [{ ...emptyItem }],
    });
    setShowCreateModal(true);
  };

  const updateCreateItem = (index, key, value) => {
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.map((it, idx) => (idx === index ? { ...it, [key]: value } : it)),
    }));
  };

  const addCreateItem = () =>
    setCreateForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));

  const removeCreateItem = (index) =>
    setCreateForm((prev) => {
      const items = prev.items.filter((_, idx) => idx !== index);
      return { ...prev, items: items.length ? items : [{ ...emptyItem }] };
    });

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    if (!createForm.customer_id) return notifyError("Customer is required.");
    if (!createForm.invoice_date) return notifyError("Invoice date is required.");
    if (createForm.due_date && createForm.due_date < createForm.invoice_date) {
      return notifyError("Due date cannot be earlier than invoice date.");
    }
    if (!createForm.items.length) return notifyError("Add at least one invoice item.");

    for (const item of createForm.items) {
      if (!item.product_id) return notifyError("Select product in all invoice rows.");
      if (!(Number(item.qty || 0) > 0)) return notifyError("Quantity must be greater than zero.");
      if (!(Number(item.unit_price || 0) >= 0)) return notifyError("Unit price cannot be negative.");
      if (item.tax_rate !== "" && item.tax_rate != null && !(Number(item.tax_rate || 0) >= 0)) {
        return notifyError("Tax rate cannot be negative.");
      }
    }

    const payload = {
      invoice_number: String(createForm.invoice_number || "").trim() || null,
      customer_id: Number(createForm.customer_id),
      invoice_date: createForm.invoice_date,
      due_date: createForm.due_date || null,
      status: createForm.status || "unpaid",
      tax_type: createForm.tax_type || "simple",
      discount: Number(createForm.discount || 0),
      notes: String(createForm.notes || "").trim(),
      items: createForm.items.map((item) => ({
        product_id: Number(item.product_id),
        description: String(item.description || "").trim(),
        qty: Number(item.qty || 0),
        unit_price: Number(item.unit_price || 0),
        tax_id: item.tax_id ? Number(item.tax_id) : null,
        tax_name: String(item.tax_name || "").trim(),
        tax_rate:
          item.tax_rate != null && String(item.tax_rate) !== ""
            ? Number(item.tax_rate || 0)
            : null,
      })),
    };

    setSaving(true);
    try {
      ensureSuccess(await window.xnoll.invoicesCreate(payload), "Unable to create invoice.");
      setShowCreateModal(false);
      notifySuccess("Invoice created successfully.");
      await loadInvoices();
    } catch (err) {
      notifyError(err, "Unable to create invoice.");
    } finally {
      setSaving(false);
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
            <button className="btn btn-sm btn-primary" onClick={openCreateModal}>
              + New Invoice
            </button>
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
          <UnifiedLoader show={loading} text="Loading invoices..." />
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
                    onClick={() => handleSort("paid_amount")}
                  >
                    Paid {sortIcon("paid_amount")}
                  </th>
                  <th
                    style={{ width: "120px", cursor: "pointer" }}
                    onClick={() => handleSort("balance_due")}
                  >
                    Balance {sortIcon("balance_due")}
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
                    <td>{formatCurrency(getInvoicePaid(inv), currency)}</td>
                    <td>{formatCurrency(getInvoiceBalance(inv), currency)}</td>
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
                          className="btn btn-sm btn-outline-success"
                          disabled={loading || String(inv.status || "").toLowerCase() === "cancelled" || !(getInvoiceBalance(inv) > 0)}
                          onClick={() => openPaymentModal(inv)}
                          title="Record Payment"
                        >
                          Pay
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
                    <td colSpan="8" className="text-center text-muted">
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
                        {String(invoiceSettings.tax_scheme || "simple").toLowerCase() === "gst_india" && (
                          <p className="mb-0">
                            <strong>GST Type:</strong>{" "}
                            {parseTaxBreakup(viewInvoice).tax_type === "inter"
                              ? "Inter-state (IGST)"
                              : "Intra-state (CGST + SGST)"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="table-responsive mb-5">
                      {(() => {
                        const taxBreakup = parseTaxBreakup(viewInvoice);
                        const isGstIntra = taxBreakup.tax_type === "intra";
                        const isGstInter = taxBreakup.tax_type === "inter";
                        return (
                      <table
                        className="table table-bordered"
                        style={{ borderCollapse: "collapse" }}
                      >
                        <thead className="bg-light">
                          <tr>
                            <th className="py-2 px-3 text-start fw-semibold">Item</th>
                            <th className="py-2 px-3 text-center fw-semibold">Qty</th>
                            <th className="py-2 px-3 text-end fw-semibold">Rate</th>
                            {isGstIntra && (
                              <>
                                <th className="py-2 px-3 text-end fw-semibold">{taxBreakup.cgst_label || "CGST"}</th>
                                <th className="py-2 px-3 text-end fw-semibold">{taxBreakup.sgst_label || "SGST"}</th>
                              </>
                            )}
                            {isGstInter && (
                              <th className="py-2 px-3 text-end fw-semibold">{taxBreakup.igst_label || "IGST"}</th>
                            )}
                            {!isGstIntra && !isGstInter && (
                              <th className="py-2 px-3 text-end fw-semibold">
                                {viewInvoice.tax_name || invoiceSettings.default_tax_name || "Tax"}
                              </th>
                            )}
                            <th className="py-2 px-3 text-end fw-semibold">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewInvoice.items?.map((it, idx) => (
                            (() => {
                              const itemTax = Number(it.tax_amount || 0);
                              const itemCgst = itemTax / 2;
                              const itemSgst = itemTax - itemCgst;
                              return (
                                <tr key={idx}>
                                  <td className="py-2 px-3">
                                    {it.product_name || it.description || "Item"}
                                  </td>
                                  <td className="py-2 px-3 text-center">{it.qty}</td>
                                  <td className="py-2 px-3 text-end">
                                    {formatAmount(it.unit_price)}
                                  </td>
                                  {isGstIntra && (
                                    <>
                                      <td className="py-2 px-3 text-end">{formatAmount(itemCgst)}</td>
                                      <td className="py-2 px-3 text-end">{formatAmount(itemSgst)}</td>
                                    </>
                                  )}
                                  {isGstInter && (
                                    <td className="py-2 px-3 text-end">{formatAmount(itemTax)}</td>
                                  )}
                                  {!isGstIntra && !isGstInter && (
                                    <td className="py-2 px-3 text-end">
                                      {formatAmount(itemTax)}
                                    </td>
                                  )}
                                  <td className="py-2 px-3 text-end fw-semibold">
                                    {formatAmount(it.line_total)}
                                  </td>
                                </tr>
                              );
                            })()
                          ))}
                        </tbody>
                      </table>
                        );
                      })()}
                    </div>

                    <div className="row justify-content-end">
                      <div className="col-lg-5 col-md-6">
                        <div className="bg-light p-4 rounded">
                          <div className="d-flex justify-content-between mb-2">
                            <span className="fw-medium">Subtotal:</span>
                            <span>{formatAmount(viewInvoice.subtotal || 0)}</span>
                          </div>
                          {!!(viewInvoice.tax_total > 0) && (
                            (() => {
                              const taxBreakup = parseTaxBreakup(viewInvoice);
                              if (taxBreakup.tax_type === "intra") {
                                return (
                                  <>
                                    <div className="d-flex justify-content-between mb-2">
                                      <span className="fw-medium">{taxBreakup.cgst_label || "CGST"}:</span>
                                      <span>{formatAmount(taxBreakup.cgst || 0)}</span>
                                    </div>
                                    <div className="d-flex justify-content-between mb-2">
                                      <span className="fw-medium">{taxBreakup.sgst_label || "SGST"}:</span>
                                      <span>{formatAmount(taxBreakup.sgst || 0)}</span>
                                    </div>
                                  </>
                                );
                              }
                              if (taxBreakup.tax_type === "inter") {
                                return (
                                  <div className="d-flex justify-content-between mb-2">
                                    <span className="fw-medium">{taxBreakup.igst_label || "IGST"}:</span>
                                    <span>{formatAmount(taxBreakup.igst || 0)}</span>
                                  </div>
                                );
                              }
                              return (
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
                              );
                            })()
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
                          <div className="d-flex justify-content-between mt-3">
                            <span className="fw-medium">Paid:</span>
                            <span>{formatAmount(getInvoicePaid(viewInvoice))}</span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span className="fw-medium">Balance:</span>
                            <span className="fw-semibold">
                              {formatAmount(getInvoiceBalance(viewInvoice))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0">Payment History</h6>
                        {String(viewInvoice.status || "").toLowerCase() !== "cancelled" &&
                          getInvoiceBalance(viewInvoice) > 0 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              onClick={() => openPaymentModal(viewInvoice)}
                              disabled={saving}
                            >
                              + Record Payment
                            </button>
                          )}
                      </div>
                      <div className="table-responsive border rounded">
                        <table className="table table-sm mb-0 align-middle">
                          <thead className="table-light">
                            <tr>
                              <th style={{ width: "130px" }}>Date</th>
                              <th style={{ width: "120px" }}>Method</th>
                              <th style={{ width: "140px" }}>Reference</th>
                              <th>Notes</th>
                              <th className="text-end" style={{ width: "130px" }}>Amount</th>
                              <th className="text-end" style={{ width: "80px" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(viewInvoice.payments || []).map((payment) => (
                              <tr key={payment.id}>
                                <td>{formatDate(payment.payment_date)}</td>
                                <td>{formatStatusLabel(payment.payment_method || "other")}</td>
                                <td>{payment.reference_no || "-"}</td>
                                <td>{payment.notes || "-"}</td>
                                <td className="text-end">{formatAmount(payment.amount)}</td>
                                <td className="text-end">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    disabled={saving}
                                    onClick={() => handleDeletePayment(payment.id)}
                                  >
                                    Del
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {!(viewInvoice.payments || []).length && (
                              <tr>
                                <td colSpan="6" className="text-center text-muted">
                                  No payments added yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
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

      {showCreateModal && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ zIndex: 1050 }}
            onClick={() => !saving && setShowCreateModal(false)}
          >
            <div
              className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <form onSubmit={handleCreateInvoice}>
                  <div className="modal-header">
                    <h5 className="modal-title">Create Invoice</h5>
                    <button type="button" className="btn-close" disabled={saving} onClick={() => setShowCreateModal(false)} />
                  </div>
                  <div className="modal-body">
                    <div className="row g-3 mb-3">
                      <div className="col-md-3">
                        <label className="form-label">Invoice Number</label>
                        <input className="form-control" value={createForm.invoice_number} disabled readOnly />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Customer *</label>
                        <select
                          className="form-select"
                          value={createForm.customer_id}
                          onChange={(e) => setCreateForm((p) => ({ ...p, customer_id: e.target.value }))}
                          disabled={saving}
                        >
                          <option value="">Select customer</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Invoice Date *</label>
                        <input type="date" className="form-control" value={createForm.invoice_date} onChange={(e) => setCreateForm((p) => ({ ...p, invoice_date: e.target.value }))} disabled={saving} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Due Date</label>
                        <input type="date" className="form-control" value={createForm.due_date} onChange={(e) => setCreateForm((p) => ({ ...p, due_date: e.target.value }))} disabled={saving} />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">Status</label>
                        <select className="form-select" value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))} disabled={saving}>
                          {CREATE_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {formatStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {String(invoiceSettings.tax_scheme || "simple").toLowerCase() === "gst_india" && (
                        <div className="col-md-3">
                          <label className="form-label">GST Type</label>
                          <select
                            className="form-select"
                            value={createForm.tax_type || "intra"}
                            onChange={(e) => setCreateForm((p) => ({ ...p, tax_type: e.target.value }))}
                            disabled={saving}
                          >
                            <option value="intra">Intra-state (CGST + SGST)</option>
                            <option value="inter">Inter-state (IGST)</option>
                          </select>
                        </div>
                      )}
                      <div className="col-12">
                        <div className="small text-muted">
                          Invoice status changes automatically based on payments.
                        </div>
                      </div>
                    </div>

                    <div className="table-responsive border rounded">
                      <table className="table table-sm align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: "30%" }}>Product *</th>
                            <th>Description</th>
                            <th style={{ width: "10%" }}>Qty *</th>
                            <th style={{ width: "15%" }}>Rate *</th>
                            <th style={{ width: "18%" }}>Item Tax</th>
                            <th style={{ width: "15%" }}>Amount</th>
                            <th style={{ width: "8%" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {createForm.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>
                                <select
                                  className="form-select form-select-sm"
                                  value={item.product_id}
                                  onChange={(e) => {
                                    const pid = e.target.value;
                                    const product = products.find((p) => Number(p.id) === Number(pid));
                                    updateCreateItem(idx, "product_id", pid);
                                    if (product) {
                                      updateCreateItem(idx, "description", product.name || "");
                                      updateCreateItem(idx, "unit_price", String(product.price ?? 0));
                                      const defaultTaxId = product.default_tax_id ? String(product.default_tax_id) : "";
                                      const matchedTax = (taxRates || []).find((t) => Number(t.id) === Number(defaultTaxId || 0));
                                      updateCreateItem(idx, "tax_id", defaultTaxId);
                                      updateCreateItem(idx, "tax_rate", matchedTax ? String(matchedTax.rate ?? 0) : "");
                                      updateCreateItem(idx, "tax_name", matchedTax ? String(matchedTax.name || "") : "");
                                    }
                                  }}
                                  disabled={saving}
                                >
                                  <option value="">Select product</option>
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.sku || "NA"})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input className="form-control form-control-sm" value={item.description} onChange={(e) => updateCreateItem(idx, "description", e.target.value)} disabled={saving} />
                              </td>
                              <td>
                                <input type="number" min="0.01" step="0.01" className="form-control form-control-sm" value={item.qty} onChange={(e) => updateCreateItem(idx, "qty", e.target.value)} disabled={saving} />
                              </td>
                              <td>
                                <input type="number" min="0" step="0.01" className="form-control form-control-sm" value={item.unit_price} onChange={(e) => updateCreateItem(idx, "unit_price", e.target.value)} disabled={saving} />
                              </td>
                              <td>
                                <select
                                  className="form-select form-select-sm"
                                  value={item.tax_id || ""}
                                  onChange={(e) => {
                                    const taxId = e.target.value;
                                    const matchedTax = (taxRates || []).find((t) => Number(t.id) === Number(taxId || 0));
                                    updateCreateItem(idx, "tax_id", taxId);
                                    updateCreateItem(idx, "tax_rate", matchedTax ? String(matchedTax.rate ?? 0) : "");
                                    updateCreateItem(idx, "tax_name", matchedTax ? String(matchedTax.name || "") : "");
                                  }}
                                  disabled={saving || Number(invoiceSettings.enable_tax || 0) !== 1}
                                >
                                  <option value="">Default Tax</option>
                                  {(taxRates || [])
                                    .filter((t) => Number(t.is_active) === 1)
                                    .map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.name} ({Number(t.rate || 0).toFixed(2)}%)
                                      </option>
                                    ))}
                                </select>
                              </td>
                              <td className="text-end fw-semibold">
                                {formatAmount((Number(item.qty || 0) * Number(item.unit_price || 0)).toFixed(2))}
                              </td>
                              <td>
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeCreateItem(idx)} disabled={saving}>
                                  X
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={addCreateItem} disabled={saving}>
                        + Add Row
                      </button>
                      <div className="text-end">
                        <div className="small text-muted">Subtotal: {formatAmount(createTotals.subtotal)}</div>
                        {String(invoiceSettings.tax_scheme || "simple").toLowerCase() === "gst_india" ? (
                          <>
                            {createTotals.taxType === "intra" ? (
                              <>
                                <div className="small text-muted">
                                  {invoiceSettings.cgst_label || "CGST"}: {formatAmount(createTotals.cgst)}
                                </div>
                                <div className="small text-muted">
                                  {invoiceSettings.sgst_label || "SGST"}: {formatAmount(createTotals.sgst)}
                                </div>
                              </>
                            ) : (
                              <div className="small text-muted">
                                {invoiceSettings.igst_label || "IGST"}: {formatAmount(createTotals.igst)}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="small text-muted">
                            Item-wise Tax: {formatAmount(createTotals.tax)}
                          </div>
                        )}
                        <div className="fw-semibold">Total: {formatAmount(createTotals.total)}</div>
                      </div>
                    </div>

                    <div className="row g-3 mt-2">
                      <div className="col-md-3">
                        <label className="form-label">Discount</label>
                        <input type="number" min="0" step="0.01" className="form-control" value={createForm.discount} onChange={(e) => setCreateForm((p) => ({ ...p, discount: e.target.value }))} disabled={saving} />
                      </div>
                      <div className="col-md-9">
                        <label className="form-label">Notes</label>
                        <textarea className="form-control" rows={2} value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} disabled={saving} />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreateModal(false)} disabled={saving}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? "Saving..." : "Create Invoice"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
        </>
      )}

      {showPaymentModal && selectedInvoice && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ zIndex: 1050 }}
            onClick={() => !saving && setShowPaymentModal(false)}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <form onSubmit={handleCreatePayment}>
                  <div className="modal-header">
                    <h5 className="modal-title">
                      Record Payment - #{selectedInvoice.invoice_number || selectedInvoice.id}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      disabled={saving}
                      onClick={() => setShowPaymentModal(false)}
                    />
                  </div>
                  <div className="modal-body">
                    <div className="small text-muted mb-2">
                      Pending Balance: {formatAmount(getInvoiceBalance(selectedInvoice))}
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Amount *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="form-control"
                          value={paymentForm.amount}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                          }
                          disabled={saving}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Payment Date *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={paymentForm.payment_date}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))
                          }
                          disabled={saving}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Method</label>
                        <select
                          className="form-select"
                          value={paymentForm.payment_method}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, payment_method: e.target.value }))
                          }
                          disabled={saving}
                        >
                          {PAYMENT_METHOD_OPTIONS.map((method) => (
                            <option key={method} value={method}>
                              {formatStatusLabel(method)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Reference</label>
                        <input
                          className="form-control"
                          value={paymentForm.reference_no}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, reference_no: e.target.value }))
                          }
                          disabled={saving}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Notes</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={paymentForm.notes}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))
                          }
                          disabled={saving}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={saving}
                      onClick={() => setShowPaymentModal(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success" disabled={saving}>
                      {saving ? "Saving..." : "Save Payment"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
        </>
      )}
    </div>
  );
};

export default Invoices;
