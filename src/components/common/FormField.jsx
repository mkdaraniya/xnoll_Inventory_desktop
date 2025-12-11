import React, { useRef } from 'react';

const FormField = ({ label, type = 'text', name, value, onChange, required = false, error = '', options = [], withSearch = false }) => {
  const ref = useRef(null);

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      ref.current?.form?.dispatchEvent(new Event('submit'));
    } else if (e.key === 'Escape') {
      ref.current?.blur();
    } else if (e.key === 'Tab') {
      // Auto-focus next
    }
  };

  const renderSelect = () => (
    <select ref={ref} name={name} value={value} onChange={onChange} onKeyDown={handleKey} required={required} className={error ? 'is-invalid' : ''}>
      <option value="">Select...</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  );

  return (
    <div className="mb-2">
      <label className="form-label small">{label} {required && '*'}</label>
      {type === 'select' ? renderSelect() : (
        <input
          ref={ref}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onKeyDown={handleKey}
          className={`form-control form-control-sm ${error ? 'is-invalid' : ''}`}
          required={required}
          list={withSearch ? `${name}-list` : undefined}
        />
      )}
      {error && <div className="invalid-feedback">{error}</div>}
      {withSearch && options.length > 0 && (
        <datalist id={`${name}-list`}>
          {options.map(opt => <option key={opt.value} value={opt.value} />)}
        </datalist>
      )}
      <small className="text-muted">Tab/Enter to navigate, Esc to cancel</small>
    </div>
  );
};

export default FormField;