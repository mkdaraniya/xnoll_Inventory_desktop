import React, { useEffect, useState } from "react";

const Dashboard = () => {
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState({
    customers: 0,
    products: 0,
    bookingsToday: 0,
    bookingsUpcoming: 0,
    invoicesUnpaid: 0,
    invoicesTodayTotal: 0,
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);

  const getBookingBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "pending":
        return "badge bg-warning text-dark";
      case "confirmed":
        return "badge bg-primary";
      case "completed":
        return "badge bg-success";
      case "cancelled":
        return "badge bg-danger";
      default:
        return "badge bg-secondary";
    }
  };

  const getInvoiceBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "paid":
        return "badge bg-success";
      case "unpaid":
        return "badge bg-danger";
      case "partial":
        return "badge bg-warning text-dark";
      default:
        return "badge bg-secondary";
    }
  };

  const loadData = async () => {
    if (!window.xnoll) return;
    setLoading(true);
    try {
      const [customers, products, bookings, invoices] = await Promise.all([
        window.xnoll.customersList(),
        window.xnoll.productsList(),
        window.xnoll.bookingsList(),
        window.xnoll.invoicesList(),
      ]);

      const todayStr = new Date().toISOString().slice(0, 10);

      const bookingsToday = bookings.filter(
        (b) => (b.booking_date || "").slice(0, 10) === todayStr
      ).length;

      const bookingsUpcoming = bookings.filter((b) => {
        const d = (b.booking_date || "").slice(0, 10);
        return d > todayStr;
      }).length;

      const invoicesUnpaid = invoices.filter(
        (i) => (i.status || "unpaid") !== "paid"
      ).length;

      const invoicesTodayTotal = invoices
        .filter((i) => (i.invoice_date || "").slice(0, 10) === todayStr)
        .reduce((sum, i) => sum + (Number(i.total) || 0), 0);

      // Sort bookings by date desc and take last 5
      const recentB = [...bookings]
        .sort((a, b) =>
          (b.booking_date || "").localeCompare(a.booking_date || "")
        )
        .slice(0, 5);

      // Sort invoices by date desc and take last 5
      const recentI = [...invoices]
        .sort((a, b) =>
          (b.invoice_date || "").localeCompare(a.invoice_date || "")
        )
        .slice(0, 5);

      setCards({
        customers: customers.length,
        products: products.length,
        bookingsToday,
        bookingsUpcoming,
        invoicesUnpaid,
        invoicesTodayTotal,
      });
      setRecentBookings(recentB);
      setRecentInvoices(recentI);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      <h4 className="mb-3">Dashboard</h4>

      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <p className="mb-0 text-muted small">
              Quick overview of your local data. All numbers are from SQLite and
              can sync to xnoll.com later.
            </p>
          </div>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Top summary cards */}
      <div className="row g-3 mb-3">
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted mb-1">Customers</h6>
              <h3 className="mb-1">{cards.customers}</h3>
              <small className="text-success">Total customers in system</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted mb-1">Products / Services</h6>
              <h3 className="mb-1">{cards.products}</h3>
              <small className="text-success">Active items in catalog</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted mb-1">Bookings Today</h6>
              <h3 className="mb-1">{cards.bookingsToday}</h3>
              <small className="text-primary">
                Appointments scheduled today
              </small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted mb-1">Upcoming Bookings</h6>
              <h3 className="mb-1">{cards.bookingsUpcoming}</h3>
              <small className="text-primary">Future appointments</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted mb-1">Unpaid Invoices</h6>
              <h3 className="mb-1">{cards.invoicesUnpaid}</h3>
              <small className="text-danger">Need payment follow-up</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h6 className="text-muted mb-1">Today&apos;s Billing</h6>
              <h3 className="mb-1">
                ₹
                {cards.invoicesTodayTotal.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </h3>
              <small className="text-muted">
                Total invoice amount for today
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity: bookings + invoices */}
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="card-title mb-0">Recent Bookings</h6>
                <small className="text-muted">Last 5 records</small>
              </div>
              <div className="table-responsive" style={{ maxHeight: "260px" }}>
                <table className="table table-sm table-striped align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "60px" }}>ID</th>
                      <th style={{ width: "90px" }}>Customer</th>
                      <th>Service</th>
                      <th style={{ width: "150px" }}>Date/Time</th>
                      <th style={{ width: "90px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((b) => (
                      <tr key={b.id}>
                        <td>{b.id}</td>
                        <td>{b.customer_id}</td>
                        <td>{b.service_name}</td>
                        <td>{b.booking_date}</td>
                        <td>
                          <span className={getBookingBadge(b.status)}>
                            {b.status || "pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!recentBookings.length && (
                      <tr>
                        <td colSpan="5" className="text-center text-muted">
                          No bookings yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="card-title mb-0">Recent Invoices</h6>
                <small className="text-muted">Last 5 records</small>
              </div>
              <div className="table-responsive" style={{ maxHeight: "260px" }}>
                <table className="table table-sm table-striped align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "60px" }}>ID</th>
                      <th style={{ width: "90px" }}>Customer</th>
                      <th style={{ width: "150px" }}>Date</th>
                      <th style={{ width: "100px" }}>Total</th>
                      <th style={{ width: "90px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.id}</td>
                        <td>{inv.customer_id}</td>
                        <td>{inv.invoice_date}</td>
                        <td>{inv.total}</td>
                        <td>
                          <span className={getInvoiceBadge(inv.status)}>
                            {(inv.status || "unpaid").replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!recentInvoices.length && (
                      <tr>
                        <td colSpan="5" className="text-center text-muted">
                          No invoices yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
