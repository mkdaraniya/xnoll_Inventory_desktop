import React, { useEffect, useState, useMemo } from "react";
import Button from "../../components/common/Button";
import { formatCurrency } from '../../utils/format';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [currency, setCurrency] = useState('INR');
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    status: '',
    customer: '',
    product: ''
  });

  const [data, setData] = useState({
    customers: [],
    products: [],
    bookings: [],
    invoices: []
  });

  const loadData = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const [customers, products, bookings, invoices, settingsRes] = await Promise.all([
        window.xnoll.customersList(),
        window.xnoll.productsList(),
        window.xnoll.bookingsList(),
        window.xnoll.invoicesList(),
        window.xnoll.settingsGet()
      ]);

      setData({ customers, products, bookings, invoices });
      if (settingsRes?.success && settingsRes.settings) {
        setCurrency(settingsRes.settings.currency || 'INR');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredBookings = useMemo(() => {
    return data.bookings.filter(booking => {
      const bookingDate = booking.booking_date?.slice(0, 10);
      const matchesDate = (!filters.startDate || bookingDate >= filters.startDate) &&
                         (!filters.endDate || bookingDate <= filters.endDate);
      const matchesStatus = !filters.status || booking.status === filters.status;
      const matchesCustomer = !filters.customer ||
        booking.customer_name?.toLowerCase().includes(filters.customer.toLowerCase());
      const matchesProduct = !filters.product ||
        booking.product_name?.toLowerCase().includes(filters.product.toLowerCase());

      return matchesDate && matchesStatus && matchesCustomer && matchesProduct;
    });
  }, [data.bookings, filters]);

  const filteredInvoices = useMemo(() => {
    return data.invoices.filter(invoice => {
      const invoiceDate = invoice.invoice_date;
      const matchesDate = (!filters.startDate || invoiceDate >= filters.startDate) &&
                         (!filters.endDate || invoiceDate <= filters.endDate);
      const matchesStatus = !filters.status || invoice.status === filters.status;
      const matchesCustomer = !filters.customer ||
        invoice.customer_name?.toLowerCase().includes(filters.customer.toLowerCase());

      return matchesDate && matchesStatus && matchesCustomer;
    });
  }, [data.invoices, filters]);

  const summary = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const bookingsToday = data.bookings.filter(b => b.booking_date?.slice(0, 10) === todayStr).length;
    const bookingsUpcoming = data.bookings.filter(b => b.booking_date?.slice(0, 10) > todayStr).length;
    const invoicesUnpaid = data.invoices.filter(i => i.status !== 'paid').length;
    const totalRevenue = data.invoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);

    return {
      customers: data.customers.length,
      products: data.products.length,
      bookingsToday,
      bookingsUpcoming,
      invoicesUnpaid,
      totalRevenue
    };
  }, [data]);

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Reports & Analytics</h4>
        <Button variant="outline-primary" size="sm" onClick={loadData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
      </div>

      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}>
            Overview
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'bookings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bookings')}>
            Bookings Report
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'invoices' ? 'active' : ''}`}
                  onClick={() => setActiveTab('invoices')}>
            Invoices Report
          </button>
        </li>
      </ul>

      {/* Filters */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label small">Start Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small">End Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small">Status</label>
              <select
                className="form-select form-select-sm"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small">Search</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Customer/Product name..."
                value={filters.customer || filters.product}
                onChange={(e) => {
                  handleFilterChange('customer', e.target.value);
                  handleFilterChange('product', e.target.value);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
      <div className="row g-3">
        <div className="col-md-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body text-center">
                <div className="text-primary mb-2">
                  <i className="fas fa-users fa-2x"></i>
                </div>
              <h3 className="mb-1">{summary.customers}</h3>
                <p className="text-muted small mb-0">Total Customers</p>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body text-center">
                <div className="text-success mb-2">
                  <i className="fas fa-box fa-2x"></i>
                </div>
                <h3 className="mb-1">{summary.products}</h3>
                <p className="text-muted small mb-0">Products/Services</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body text-center">
                <div className="text-info mb-2">
                  <i className="fas fa-calendar-day fa-2x"></i>
                </div>
                <h3 className="mb-1">{summary.bookingsToday}</h3>
                <p className="text-muted small mb-0">Today's Bookings</p>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body text-center">
                <div className="text-warning mb-2">
                  <i className="fas fa-calendar-alt fa-2x"></i>
                </div>
                <h3 className="mb-1">{summary.bookingsUpcoming}</h3>
                <p className="text-muted small mb-0">Upcoming Bookings</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body text-center">
                <div className="text-danger mb-2">
                  <i className="fas fa-file-invoice-dollar fa-2x"></i>
                </div>
                <h3 className="mb-1">{summary.invoicesUnpaid}</h3>
                <p className="text-muted small mb-0">Unpaid Invoices</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body text-center">
                <div className="text-success mb-2">
                  <i className="fas fa-rupee-sign fa-2x"></i>
                </div>
                <h3 className="mb-1">{formatCurrency(summary.totalRevenue, currency)}</h3>
                <p className="text-muted small mb-0">Total Revenue</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bookings Report Tab */}
      {activeTab === 'bookings' && (
          <div className="card shadow-sm border-0">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Bookings Report ({filteredBookings.length} records)</h6>
            <Button
              variant="outline-success"
              size="sm"
              onClick={() => exportToCSV(filteredBookings, `bookings-report-${filters.startDate}-to-${filters.endDate}.csv`)}
              disabled={filteredBookings.length === 0}
            >
              <i className="fas fa-download me-1"></i> Export CSV
            </Button>
          </div>
            <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm table-striped">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map(booking => (
                    <tr key={booking.id}>
                      <td>{new Date(booking.booking_date).toLocaleDateString()}</td>
                      <td>{new Date(booking.booking_date).toLocaleTimeString()}</td>
                      <td>{booking.customer_name}</td>
                      <td>{booking.product_name || booking.service_name}</td>
                      <td>
                        <span className={`badge ${booking.status === 'confirmed' ? 'bg-success' :
                                                    booking.status === 'completed' ? 'bg-primary' :
                                                    booking.status === 'cancelled' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-4">
                        No bookings found for the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Report Tab */}
      {activeTab === 'invoices' && (
          <div className="card shadow-sm border-0">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Invoices Report ({filteredInvoices.length} records)</h6>
            <Button
              variant="outline-success"
              size="sm"
              onClick={() => exportToCSV(filteredInvoices, `invoices-report-${filters.startDate}-to-${filters.endDate}.csv`)}
              disabled={filteredInvoices.length === 0}
            >
              <i className="fas fa-download me-1"></i> Export CSV
            </Button>
          </div>
            <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm table-striped">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                      <td>{invoice.id}</td>
                      <td>{invoice.customer_name}</td>
                      <td>{formatCurrency(invoice.total, currency)}</td>
                      <td>
                        <span className={`badge ${invoice.status === 'paid' ? 'bg-success' : 'bg-danger'}`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center text-muted py-4">
                        No invoices found for the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
