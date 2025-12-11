import React from 'react';

/**
 * Reusable Input Component
 * @param {string} type - text, number, email, tel, password, url
 * @param {string} name - input name
 * @param {string} value - input value
 * @param {function} onChange - change handler
 * @param {string} label - input label
 * @param {string} placeholder - placeholder text
 * @param {boolean} required - required field
 * @param {boolean} disabled - disabled state
 * @param {string} error - error message
 * @param {string} helpText - help text below input
 * @param {string} size - sm, md, lg
 * @param {ReactNode} icon - icon to display
 * @param {string} className - additional classes
 */
const Input = ({
  type = 'text',
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
  size = 'md',
  icon = null,
  className = '',
  autoFocus = false,
  min,
  max,
  step,
  pattern,
  maxLength,
  ...props
}) => {
  const sizeClass = {
    sm: 'form-control-sm',
    md: '',
    lg: 'form-control-lg'
  }[size] || '';

  const errorClass = error ? 'is-invalid' : '';

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={name} className="form-label mb-1">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </label>
      )}
      
      <div className={icon ? 'input-group' : ''}>
        {icon && (
          <span className="input-group-text">
            {icon}
          </span>
        )}
        
        <input
          type={type}
          id={name}
          name={name}
          className={`form-control ${sizeClass} ${errorClass}`}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          min={min}
          max={max}
          step={step}
          pattern={pattern}
          maxLength={maxLength}
          {...props}
        />
        
        {error && (
          <div className="invalid-feedback">
            {error}
          </div>
        )}
      </div>
      
      {helpText && !error && (
        <small className="form-text text-muted d-block mt-1">
          {helpText}
        </small>
      )}
    </div>
  );
};

export default Input;