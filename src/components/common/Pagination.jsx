import React from 'react';
import Button from './Button';

const Pagination = ({
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  totalItems,
  showInfo = true
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 mt-3">
      {showInfo && (
        <div className="text-muted small">
          Showing {startItem}–{endItem} of {totalItems} entries
        </div>
      )}

      <div className="d-flex align-items-center gap-2">
        {/* Page Size Selector */}
        <div className="d-flex align-items-center gap-1">
          <span className="text-muted small">Show:</span>
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        {/* Pagination Controls */}
        <nav>
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2"
              >
                ‹
              </Button>
            </li>

            {getVisiblePages().map((page, index) => (
              <li key={index} className={`page-item ${page === currentPage ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}>
                {page === '...' ? (
                  <span className="page-link">...</span>
                ) : (
                  <Button
                    variant={page === currentPage ? 'primary' : 'outline-secondary'}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className="px-3"
                  >
                    {page}
                  </Button>
                )}
              </li>
            ))}

            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2"
              >
                ›
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Pagination;
