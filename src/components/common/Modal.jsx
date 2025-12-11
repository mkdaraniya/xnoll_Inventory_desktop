import React, { useEffect } from 'react';
import Button from './Button';

/**
 * Reusable Modal Component
 * @param {boolean} show - Show/hide modal
 * @param {function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {ReactNode} children - Modal content
 * @param {ReactNode} footer - Custom footer
 * @param {string} size - sm, md, lg, xl
 * @param {boolean} closeOnEscape - Close on ESC key
 * @param {boolean} closeOnBackdrop - Close on backdrop click
 */
const Modal = ({
  show = false,
  onClose,
  title = '',
  children,
  footer,
  size = 'md',
  closeOnEscape = true,
  closeOnBackdrop = true,
  className = ''
}) => {
  useEffect(() => {
    if (!show) return;

    // Handle ESC key
    const handleEscape = (e) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [show, closeOnEscape, onClose]);

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  if (!show) return null;

  const sizeClass = {
    sm: 'modal-sm',
    md: '',
    lg: 'modal-lg',
    xl: 'modal-xl'
  }[size] || '';

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        style={{ zIndex: 1050 }}
        onClick={handleBackdropClick}
      >
        <div
          className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${sizeClass} ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            {title && (
              <div className="modal-header">
                <h5 className="modal-title">{title}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  aria-label="Close"
                />
              </div>
            )}
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1040 }}
        onClick={handleBackdropClick}
      />
    </>
  );
};

export default Modal;