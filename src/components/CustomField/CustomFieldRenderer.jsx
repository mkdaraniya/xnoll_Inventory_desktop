import React, { useState, useEffect } from 'react';
import Button from '../common/Button';

const CustomFieldRenderer = ({
  fields = [],
  values = {},
  onChange,
  module,
  loading = false
}) => {
  const [fieldValues, setFieldValues] = useState(values);

  // Helper function to parse options from both comma and newline separated formats
  const parseOptions = (optionsString) => {
    if (!optionsString) return [];

    // Check if it contains commas and no newlines, or newlines and no commas
    if (optionsString.includes(',') && !optionsString.includes('\n')) {
      return optionsString.split(',').map(opt => opt.trim()).filter(opt => opt);
    } else if (optionsString.includes('\n')) {
      return optionsString.split('\n').map(opt => opt.trim()).filter(opt => opt);
    } else {
      // Single option or already split
      return [optionsString.trim()].filter(opt => opt);
    }
  };

useEffect(() => {
    setFieldValues(values);
}, [values]);


const handleFieldChange = (fieldName, value) => {
    const newValues = { ...fieldValues, [fieldName]: value };
    setFieldValues(newValues);
    if (onChange) {
      onChange(fieldName, value);
    }
  };

  const renderField = (field) => {
    const value = fieldValues[field.name] || field.default_value || '';
    const baseFieldProps = {
      disabled: loading,
      required: field.required === 1
    };

    switch (field.type) {
      case 'text':
        return <input type="text" className="form-control" {...baseFieldProps} value={value} onChange={(e) => handleFieldChange(field.name, e.target.value)} />;

      case 'number':
        return <input type="number" className="form-control" {...baseFieldProps} value={value} onChange={(e) => handleFieldChange(field.name, e.target.value)} />;

      case 'date':
        return <input type="date" className="form-control" {...baseFieldProps} value={value} onChange={(e) => handleFieldChange(field.name, e.target.value)} />;

      case 'select':
        const selectOptions = field.options ? parseOptions(field.options) : [];
        return (
          <select
            className="form-select form-select-sm"
            {...baseFieldProps}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            style={{ minHeight: '38px' }}
          >
            <option value="">Select {field.label.toLowerCase()}</option>
            {selectOptions.map((option, index) => (
              <option key={index} value={option.trim()}>
                {option.trim()}
              </option>
            ))}
          </select>
        );

      default:
        return <input type="text" {...baseFieldProps} />;
    }
  };

  if (!fields || fields.length === 0) {
    return null;
  }

  return (
    <div className="custom-fields-section">
      <h6 className="mb-3 text-muted small">Additional Information</h6>
      <div className="row g-3">
        {fields.map(field => (
          <div key={field.id} className="col-md-12 mb-3">
            <label className="form-label fw-semibold">
              {field.label} {field.required === 1 && <span className="text-danger ms-1">*</span>}
            </label>
            {renderField(field)}
            {field.type === 'file' && (
              <small className="text-muted">File upload not yet implemented</small>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomFieldRenderer;
