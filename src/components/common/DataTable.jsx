import React, { useMemo, useState } from 'react';
import SearchBar from './SearchBar';

const DataTable = ({ data = [], columns = [], onEdit, onDelete, pageSize = 10, filters = {} }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('id');
  const [sortDir, setSortDir] = useState('desc');

  const filteredData = useMemo(() => {
    let filtered = [...data];
    // Apply custom filters (e.g., from custom fields)
    Object.entries(filters).forEach(([key, val]) => {
      if (val) filtered = filtered.filter(row => String(row[key] || '').toLowerCase().includes(val.toLowerCase()));
    });
    // Search
    if (search) {
      filtered = filtered.filter(row => 
        columns.some(col => String(row[col.key] || '').toLowerCase().includes(search.toLowerCase()))
      );
    }
    // Sort
    filtered.sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      return (va > vb ? 1 : -1) * (sortDir === 'asc' ? 1 : -1);
    });
    return filtered;
  }, [data, search, sortKey, sortDir, filters]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginated = filteredData.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  return (
    <div>
      <div className="d-flex justify-content-between mb-2">
        <SearchBar value={search} onChange={setSearch} onFocusShortcut={() => setPage(1)} />
        {Object.keys(filters).length > 0 && (
          <div className="d-flex gap-2">
            {Object.entries(filters).map(([key, val]) => (
              val ? <input key={key} className="form-control form-control-sm" placeholder={key} value={val} onChange={e => filters.onChange(key, e.target.value)} /> : null
            ))}
          </div>
        )}
      </div>
      <div className="table-responsive" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <table className="table table-sm table-striped">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)} style={{ cursor: 'pointer' }}>
                  {col.label} {sortKey === col.key && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(row => (
              <tr key={row.id}>
                {columns.map(col => <td key={col.key}>{row[col.key]}</td>)}
                <td>
                  <button className="btn btn-sm btn-outline-primary me-1" onClick={() => onEdit(row)}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(row.id)}>Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <nav className="d-flex justify-content-between">
          <span>Page {page} of {totalPages}</span>
          <div>
            <button className="btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <button className="btn btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default DataTable;