
import React from 'react';

/**
 * Reusable Button Component
 * @param {string} variant - primary, secondary, success, danger, warning, info
 * @param {string} size - sm, md, lg
 * @param {boolean} loading - show loading spinner
 * @param {boolean} disabled - disable button
 * @param {string} shortcut - keyboard shortcut to display
 * @param {ReactNode} icon - icon component
 * @param {string} className - additional classes
 * @param {function} onClick - click handler
 * @param {string} type - button type (button, submit, reset)
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  shortcut = '',
  icon = null,
  className = '',
  onClick,
  type = 'button',
  fullWidth = false,
  ...props
}) => {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-outline-secondary',
    success: 'btn-success',
    danger: 'btn-danger',
    warning: 'btn-warning',
    info: 'btn-info',
    light: 'btn-light',
    dark: 'btn-dark',
    link: 'btn-link',
    'outline-primary': 'btn-outline-primary',
    'outline-secondary': 'btn-outline-secondary',
    'outline-success': 'btn-outline-success',
    'outline-danger': 'btn-outline-danger',
    'outline-warning': 'btn-outline-warning',
    'outline-info': 'btn-outline-info'
  };

  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  };

  const baseClass = 'btn';
  const variantClass = variantClasses[variant] || variantClasses.primary;
  const sizeClass = sizeClasses[size] || '';
  const widthClass = fullWidth ? 'w-100' : '';
  const disabledClass = (disabled || loading) ? 'disabled' : '';

  const buttonClass = `${baseClass} ${variantClass} ${sizeClass} ${widthClass} ${disabledClass} ${className}`.trim();

  return (
    <button
      type={type}
      className={buttonClass}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      )}
      {!loading && icon && <span className="me-2">{icon}</span>}
      <span>{children}</span>
      {shortcut && (
        <kbd className="ms-2" style={{ fontSize: '0.75em', opacity: 0.7 }}>
          {shortcut}
        </kbd>
      )}
    </button>
  );
};

export default Button;