import React from 'react';

const CustomFieldRenderer = ({
  fields = [],
  values = {},         // controlled values object keyed by field.name
  onChange,            // function (fieldName, value)
  loading = false
}) => {

  // parse comma or newline separated options
  const parseOptions = (optionsString = '') => {
    return optionsString
      .split(/[\n,]/)
      .map(opt => opt.trim())
      .filter(Boolean);
  };

  // Handler invoked from inputs
  const handleFieldChange = (fieldName, value) => {
    if (typeof onChange === 'function') {
      onChange(fieldName, value);
    }
  };

  // read value from the controlled prop; only use default if undefined
  const getValue = (field) => {
    return values[field.name] !== undefined ? values[field.name] : (field.default_value ?? '');
  };

  if (!fields || fields.length === 0) return null;

  return (
    <div className="custom-fields-section">
      <h6 className="mb-3 text-muted small">Additional Information</h6>
      <div className="row g-3">
        {fields.map(field => (
          <div key={field.id} className="col-md-12">
            <label className="form-label">
              {field.label} {field.required === 1 && <span className="text-danger ms-1">*</span>}
            </label>

            {field.type === 'text' && (
              <input
                type="text"
                className="form-control"
                disabled={loading}
                required={field.required === 1}
                value={String(getValue(field))}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                className="form-control"
                disabled={loading}
                required={field.required === 1}
                value={getValue(field) !== '' ? getValue(field) : ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
              />
            )}

            {field.type === 'date' && (
              <input
                type="date"
                className="form-control"
                disabled={loading}
                required={field.required === 1}
                value={String(getValue(field))}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
              />
            )}

            {field.type === 'select' && (
              <select
                className="form-select form-select-sm"
                disabled={loading}
                required={field.required === 1}
                value={String(getValue(field) ?? '')}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                style={{ minHeight: '38px' }}
              >
                <option value="">Select {field.label.toLowerCase()}</option>
                {parseOptions(field.options).map((option, idx) => (
                  <option key={idx} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'file' && (
              <small className="text-muted">File upload not yet implemented</small>
            )}

            {/* fallback for unknown types */}
            {!['text','number','date','select','file'].includes(field.type) && (
              <input
                type="text"
                className="form-control"
                disabled={loading}
                required={field.required === 1}
                value={String(getValue(field))}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomFieldRenderer;
