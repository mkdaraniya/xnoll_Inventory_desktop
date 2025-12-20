import React, { useEffect, useMemo, useRef, useState } from "react";
import CustomFieldRenderer from "../../components/CustomField/CustomFieldRenderer";

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"];
const PAGE_SIZE = 10;

const emptyForm = {
  id: null,
  customer_id: "",
  booking_date: "",
  status: "pending",
  items: [],
};

const BookingPage = () => {
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("booking_date");
  const [sortDir, setSortDir] = useState("desc");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const emptyItem = { product_id: "", qty: 1, unit_price: 0 };
  const [items, setItems] = useState([]);
  const customerInputRef = useRef(null);

  // Check for prefilled date from calendar
  useEffect(() => {
    const prefillDate = localStorage.getItem("prefillBookingDate");
    if (prefillDate) {
      localStorage.removeItem("prefillBookingDate");
      const dateObj = new Date(prefillDate);
      const formattedDate = dateObj.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format

      setForm((prev) => ({
        ...prev,
        booking_date: formattedDate,
      }));
      setShowModal(true);
    }
  }, []);

  const loadAll = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const [
        bookingRows,
        customerRows,
        productRows,
        invoiceRows,
        customFieldsRows,
      ] = await Promise.all([
        window.xnoll.bookingsList(1, 20),
        window.xnoll.customersList(),
        window.xnoll.productsList(),
        window.xnoll.invoicesList(),
        window.xnoll.customFieldsList("bookings"),
      ]);
      setBookings(bookingRows);
      setCustomers(customerRows);
      setProducts(productRows);
      setInvoices(invoiceRows);
      // Ensure customFieldsRows is an array, even if the API call fails
      const safeCustomFields = Array.isArray(customFieldsRows)
        ? customFieldsRows
        : customFieldsRows &&
            typeof customFieldsRows === "object" &&
            Array.isArray(customFieldsRows)
          ? customFieldsRows
          : [];
      setCustomFields(safeCustomFields);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
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

  const invoiceMap = useMemo(() => {
    const m = {};
    invoices.forEach((inv) => {
      if (!m[inv.customer_id]) m[inv.customer_id] = [];
      m[inv.customer_id].push(inv);
    });
    return m;
  }, [invoices]);

  // attach display names
  const enrichedBookings = useMemo(
    () =>
      bookings.map((b) => {
        const cust = customerMap[b.customer_id];
        return {
          ...b,
          customer_name: cust ? cust.name : `#${b.customer_id || "-"}`,
        };
      }),
    [bookings, customerMap]
  );

  const productMap = useMemo(() => {
    const m = {};
    products.forEach((p) => {
      m[p.id] = p;
    });
    return m;
  }, [products]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let data = [...enrichedBookings];

    // status filter first
    if (statusFilter) {
      data = data.filter((b) => (b.status || "") === statusFilter);
    }

    // 1) Filter by term if present
    if (term) {
      data = data.filter((b) => {
        // 1️⃣ basic booking fields
        if (
          String(b.id || "").includes(term) ||
          (b.customer_name || "").toLowerCase().includes(term)
        ) {
          return true;
        }

        // 2️⃣ search in items → product names
        if (Array.isArray(b.items) && b.items.length) {
          for (const it of b.items) {
            const productName = productMap[it.product_id]?.name;
            if (productName && productName.toLowerCase().includes(term)) {
              return true;
            }
          }
        }

        // 3️⃣ custom fields
        if (b.custom_fields && Array.isArray(customFields)) {
          for (const field of customFields) {
            if (!field.searchable) continue;
            const value = b.custom_fields[field.name];
            if (
              value !== undefined &&
              String(value).toLowerCase().includes(term)
            ) {
              return true;
            }
          }
        }

        return false;
      });
    }

    // 2) Sorting — always apply
    const getSortValue = (row, key) => {
      if (!key) return "";

      let value = "";

      if (row[key] !== undefined && row[key] !== null) {
        value = row[key];
      } else if (row.custom_fields && row.custom_fields[key] !== undefined) {
        value = row.custom_fields[key];
      }

      // normalize
      if (value === null || value === undefined) return "";
      return value;
    };

    data.sort((a, b) => {
      let va = getSortValue(a, sortKey);
      let vb = getSortValue(b, sortKey);

      // numeric compare when both look numeric
      const na = parseFloat(va);
      const nb = parseFloat(vb);
      const bothNumbers =
        String(va).trim() !== "" &&
        String(vb).trim() !== "" &&
        !Number.isNaN(na) &&
        !Number.isNaN(nb);

      if (bothNumbers) {
        if (na < nb) return sortDir === "asc" ? -1 : 1;
        if (na > nb) return sortDir === "asc" ? 1 : -1;
        return 0;
      }

      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();

      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return data;
  }, [enrichedBookings, customFields, search, statusFilter, sortKey, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.slice(0, 10); // YYYY-MM-DD
  };

  const getStatusBadge = (status) => {
    const s = status || "pending";
    const cap = s.charAt(0).toUpperCase() + s.slice(1);
    let bgClass = "bg-secondary";
    if (s === "pending") bgClass = "bg-warning text-dark";
    else if (s === "confirmed") bgClass = "bg-info";
    else if (s === "completed") bgClass = "bg-success";
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

  const addItem = () => {
    setItems((prev) => [...prev, { product_id: "", qty: 1, unit_price: 0 }]);
  };

  const updateItem = (index, key, value) => {
    setItems((prev) => {
      const copy = [...prev];

      // if changing product, prevent duplicates
      if (key === "product_id") {
        const newPid = String(value);
        // check other items for same product
        const duplicateIndex = copy.findIndex(
          (it, i) =>
            i !== index && String(it.product_id) === newPid && newPid !== ""
        );
        if (duplicateIndex !== -1) {
          alert(
            "This product is already selected in another line. Please pick a different product."
          );
          return prev; // no change
        }
      }

      // update the item
      const existing = copy[index] || { product_id: "", qty: 1, unit_price: 0 };
      copy[index] = { ...existing, [key]: value };

      // when product selected, set unit price automatically
      if (key === "product_id") {
        const p = products.find((x) => String(x.id) === String(value));
        if (p) copy[index].unit_price = Number(p.price || 0);
        else copy[index].unit_price = 0;
      }

      // ensure qty stays a number (and at least 1)
      if (key === "qty") {
        const n = Number(value || 0);
        copy[index].qty = n <= 0 ? 1 : n;
      }

      return copy;
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- form / modal ----------
  const resetForm = () => {
    setForm(emptyForm);
    setItems([]);
    setIsEditing(false);
    setCustomFieldValues({});
  };

  const openNewModal = () => {
    resetForm();
    setCustomerSearch("");
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (fieldName, value) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const payload = {
      id: form.id,
      customer_id: Number(form.customer_id) || null,
      booking_date: form.booking_date.trim(),
      status: form.status || "pending",
      items: items.map((i, idx) => ({
        product_id: Number(i.product_id),
        qty: Number(i.qty || 1),
        unit_price: Number(i.unit_price || 0),
        line_total: Number(i.unit_price || 0) * Number(i.qty || 1),
      })),
    };

    // Validation
    if (!payload.customer_id) {
      alert("Please select a customer.");
      return;
    }
    if (!payload.booking_date) {
      alert("Please select a date & time.");
      return;
    }
    if (!payload.items || payload.items.length === 0) {
      alert("Please add at least one item.");
      return;
    }

    // ensure no empty or duplicate product ids
    const seen = new Set();
    for (let idx = 0; idx < payload.items.length; idx++) {
      const it = payload.items[idx];
      if (!it.product_id) {
        alert(`Please select a product for item ${idx + 1}.`);
        return;
      }
      if (seen.has(it.product_id)) {
        alert(
          `Duplicate product selected for item ${idx + 1}. Please choose a different product.`
        );
        return;
      }
      seen.add(it.product_id);
    }

    setLoading(true);
    try {
      let result;
      if (isEditing && payload.id != null) {
        result = await window.xnoll.bookingsUpdate(payload);
      } else {
        result = await window.xnoll.bookingsCreate(payload);
      }

      // Save custom field values
      if (customFields.length > 0 && (result?.id || payload.id)) {
        const recordId = result?.id || payload.id;
        for (const field of customFields) {
          await window.xnoll.customFieldValuesSave({
            field_id: field.id,
            record_id: recordId,
            value: customFieldValues[field.name] ?? field.default_value ?? "",
          });
        }
      }

      resetForm();
      setShowModal(false);
      await loadAll();
    } catch (err) {
      console.error("Error saving booking:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (b) => {
    const full = await window.xnoll.getBookingsById(b.id);
    setForm({
      id: full.id,
      customer_id: full.customer_id || "",
      booking_date: full.booking_date || "",
      status: full.status || "pending",
    });

    setItems(
      Array.isArray(full.items)
        ? full.items.map((i) => ({
            product_id: i.product_id,
            qty: Number(i.qty || 1),
            unit_price: Number(i.unit_price || 0),
            line_total: Number(
              i.line_total || Number(i.unit_price || 0) * Number(i.qty || 1)
            ),
          }))
        : []
    );

    setCustomerSearch(
      full.customer_name
        ? `${full.customer_name} (ID: ${full.customer_id})`
        : ""
    );

    setIsEditing(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.xnoll) return;
    if (!window.confirm("Delete this booking?")) return;

    setLoading(true);
    try {
      await window.xnoll.bookingsDelete(id);
      await loadAll();
    } catch (err) {
      console.error("Error deleting booking:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = (booking) => {
    setSelectedBooking(booking);
    setShowInvoiceModal(true);
  };

  const handleCreateInvoice = async () => {
    if (!window.xnoll || !selectedBooking) return;

    const amount = selectedBooking.items?.reduce(
      (sum, i) =>
        sum +
        Number(i.line_total || Number(i.unit_price || 0) * Number(i.qty || 1)),
      0
    );
    const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

    if (!selectedBooking.customer_id) {
      alert("Booking has no customer selected.");
      return;
    }

    const existingInvoices = invoiceMap[selectedBooking.customer_id] || [];
    const existing = existingInvoices.find(
      (inv) => inv.booking_id === selectedBooking.id
    );
    if (existing) {
      alert(`Invoice already generated today (ID: ${existing.id}).`);
      setShowInvoiceModal(false);
      await loadAll();
      return;
    }

    setLoading(true);
    try {
      // Build invoice payload including items
      const invoicePayload = {
        invoice: {
          invoice_number: null, // will be generated or left null
          customer_id: selectedBooking.customer_id,
          booking_id: selectedBooking.id,
          total: amount,
          discount: 0,
          invoice_date: today,
          due_date: null,
          status: "unpaid",
          notes: "",
        },
        items: (selectedBooking.items || []).map((it) => ({
          product_id: it.product_id || null,
          description: productMap[it.product_id]?.name || "",
          qty: Number(it.qty || 1),
          unit_price: Number(it.unit_price || 0),
          line_total: Number(
            it.line_total || Number(it.unit_price || 0) * Number(it.qty || 1)
          ),
        })),
      };

      const newInvoice = await window.xnoll.invoicesCreate(invoicePayload);
      // mark booking completed
      await window.xnoll.bookingsUpdate({
        id: selectedBooking.id,
        booking_date: selectedBooking.booking_date,
        status: "completed",
      });
      await loadAll();
      alert("Invoice created and booking marked as completed.");
      setShowInvoiceModal(false);
    } catch (err) {
      console.error("Error generating invoice:", err);
      alert("Failed to generate invoice. See console for details.");
      await loadAll();
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
    setCustomerSearch("");
    setShowCustomerDropdown(false);
  };

  const closeInvoiceModal = () => {
    setShowInvoiceModal(false);
    setSelectedBooking(null);
  };

  return (
    <div>
      <h4 className="mb-3">Bookings</h4>

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
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search customer / service / ID"
              style={{ minWidth: 240 }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <button
              className="btn btn-sm btn-primary"
              onClick={openNewModal}
              disabled={loading}
              title={
                !customers.length ? "Add customers and products first" : ""
              }
            >
              + New Booking
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
                    style={{ width: "170px", cursor: "pointer" }}
                    onClick={() => handleSort("booking_date")}
                  >
                    Date/Time {sortIcon("booking_date")}
                  </th>
                  <th
                    style={{ width: "110px", cursor: "pointer" }}
                    onClick={() => handleSort("status")}
                  >
                    Status {sortIcon("status")}
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
                {pageData.map((b) => {
                  const hasInvoiceToday = invoiceMap[b.customer_id]?.some(
                    (inv) => inv.booking_id === b.id
                  );

                  return (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td
                        style={{
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {b.customer_name}
                      </td>
                      <td className="small text-muted">—</td>
                      <td>{formatDate(b.booking_date)}</td>
                      <td>{getStatusBadge(b.status)}</td>
                      {(Array.isArray(customFields)
                        ? customFields.filter((f) => f.display_in_grid)
                        : []
                      ).map((f) => (
                        <td key={f.id}>
                          {b.custom_fields?.[f.name] ?? f.default_value ?? "-"}
                        </td>
                      ))}
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1 flex-wrap">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            disabled={loading}
                            onClick={() => handleEdit(b)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-success"
                            disabled={loading || hasInvoiceToday}
                            onClick={() => handleGenerateInvoice(b)}
                            title={
                              hasInvoiceToday
                                ? "Invoice already generated today"
                                : ""
                            }
                          >
                            {hasInvoiceToday ? "Invoiced" : "Invoice"}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            disabled={loading}
                            onClick={() => handleDelete(b.id)}
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!pageData.length && !loading && (
                  <tr>
                    <td
                      colSpan={
                        6 +
                        (Array.isArray(customFields)
                          ? customFields.filter((f) => f.display_in_grid).length
                          : 0)
                      }
                      className="text-center text-muted"
                    >
                      No bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-2">
              <small className="text-muted">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, total)} of {total}
              </small>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li
                    className={`page-item ${
                      currentPage === 1 ? "disabled" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() =>
                        currentPage > 1 && goToPage(currentPage - 1)
                      }
                      disabled={currentPage === 1}
                    >
                      Prev
                    </button>
                  </li>
                  <li className="page-item active">
                    <span className="page-link">{currentPage}</span>
                  </li>
                  <li
                    className={`page-item ${
                      currentPage === totalPages ? "disabled" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() =>
                        currentPage < totalPages && goToPage(currentPage + 1)
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
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
                      {isEditing ? "Edit Booking" : "New Booking"}
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
                      <label className="form-label small">Items *</label>

                      {items.map((it, idx) => (
                        <div key={idx} className="d-flex gap-1 mb-1">
                          <select
                            className="form-select form-select-sm"
                            value={it.product_id}
                            onChange={(e) =>
                              updateItem(idx, "product_id", e.target.value)
                            }
                          >
                            <option value="">Select product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} - ₹{p.price}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={it.qty}
                            min="1"
                            onChange={(e) =>
                              updateItem(idx, "qty", e.target.value)
                            }
                            readOnly
                            style={{ width: 70 }}
                          />

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeItem(idx)}
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary mt-1"
                        onClick={addItem}
                      >
                        + Add Item
                      </button>
                    </div>

                    <div className="mb-2">
                      <label className="form-label mb-0 small">
                        Date &amp; Time *
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control form-control-sm"
                        name="booking_date"
                        value={form.booking_date}
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
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
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

      {/* Invoice Confirmation Modal */}
      {showInvoiceModal && selectedBooking && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            style={{ zIndex: 1050 }}
            onClick={closeInvoiceModal}
          >
            <div
              className="modal-dialog modal-dialog-centered modal-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Generate Invoice</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeInvoiceModal}
                    disabled={loading}
                  />
                </div>
                <div className="modal-body">
                  <p>
                    <strong>Customer:</strong> {selectedBooking.customer_name}
                  </p>

                  <p>
                    <strong>Amount:</strong> ₹
                    {selectedBooking.items
                      ?.reduce((sum, i) => sum + Number(i.line_total || 0), 0)
                      .toFixed(2)}
                  </p>
                  <p className="small text-muted">
                    This will mark the booking as completed.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={closeInvoiceModal}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleCreateInvoice}
                    disabled={loading}
                  >
                    {loading ? "Generating..." : "Generate"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1040 }}
            onClick={closeInvoiceModal}
          />
        </>
      )}
    </div>
  );
};

export default BookingPage;
