// src/components/common/Select.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';

const Select = ({
  label,
  name,
  value,
  options,
  onChange,
  placeholder = '',
  error,
  required = false,
  disabled = false,
  allowClear = true,
  showSearch = true,
  autoFocus = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const filteredOptions = useMemo(() => {
    if (!showSearch || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      o =>
        String(o.label).toLowerCase().includes(q) ||
        String(o.value).toLowerCase().includes(q),
    );
  }, [options, query, showSearch]);

  const selectedOption = options.find(o => o.value === value) || null;

  const handleSelect = option => {
    if (!option) return;
    onChange({ target: { name, value: option.value } });
    setOpen(false);
  };

  const handleClear = e => {
    e.stopPropagation();
    onChange({ target: { name, value: '' } });
    setQuery('');
  };

  // Click outside
  useEffect(() => {
    const handler = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  // Keyboard: Enter to open, Esc to close
  useKeyboardShortcut('Enter', () => {
    if (!open) setOpen(true);
  }, [open]);

  useKeyboardShortcut('Escape', () => {
    if (open) setOpen(false);
  }, [open]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className="form-group" ref={containerRef}>
      {label && (
        <label className="form-label" htmlFor={name}>
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}

      <div
        className={`select control ${disabled ? 'is-disabled' : ''} ${
          error ? 'is-invalid' : ''
        }`}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <div className="select-value">
          {selectedOption ? selectedOption.label : (
            <span className="text-muted">{placeholder}</span>
          )}
        </div>
        <div className="select-actions">
          {allowClear && value && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={handleClear}
              tabIndex={-1}
            >
              ×
            </button>
          )}
          <span className="select-arrow">▾</span>
        </div>
      </div>

      {open && (
        <div className="select-dropdown">
          {showSearch && (
            <div className="select-search">
              <input
                ref={inputRef}
                type="text"
                className="form-control"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search..."
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}
          <div className="select-options">
            {filteredOptions.length === 0 && (
              <div className="select-option text-muted">
                No options
              </div>
            )}
            {filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                className={`select-option ${
                  option.value === value ? 'is-selected' : ''
                }`}
                onClick={e => {
                  e.stopPropagation();
                  handleSelect(option);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
};

Select.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.any,
  options: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.any, label: PropTypes.string })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  allowClear: PropTypes.bool,
  showSearch: PropTypes.bool,
  autoFocus: PropTypes.bool,
};

export default Select;
