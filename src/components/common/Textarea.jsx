import React from 'react';

/**
 * Reusable Textarea Component
 */
const Textarea = ({
  name,
  value,
  onChange,
  onBlur,
  label,
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  error = '',
  helpText = '',
  rows = 3,
  maxLength,
  className = '',
  autoFocus = false,
  ...props
}) => {
  const errorClass = error ? 'is-invalid' : '';

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={name} className="form-label mb-1">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </label>
      )}
      
      <textarea
        id={name}
        name={name}
        className={`form-control ${errorClass}`}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        rows={rows}
        maxLength={maxLength}
        autoFocus={autoFocus}
        {...props}
      />
      
      {maxLength && (
        <small className="form-text text-muted d-block text-end">
          {value?.length || 0} / {maxLength}
        </small>
      )}
      
      {error && (
        <div className="invalid-feedback d-block">
          {error}
        </div>
      )}
      
      {helpText && !error && (
        <small className="form-text text-muted d-block mt-1">
          {helpText}
        </small>
      )}
    </div>
  );
};

export default Textarea;