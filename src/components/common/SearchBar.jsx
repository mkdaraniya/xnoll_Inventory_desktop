import React, { useState, useEffect, useRef } from 'react';

/**
 * Reusable SearchBar Component with debouncing
 * @param {string} placeholder - placeholder text
 * @param {string} value - controlled value
 * @param {function} onChange - change handler
 * @param {number} debounce - debounce delay in ms
 * @param {function} onClear - clear handler
 * @param {boolean} autoFocus - auto focus on mount
 * @param {string} className - additional classes
 */
const SearchBar = ({
  placeholder = 'Search...',
  value = '',
  onChange,
  debounce = 300,
  onClear,
  autoFocus = false,
  className = '',
  size = 'md'
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Register global keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      if (onChange) {
        onChange(newValue);
      }
    }, debounce);
  };

  const handleClear = () => {
    setLocalValue('');
    if (onChange) {
      onChange('');
    }
    if (onClear) {
      onClear();
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const sizeClass = size === 'sm' ? 'form-control-sm' : size === 'lg' ? 'form-control-lg' : '';

  return (
    <div className={`position-relative ${className}`}>
      <div className="input-group">
        <span className="input-group-text bg-white border-end-0">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          className={`form-control border-start-0 ps-0 ${sizeClass}`}
          placeholder={placeholder}
          value={localValue}
          onChange={handleChange}
          style={{ boxShadow: 'none' }}
        />
        {localValue && (
          <button
            className="btn btn-link text-muted position-absolute end-0 top-50 translate-middle-y pe-3"
            onClick={handleClear}
            type="button"
            style={{ zIndex: 10 }}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
            </svg>
          </button>
        )}
      </div>
      <small className="text-muted d-block mt-1">
        Press <kbd>Ctrl+K</kbd> to focus search
      </small>
    </div>
  );
};

export default SearchBar;