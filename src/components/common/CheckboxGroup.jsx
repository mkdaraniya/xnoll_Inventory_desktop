// src/components/common/CheckboxGroup.jsx
import React from 'react';
import PropTypes from 'prop-types';

const CheckboxGroup = ({
  label,
  name,
  values = [],
  options,
  onChange,
  required = false,
  error,
  inline = false,
}) => {
  const handleToggle = optionValue => {
    const set = new Set(values || []);
    if (set.has(optionValue)) {
      set.delete(optionValue);
    } else {
      set.add(optionValue);
    }
    onChange({
      target: { name, value: Array.from(set) },
    });
  };

  const isChecked = v => (values || []).includes(v);

  return (
    <div className="form-group">
      {label && (
        <div className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </div>
      )}
      <div className={inline ? 'd-flex flex-wrap gap-3' : 'd-flex flex-column'}>
        {options.map(opt => (
          <div
            key={opt.value}
            className="form-check form-switch ui-switch"
            onClick={e => e.stopPropagation()}
          >
            <input
              className="form-check-input"
              id={`${name}-${String(opt.value)}`}
              type="checkbox"
              checked={isChecked(opt.value)}
              onChange={() => handleToggle(opt.value)}
            />
            <label className="form-check-label" htmlFor={`${name}-${String(opt.value)}`}>
              {opt.label}
            </label>
          </div>
        ))}
      </div>
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
};

CheckboxGroup.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  values: PropTypes.array,
  options: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.any, label: PropTypes.string })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  error: PropTypes.string,
  inline: PropTypes.bool,
};

export default CheckboxGroup;
