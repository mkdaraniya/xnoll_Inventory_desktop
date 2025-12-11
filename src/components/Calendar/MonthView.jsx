import React from 'react';
import dayjs from 'dayjs';
import Button from '../common/Button';

const MonthView = ({ bookings = [], current, onCreateBooking }) => {
  const monthStart = current.startOf('month');
  const monthEnd = current.endOf('month');
  const calendarStart = monthStart.startOf('week');
  const calendarEnd = monthEnd.endOf('week');

  const days = [];
  let day = calendarStart;

  while (day.isBefore(calendarEnd) || day.isSame(calendarEnd, 'day')) {
    days.push(day);
    day = day.add(1, 'day');
  }

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
    <div className="calendar-month-view">
      <div className="calendar-month-header">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-month-day-name">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-month-body">
        {days.map(day => {
          const dayBookings = getBookingsForDay(day);
          const isCurrentMonth = day.isSame(current, 'month');
          const isToday = day.isSame(dayjs(), 'day');

          return (
            <div
              key={day.format('YYYY-MM-DD')}
              className={`calendar-month-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => onCreateBooking({ date: day.toISOString() })}
            >
              <div className="calendar-month-day-number">
                {day.format('D')}
              </div>

              <div className="calendar-month-day-bookings">
                {dayBookings.slice(0, 2).map(booking => (
                  <div key={booking.id} className={`calendar-month-booking-dot ${booking.status}`}>
                    <div className="calendar-month-booking-title">
                      {booking.service_name || booking.product_name}
                    </div>
                    <div className="calendar-month-booking-time">
                      {dayjs(booking.booking_date).format('HH:mm')}
                    </div>
                  </div>
                ))}

                {dayBookings.length > 2 && (
                  <div className="calendar-month-more-bookings">
                    +{dayBookings.length - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {bookings.length === 0 && (
        <div className="text-center text-muted mt-4">
          <p>No bookings for this month</p>
        </div>
      )}
    </div>
  );
};

export default MonthView;
