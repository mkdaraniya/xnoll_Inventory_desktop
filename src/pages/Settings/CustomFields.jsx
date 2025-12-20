import React, { useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import SearchBar from '../../components/common/SearchBar';

const modules = [
  { value: 'customers', label: 'Customers' },
  { value: 'products', label: 'Products' },
  { value: 'bookings', label: 'Bookings' },
];

const fieldTypes = [
  'text',
  'number',
  'date',
  'select',
];

const emptyForm = {
  id: null,
  name: '',
  label: '',
  module: 'customers',
  type: 'text',
  required: 0,
  display_in_grid: 1,
  display_in_filter: 0,
  sortable: 1,
  searchable: 1,
  options: '',
  default_value: '',
};

const CustomFields = () => {
  const [fields, setFields] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [isEditing, setIsEditing] = useState(false);

  const loadFields = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const res =
        moduleFilter === 'all'
          ? await window.xnoll.customFieldsList()
          : await window.xnoll.customFieldsList(moduleFilter);
      setFields(res || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let data = [...fields];
    if (term) {
      data = data.filter(
        (f) =>
          (f.label || '').toLowerCase().includes(term) ||
          (f.name || '').toLowerCase().includes(term) ||
          (f.module || '').toLowerCase().includes(term)
      );
    }
    return data;
  }, [fields, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.xnoll) return;
    setLoading(true);
    // Auto-generate name if empty
    let name = form.name;
    if (!name && form.label) {
      name = form.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }
    // Disallow default_value for date/datetime
    let payload = {
      ...form,
      name,
      required: form.required ? 1 : 0,
      display_in_grid: form.display_in_grid ? 1 : 0,
      display_in_filter: form.display_in_filter ? 1 : 0,
      sortable: form.sortable ? 1 : 0,
      searchable: form.searchable ? 1 : 0,
    };
    if (["date","datetime"].includes(form.type)) {
      payload.default_value = '';
    }
    try {
      if (isEditing && form.id != null) {
        await window.xnoll.customFieldsUpdate(payload);
      } else {
        await window.xnoll.customFieldsCreate(payload);
      }
      await loadFields();
      setShowModal(false);
      setForm(emptyForm);
      setIsEditing(false);
    } catch (err) {
      console.error('Save custom field failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.xnoll) return;
    if (!window.confirm('Delete this custom field?')) return;
    setLoading(true);
    try {
      await window.xnoll.customFieldsDelete(id);
      await loadFields();
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (field) => {
    setForm({
      ...field,
      required: !!field.required,
      display_in_grid: !!field.display_in_grid,
      display_in_filter: !!field.display_in_filter,
      sortable: !!field.sortable,
      searchable: !!field.searchable,
      options: field.options || '',
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const openNew = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setShowModal(true);
  };

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div>
          <h6 className="mb-0">Custom Fields</h6>
          <small className="text-muted">Build per-module fields with grid/filter flags.</small>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <select
            className="form-select form-select-sm"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            <option value="all">All modules</option>
            {modules.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <SearchBar value={search} onChange={setSearch} size="sm" />
          <Button variant="primary" size="sm" onClick={openNew}>
            + Add Field
          </Button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-sm table-striped align-middle">
          <thead className="table-light">
            <tr>
              <th>Label</th>
              <th>Module</th>
              <th>Type</th>
              <th>Grid</th>
              <th>Filter</th>
              <th>Required</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((field) => (
              <tr key={field.id}>
                <td>{field.label}</td>
                <td className="text-capitalize">{field.module}</td>
                <td>{field.type}</td>
                <td>{field.display_in_grid ? 'Yes' : 'No'}</td>
                <td>{field.display_in_filter ? 'Yes' : 'No'}</td>
                <td>{field.required ? 'Yes' : 'No'}</td>
                <td>
                  <div className="btn-group btn-group-sm">
                    <button className="btn btn-outline-primary" onClick={() => openEdit(field)}>
                      Edit
                    </button>
                    <button className="btn btn-outline-danger" onClick={() => handleDelete(field.id)}>
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan="7" className="text-center text-muted">
                  No custom fields yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={isEditing ? 'Edit Custom Field' : 'Add Custom Field'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small mb-0">Label *</label>
              <input
                className="form-control form-control-sm"
                value={form.label}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({
                    ...f,
                    label: val,
                    name:
                      f.name && f.name !== ''
                        ? f.name
                        : val
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '_')
                            .replace(/^_+|_+$/g, ''),
                  }));
                }}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small mb-0">Name (key) *</label>
              <input
                className="form-control form-control-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="unique_key"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small mb-0">Module</label>
              <select
                className="form-select form-select-sm"
                value={form.module}
                onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
              >
                {modules.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small mb-0">Type</label>
              <select
                className="form-select form-select-sm"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {fieldTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small mb-0">Options (comma separated)</label>
              <input
                className="form-control form-control-sm"
                value={form.options}
                onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
                placeholder="option1,option2"
                disabled={!['select'].includes(form.type)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label small mb-0">Default value</label>
              <input
                className="form-control form-control-sm"
                value={form.default_value}
                onChange={(e) => setForm((f) => ({ ...f, default_value: e.target.value }))}
                disabled={['date', 'datetime'].includes(form.type)}
                placeholder={['date', 'datetime'].includes(form.type) ? 'Not allowed for dates' : ''}
              />
            </div>
            <div className="col-12">
              <div className="d-flex flex-wrap gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="cfRequired"
                    checked={!!form.required}
                    onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="cfRequired">
                    Required
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="cfGrid"
                    checked={!!form.display_in_grid}
                    onChange={(e) => setForm((f) => ({ ...f, display_in_grid: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="cfGrid">
                    Show in grid
                  </label>
                </div>
                {/* <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="cfFilter"
                    checked={!!form.display_in_filter}
                    onChange={(e) => setForm((f) => ({ ...f, display_in_filter: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="cfFilter">
                    Filterable
                  </label>
                </div> */}
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="cfSortable"
                    checked={!!form.sortable}
                    onChange={(e) => setForm((f) => ({ ...f, sortable: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="cfSortable">
                    Sortable
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="cfSearch"
                    checked={!!form.searchable}
                    onChange={(e) => setForm((f) => ({ ...f, searchable: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="cfSearch">
                    Searchable
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button variant="outline-secondary" type="button" size="sm" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" size="sm" disabled={loading}>
              {loading ? 'Saving...' : 'Save Field'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomFields;

