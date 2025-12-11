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

      case 'email':
        return <input type="email" className="form-control" {...baseFieldProps} value={value} onChange={(e) => handleFieldChange(field.name, e.target.value)} />;

      case 'phone':
        return <input type="tel" className="form-control" {...baseFieldProps} value={value} onChange={(e) => handleFieldChange(field.name, e.target.value)} />;

      case 'url':
        return <input type="url" className="form-control" {...baseFieldProps} value={value} onChange={(e) => handleFieldChange(field.name, e.target.value)} />;

      case 'textarea':
        return (
          <textarea
            className="form-control"
            rows="3"
            {...baseFieldProps}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );

      case 'date':
        return <input type="date" className="form-control" {...baseFieldProps} value={value} onChange={(e) => handleFieldChange(field.name, e.target.value)} />;

      case 'datetime':
        return <input type="datetime-local" className="form-control" {...baseFieldProps} value={value} onChange={(e) => handleFieldChange(field.name, e.target.value)} />;

      case 'checkbox':
        return (
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              checked={value === '1' || value === true}
              onChange={(e) => handleFieldChange(field.name, e.target.checked ? '1' : '0')}
              disabled={loading}
            />
          </div>
        );

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

      case 'multi_select':
        const multiSelectOptions = field.options ? parseOptions(field.options) : [];
        // Robust selected logic: always trim and dedup
        const selectedValues = (value ? value.split(',') : []).map(v => v.trim()).filter(Boolean);
        return (
          <div className="border border-secondary rounded p-2 bg-light" style={{ minHeight: '100px', maxHeight: '200px', overflowY: 'auto' }}>
            <small className="text-muted d-block mb-2">Select multiple options:</small>
            {multiSelectOptions.map((option, index) => {
              const optionValue = option.trim();
              const isSelected = selectedValues.includes(optionValue);
              return (
                <div key={index} className="form-check mb-1">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={isSelected}
                    onChange={(e) => {
                      let newSelected = [...selectedValues];
                      if (e.target.checked) {
                        if (!newSelected.includes(optionValue)) newSelected.push(optionValue);
                      } else {
                        newSelected = newSelected.filter(v => v !== optionValue);
                      }
                      handleFieldChange(field.name, newSelected.filter(Boolean).map(v => v.trim()).join(','));
                    }}
                    disabled={loading}
                    id={`multi_${field.name}_${index}`}
                  />
                  <label className="form-check-label small" htmlFor={`multi_${field.name}_${index}`}>{optionValue}</label>
                </div>
              );
            })}
          </div>
        );

      case 'radio':
        const radioOptions = field.options ? parseOptions(field.options) : [];
        return (
          <div>
            {radioOptions.map((option, index) => {
              const optionValue = option.trim();
              return (
                <div key={index} className="form-check">
                  <input
                    type="radio"
                    className="form-check-input"
                    name={`custom_${field.name}`}
                    value={optionValue}
                    checked={value === optionValue}
                    onChange={(e) => handleFieldChange(field.name, optionValue)}
                    disabled={loading}
                    required={field.required === 1}
                  />
                  <label className="form-check-label">
                    {optionValue}
                  </label>
                </div>
              );
            })}
          </div>
        );

      case 'checkbox_group':
        const checkboxOptions = field.options ? parseOptions(field.options) : [];
        const checkedValues = (value ? value.split(',') : []).map(v => v.trim()).filter(Boolean);
        return (
          <div className="border border-secondary rounded p-2 bg-light" style={{ minHeight: '100px', maxHeight: '200px', overflowY: 'auto' }}>
            <small className="text-muted d-block mb-2">Select multiple options:</small>
            {checkboxOptions.map((option, index) => {
              const optionValue = option.trim();
              const isChecked = checkedValues.includes(optionValue);
              return (
                <div key={index} className="form-check mb-1">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={isChecked}
                    onChange={(e) => {
                      let newChecked = [...checkedValues];
                      if (e.target.checked) {
                        if (!newChecked.includes(optionValue)) newChecked.push(optionValue);
                      } else {
                        newChecked = newChecked.filter(v => v !== optionValue);
                      }
                      handleFieldChange(field.name, newChecked.filter(Boolean).map(v => v.trim()).join(','));
                    }}
                    disabled={loading}
                    id={`checkbox_${field.name}_${index}`}
                  />
                  <label className="form-check-label small" htmlFor={`checkbox_${field.name}_${index}`}>{optionValue}</label>
                </div>
              );
            })}
          </div>
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
