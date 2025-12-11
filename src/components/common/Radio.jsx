// src/components/common/Radio.jsx
import React from 'react';
import PropTypes from 'prop-types';

export const Radio = ({
  label,
  name,
  value,
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <label className={`radio ${disabled ? 'is-disabled' : ''}`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={!!checked}
        disabled={disabled}
        onChange={e =>
          onChange({
            target: { name, value: e.target.value },
          })
        }
      />
      <span className="radio-mark" />
      <span className="radio-label">{label}</span>
    </label>
  );
};

Radio.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,
  checked: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export const RadioGroup = ({
  label,
  name,
  value,
  options,
  onChange,
  required = false,
  error,
  inline = false,
}) => {
  return (
    <div className="form-group">
      {label && (
        <div className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </div>
      )}
      <div className={inline ? 'd-flex flex-wrap gap-3' : 'd-flex flex-column'}>
        {options.map(opt => (
          <Radio
            key={opt.value}
            name={name}
            label={opt.label}
            value={opt.value}
            checked={opt.value === value}
            onChange={onChange}
          />
        ))}
      </div>
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
};

RadioGroup.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.any,
  options: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.any, label: PropTypes.string })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  error: PropTypes.string,
  inline: PropTypes.bool,
};

export default RadioGroup;
