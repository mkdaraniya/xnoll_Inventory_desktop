// src/pages/Calendar/index.jsx
import React from 'react';
import CalendarShell from '../../components/Calendar/CalendarShell';

const CalendarPage = () => {
  const handleCreateBooking = ({ date }) => {
    // Navigate to booking page with prefilled date
    if (window.xnoll && window.xnoll.onNavigate) {
      window.xnoll.onNavigate('booking');
      // Pass the date somehow - could use localStorage or URL params
      localStorage.setItem('prefillBookingDate', date);
    } else {
      // Fallback navigation
      window.dispatchEvent(new CustomEvent('navigate', {
        detail: { page: 'booking', date },
      }));
    }
  };

  return (
    <div className="page page-calendar">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body p-0">
                <CalendarShell
                  initialView="week"
                  onCreateBooking={handleCreateBooking}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
