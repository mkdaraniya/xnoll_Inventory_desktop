// src/components/common/DateTimeInput.jsx
import React from 'react';
import PropTypes from 'prop-types';

const DateTimeInput = ({
  label,
  name,
  value,
  onChange,
  required = false,
  error,
  min,
  max,
}) => {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label" htmlFor={name}>
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type="datetime-local"
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value || ''}
        min={min}
        max={max}
        onChange={onChange}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
};

DateTimeInput.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  error: PropTypes.string,
  min: PropTypes.string,
  max: PropTypes.string,
};

export default DateTimeInput;
