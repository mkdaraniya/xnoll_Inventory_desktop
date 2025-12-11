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
          <label
            key={opt.value}
            className="checkbox"
            onClick={e => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isChecked(opt.value)}
              onChange={() => handleToggle(opt.value)}
            />
            <span className="checkbox-mark" />
            <span className="checkbox-label">{opt.label}</span>
          </label>
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
