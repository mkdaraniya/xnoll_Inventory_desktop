import React from 'react';
import dayjs from 'dayjs';
import Button from '../common/Button';

const WeekView = ({ bookings = [], current, onCreateBooking }) => {
  const weekStart = current.startOf('week');
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));

  const getBookingsForDay = (date) => {
    return bookings.filter(booking =>
      dayjs(booking.booking_date).isSame(date, 'day')
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

  return (
    <div className="calendar-week-view">
      <div className="calendar-week-header">
        {weekDays.map(day => (
          <div key={day.format('YYYY-MM-DD')} className="calendar-week-day-header">
            <div className="calendar-week-day-name">
              {day.format('ddd')}
            </div>
            <div className={`calendar-week-day-number ${day.isSame(dayjs(), 'day') ? 'today' : ''}`}>
              {day.format('D')}
            </div>
          </div>
        ))}
      </div>

      <div className="calendar-week-body">
        {weekDays.map(day => {
          const dayBookings = getBookingsForDay(day);

          return (
            <div key={day.format('YYYY-MM-DD')} className="calendar-week-day-column">
              {dayBookings.slice(0, 3).map(booking => (
                <div key={booking.id} className={`calendar-week-booking ${booking.status}`}>
                  <div className="calendar-week-booking-time">
                    {dayjs(booking.booking_date).format('HH:mm')}
                  </div>
                  <div className="calendar-week-booking-title">
                    {booking.service_name || booking.product_name}
                  </div>
                  <div className="calendar-week-booking-customer">
                    {booking.customer_name}
                  </div>
                  <div className="calendar-week-booking-status">
                    <span className={`badge badge-sm ${getStatusClass(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}

              {dayBookings.length > 3 && (
                <div className="calendar-week-more-bookings">
                  +{dayBookings.length - 3} more
                </div>
              )}

            </div>
          );
        })}
      </div>

      {bookings.length === 0 && (
        <div className="text-center text-muted mt-4">
          <p>No bookings for this week</p>
        </div>
      )}
    </div>
  );
};

export default WeekView;
