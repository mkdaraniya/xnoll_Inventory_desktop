import React, { useEffect, useMemo, useState } from "react";
import CustomFieldRenderer from "../../components/CustomField/CustomFieldRenderer";
import Pagination from "../../components/common/Pagination";
import UnifiedLoader from "../../components/common/UnifiedLoader";
import {
  deserializeCustomFieldValue,
  formatCustomFieldDisplayValue,
  serializeCustomFieldValue,
} from "../../utils/customFields";
import {
  confirmAction,
  ensureSuccess,
  notifyError,
  notifySuccess,
} from "../../utils/feedback";
import { formatCurrency } from "../../utils/format";
import { isNonNegativeNumber, validateRequiredFields } from "../../utils/validation";

const emptyForm = { id: null, sku: "", name: "", unit: "", price: "", default_tax_id: "" };
const PAGE_SIZE = 10;
const DEFAULT_UNIT_OPTIONS = [
  "pcs",
  "box",
  "kg",
  "g",
  "ltr",
  "ml",
  "m",
  "sqft",
  "hr",
  "day",
  "service",
];
const buildGeneratedCode = (prefix = "SKU") =>
  `${String(prefix || "SKU").trim().toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [currency, setCurrency] = useState("INR");
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    auto_generate_sku: 1,
    sku_prefix: "SKU",
  });
  const [taxRates, setTaxRates] = useState([]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("desc");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const unitOptions = useMemo(() => {
    const dynamicUnits = products
      .map((p) => String(p.unit || "").trim())
      .filter(Boolean);
    const currentUnit = String(form.unit || "").trim();
    const allUnits = [...DEFAULT_UNIT_OPTIONS, ...dynamicUnits, currentUnit].filter(Boolean);
    return [...new Set(allUnits)];
  }, [products, form.unit]);

  const loadProducts = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const [res, fields, settingsRes, taxRes] = await Promise.all([
        window.xnoll.productsQuery({
          page,
          pageSize,
          search,
          sortKey,
          sortDir,
        }),
        window.xnoll.customFieldsList("products"),
        window.xnoll.settingsGet(),
        window.xnoll.taxRatesList(),
      ]);

      ensureSuccess(res, "Unable to load products.");
      setProducts(res.rows || []);
      setTotal(Number(res.total || 0));
      setTotalPages(Number(res.totalPages || 1));
      setCustomFields(fields || []);
      setTaxRates(taxRes?.rows || []);
      if (settingsRes?.success && settingsRes.settings) {
        setSettings((prev) => ({ ...prev, ...settingsRes.settings }));
        setCurrency(settingsRes.settings.currency || "INR");
      }
    } catch (error) {
      notifyError(error, "Unable to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [page, pageSize, search, sortKey, sortDir]);

  const currentPage = Math.min(page, totalPages || 1);
  const pageData = useMemo(() => products, [products]);

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

  // ---------- form / modal handlers ----------
  const resetForm = () => {
    setForm(emptyForm);
    setCustomFieldValues({});
    setIsEditing(false);
  };

  const openNewModal = () => {
    const defaultTax = (taxRates || []).find((t) => Number(t.is_default) === 1 && Number(t.is_active) === 1);
    resetForm();
    setShowModal(true);
    if (defaultTax) {
      setForm((prev) => ({ ...prev, default_tax_id: String(defaultTax.id) }));
    }
    const fallbackSku = buildGeneratedCode(settings.sku_prefix || "SKU");
    setForm((prev) => ({ ...prev, sku: fallbackSku }));
    window.xnoll
      ?.skuGenerate?.({ prefix: settings.sku_prefix || "SKU", name: "" })
      .then((resp) => {
        if (resp?.sku) {
          setForm((prev) => ({ ...prev, sku: resp.sku }));
        }
      })
      .catch(() => {});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "name" && !isEditing) {
      window.xnoll
        ?.skuGenerate?.({ prefix: settings.sku_prefix || "SKU", name: value })
        .then((resp) => {
          if (resp?.sku) {
            setForm((prev) => ({ ...prev, sku: resp.sku }));
          }
        })
        .catch(() => {});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;

    const payload = {
      id: form.id,
      sku: String(form.sku || buildGeneratedCode(settings.sku_prefix || "SKU")).trim(),
      name: form.name.trim(),
      unit: form.unit.trim(),
      price: parseFloat(form.price || "0") || 0,
      default_tax_id: form.default_tax_id ? Number(form.default_tax_id) : null,
    };

    const requiredError = validateRequiredFields({ name: payload.name }, { name: "Name" });
    if (requiredError) return notifyError(requiredError);
    if (!isNonNegativeNumber(payload.price)) return notifyError("Price cannot be negative.");

    setLoading(true);
    try {
      let productId;
      if (isEditing && payload.id != null) {
        ensureSuccess(await window.xnoll.productsUpdate(payload), "Unable to update product.");
        productId = payload.id;
      } else {
        const result = ensureSuccess(await window.xnoll.productsCreate(payload), "Unable to create product.");
        productId = result.id;
      }

      // Save custom field values
      if (customFields.length > 0 && productId) {
        for (const field of customFields) {
          const value = customFieldValues[field.name];
          const serializedValue = serializeCustomFieldValue(field, value);
          if (serializedValue !== "") {
            await window.xnoll.customFieldValuesSave({
              field_id: field.id,
              record_id: productId,
              value: serializedValue,
            });
          }
        }
      }

      resetForm();
      setShowModal(false);
      await loadProducts();
      notifySuccess(isEditing ? "Product updated successfully." : "Product created successfully.");
    } catch (error) {
      notifyError(error, "Unable to save product.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (p) => {
    setForm({
      id: p.id,
      sku: p.sku || "",
      name: p.name || "",
      unit: p.unit || "",
      price: p.price != null ? String(p.price) : "",
      default_tax_id: p.default_tax_id ? String(p.default_tax_id) : "",
    });

    // Load custom field values for this product
    if (customFields.length > 0) {
      try {
        const values = {};
        for (const field of customFields) {
          const result = await window.xnoll.customFieldValuesGet(
            field.id,
            p.id
          );
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
      title: "Delete product?",
      text: "This product will be removed permanently.",
      confirmButtonText: "Delete",
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      ensureSuccess(await window.xnoll.productsDelete(id), "Unable to delete product.");
      await loadProducts();
      notifySuccess("Product deleted successfully.");
    } catch (error) {
      notifyError(error, "Unable to delete product.");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <div>
      <h4 className="mb-3">Products / Services</h4>

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
              placeholder="Search name / SKU"
              style={{ minWidth: 220 }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <button className="btn btn-sm btn-primary" onClick={openNewModal}>
              + New Product
            </button>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <UnifiedLoader show={loading} text="Loading products..." />
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
                    style={{ width: "140px", cursor: "pointer" }}
                    onClick={() => handleSort("sku")}
                  >
                    SKU {sortIcon("sku")}
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("name")}
                  >
                    Name {sortIcon("name")}
                  </th>
                  <th style={{ width: "80px" }}>Unit</th>
                  <th
                    style={{ width: "100px", cursor: "pointer" }}
                    onClick={() => handleSort("price")}
                  >
                    Price {sortIcon("price")}
                  </th>
                  <th style={{ width: "160px" }}>Default Tax</th>
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
                {pageData.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.unit}</td>
                    <td>{formatCurrency(p.price, currency)}</td>
                    <td>
                      {(() => {
                        const tax = (taxRates || []).find((t) => Number(t.id) === Number(p.default_tax_id || 0));
                        return tax ? `${tax.name} (${Number(tax.rate || 0).toFixed(2)}%)` : "-";
                      })()}
                    </td>
                    {(Array.isArray(customFields)
                      ? customFields.filter((f) => f.display_in_grid)
                      : []
                    ).map((f) => (
                      <td key={f.id}>
                        {formatCustomFieldDisplayValue(
                          f,
                          p.custom_fields?.[f.name] ?? f.default_value
                        )}
                      </td>
                    ))}
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => handleEdit(p)}
                        disabled={loading}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(p.id)}
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
                        7 +
                        (Array.isArray(customFields)
                          ? customFields.filter((f) => f.display_in_grid)
                          : []
                        ).length
                      }
                      className="text-center text-muted"
                    >
                      No products found.
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
            Product master is used across inventory and invoice workflows.
          </small>
        </div>
      </div>

      {/* Modal */}
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
                      {isEditing ? "Edit Product" : "New Product / Service"}
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
                        SKU / Code
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        name="sku"
                        value={form.sku}
                        disabled
                        readOnly
                      />
                    </div>
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
                      <label className="form-label mb-0 small">Unit</label>
                      <select
                        className="form-select form-select-sm"
                        name="unit"
                        value={form.unit}
                        onChange={handleChange}
                        disabled={loading}
                      >
                        <option value="">Select unit</option>
                        {unitOptions.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-0">
                      <label className="form-label mb-0 small">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        name="price"
                        value={form.price}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>
                    <div className="mt-2">
                      <label className="form-label mb-0 small">Default Tax</label>
                      <select
                        className="form-select form-select-sm"
                        name="default_tax_id"
                        value={form.default_tax_id || ""}
                        onChange={handleChange}
                        disabled={loading}
                      >
                        <option value="">No default tax</option>
                        {(taxRates || [])
                          .filter((t) => Number(t.is_active) === 1)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({Number(t.rate || 0).toFixed(2)}%)
                            </option>
                          ))}
                      </select>
                    </div>
                    {/* Place Custom Fields here */}
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
                          module="products"
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

export default Products;
