// src/components/Calendar/CalendarShell.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import Button from '../common/Button';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';

const VIEWS = ['day', 'week', 'month'];

const CalendarShell = ({
  initialView = 'week',
  onCreateBooking,
}) => {
  const [view, setView] = useState(initialView);
  const [current, setCurrent] = useState(dayjs());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    if (view === 'day') {
      const start = current.startOf('day');
      const end = current.endOf('day');
      return { start, end };
    }
    if (view === 'week') {
      const start = current.startOf('week');
      const end = current.endOf('week');
      return { start, end };
    }
    const start = current.startOf('month');
    const end = current.endOf('month');
    return { start, end };
  }, [view, current]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const result = await window.xnoll.calendarGetBookings(
        range.start.toISOString(),
        range.end.toISOString()
      );
      if (result && result.success !== false) {
        setBookings(result || []);
      } else if (result && result.success === false) {
        console.error('Calendar load failed', result.error);
        setBookings([]);
      }
    } catch (e) {
      console.error('Calendar load error', e);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start.valueOf(), range.end.valueOf()]);

  const gotoToday = () => setCurrent(dayjs());
  const gotoPrev = () => {
    if (view === 'day') setCurrent(c => c.subtract(1, 'day'));
    else if (view === 'week') setCurrent(c => c.subtract(1, 'week'));
    else setCurrent(c => c.subtract(1, 'month'));
  };
  const gotoNext = () => {
    if (view === 'day') setCurrent(c => c.add(1, 'day'));
    else if (view === 'week') setCurrent(c => c.add(1, 'week'));
    else setCurrent(c => c.add(1, 'month'));
  };

  useKeyboardShortcut('Ctrl+1', () => setView('day'), [setView]);
  useKeyboardShortcut('Ctrl+2', () => setView('week'), [setView]);
  useKeyboardShortcut('Ctrl+3', () => setView('month'), [setView]);
  useKeyboardShortcut('Ctrl+N', () => {
    if (onCreateBooking) {
      onCreateBooking({ date: current.toISOString() });
    }
  }, [onCreateBooking, current]);

  const viewLabel = useMemo(() => {
    if (view === 'day') return current.format('DD MMM YYYY');
    if (view === 'week') {
      const s = range.start.format('DD MMM');
      const e = range.end.format('DD MMM YYYY');
      return `${s} - ${e}`;
    }
    return current.format('MMMM YYYY');
  }, [view, current, range]);

  const commonProps = { bookings, current, onCreateBooking };

  return (
    <div className="calendar">
      <div className="calendar-header d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={gotoPrev}>
            ‹
          </Button>
          <Button variant="secondary" onClick={gotoToday}>
            Today
          </Button>
          <Button variant="secondary" onClick={gotoNext}>
            ›
          </Button>
          <div className="calendar-title ms-3 fw-bold">
            {viewLabel}
          </div>
        </div>
        <div className="d-flex gap-2">
          {VIEWS.map(v => (
            <Button
              key={v}
              variant={v === view ? 'primary' : 'outline'}
              onClick={() => setView(v)}
            >
              {v.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center text-muted mb-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!loading && view === 'day' && <DayView {...commonProps} />}
      {!loading && view === 'week' && <WeekView {...commonProps} />}
      {!loading && view === 'month' && <MonthView {...commonProps} />}
    </div>
  );
};

CalendarShell.propTypes = {
  initialView: PropTypes.oneOf(VIEWS),
  onCreateBooking: PropTypes.func,
  renderDayView: PropTypes.func,
  renderWeekView: PropTypes.func,
  renderMonthView: PropTypes.func,
};

export default CalendarShell;
