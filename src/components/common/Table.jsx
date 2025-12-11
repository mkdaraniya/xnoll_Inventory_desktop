import React, { useState, useMemo } from 'react';
import Button from './Button';

/**
 * Reusable Table Component
 * @param {Array} columns - Column definitions [{ key, label, sortable, render, width }]
 * @param {Array} data - Table data
 * @param {number} pageSize - Items per page
 * @param {boolean} pagination - Enable pagination
 * @param {boolean} exportable - Show export button
 * @param {function} onRowClick - Row click handler
 * @param {string} emptyMessage - Message when no data
 * @param {boolean} striped - Striped rows
 * @param {boolean} hover - Hover effect
 */
const Table = ({
  columns = [],
  data = [],
  pageSize = 10,
  pagination = true,
  exportable = true,
  onRowClick,
  emptyMessage = 'No data available',
  striped = true,
  hover = true,
  loading = false,
  className = ''
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize, pagination]);

  const handleSort = (key) => {
    const column = columns.find(col => col.key === key);
    if (!column || column.sortable === false) return;
    
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const getSortIcon = (key) => {
    if (sortKey !== key) return '⬍';
    return sortDir === 'asc' ? '▲' : '▼';
  };

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = columns.map(col => col.label).join(',');
    const rows = sortedData.map(row => 
      columns.map(col => {
        const value = row[col.key] ?? '';
        // Escape commas and quotes
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `export_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stripedClass = striped ? 'table-striped' : '';
  const hoverClass = hover ? 'table-hover' : '';

  return (
    <div className={className}>
      {exportable && data.length > 0 && (
        <div className="d-flex justify-content-end mb-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={exportToCSV}
            icon={
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
              </svg>
            }
          >
            Export CSV
          </Button>
        </div>
      )}
      
      <div className="table-responsive" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <table className={`table table-sm align-middle ${stripedClass} ${hoverClass}`}>
          <thead className="table-light sticky-top">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ 
                    width: col.width, 
                    cursor: col.sortable !== false ? 'pointer' : 'default' 
                  }}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {col.sortable !== false && (
                    <span className="ms-2 text-muted" style={{ fontSize: '0.8em' }}>
                      {getSortIcon(col.key)}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length} className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </td>
              </tr>
            )}
            
            {!loading && paginatedData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center text-muted py-4">
                  {emptyMessage}
                </td>
              </tr>
            )}
            
            {!loading && paginatedData.map((row, idx) => (
              <tr 
                key={row.id || idx}
                onClick={() => onRowClick && onRowClick(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">
            Showing {(safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, sortedData.length)} of {sortedData.length}
          </small>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${safePage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage === 1}
                >
                  Previous
                </button>
              </li>
              
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                // Show first, last, current, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= safePage - 1 && page <= safePage + 1)
                ) {
                  return (
                    <li
                      key={page}
                      className={`page-item ${page === safePage ? 'active' : ''}`}
                    >
                      <button className="page-link" onClick={() => goToPage(page)}>
                        {page}
                      </button>
                    </li>
                  );
                } else if (page === safePage - 2 || page === safePage + 2) {
                  return (
                    <li key={page} className="page-item disabled">
                      <span className="page-link">...</span>
                    </li>
                  );
                }
                return null;
              })}
              
              <li className={`page-item ${safePage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage === totalPages}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
};

export default Table;