import React from 'react';
import dayjs from 'dayjs';
import Button from '../common/Button';

const DayView = ({ bookings = [], current, onCreateBooking }) => {
  const dayBookings = bookings.filter(booking =>
    dayjs(booking.booking_date).isSame(current, 'day')
  );

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="calendar-day-view">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">{current.format('dddd, MMMM D, YYYY')}</h5>
      </div>

      <div className="calendar-day-grid">
        {hours.map(hour => {
          const hourBookings = dayBookings.filter(booking =>
            dayjs(booking.booking_date).hour() === hour
          );

          return (
            <div key={hour} className="calendar-hour-slot">
              <div className="calendar-hour-label">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              <div className="calendar-hour-content">
                {hourBookings.map(booking => (
                  <div key={booking.id} className={`calendar-booking-card ${booking.status}`}>
                    <div className="calendar-booking-time">
                      {dayjs(booking.booking_date).format('HH:mm')}
                    </div>
                    <div className="calendar-booking-title">
                      {booking.service_name || booking.product_name}
                    </div>
                    <div className="calendar-booking-customer">
                      {booking.customer_name}
                    </div>
                    <div className="calendar-booking-status">
                      <span className={`badge ${getStatusClass(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
                {hourBookings.length === 0 && (
                  <div className="calendar-empty-slot">
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {dayBookings.length === 0 && (
        <div className="text-center text-muted mt-4">
          <p>No bookings for this day</p>
        </div>
      )}
    </div>
  );
};

const getStatusClass = (status) => {
  switch (status) {
    case 'confirmed': return 'bg-success';
    case 'completed': return 'bg-primary';
    case 'cancelled': return 'bg-danger';
    case 'pending':
    default: return 'bg-warning text-dark';
  }
};

export default DayView;
