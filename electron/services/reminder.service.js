// electron/services/reminder.service.js
const { Notification } = require('electron');
const path = require('path');
const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
const dbPath = isDev
  ? path.join(__dirname, '../database/sqlite.db')
  : path.join(app.getPath('userData'), 'xnoll-offline.sqlite');

  const db = new Database(dbPath);


class ReminderService {
  /**
   * Check for upcoming reminders
   */
  async checkReminders() {
    try {
      // Get current settings
      const settings = await this.getSettings();
      if (!settings.enable_reminders) return [];

      const leadMinutes = settings.reminder_lead_minutes || 15;
      const now = new Date();
      const reminderTime = new Date(now.getTime() + leadMinutes * 60 * 1000);

      // Find bookings within the reminder window
      const bookings = await this.getUpcomingBookings(reminderTime);

      const reminders = [];
      for (const booking of bookings) {
        // Check if reminder already sent
        const alreadyReminded = await this.checkReminderSent(booking.id, leadMinutes);
        if (!alreadyReminded) {
          reminders.push({
            id: booking.id,
            title: `Appointment Reminder: ${booking.service_name || booking.product_name}`,
            body: `${booking.customer_name} at ${new Date(booking.booking_date).toLocaleString()}`,
            booking
          });

          // Mark as reminded
          await this.markReminderSent(booking.id, leadMinutes);
        }
      }

      return reminders;
    } catch (error) {
      console.error('Reminder check failed:', error);
      return [];
    }
  }

  /**
   * Show notification for reminder
   */
  showReminder(reminder) {
    try {
      const notification = new Notification({
        title: reminder.title,
        body: reminder.body,
        icon: path.join(__dirname, '../../assets/icons/notification.png'), // Add icon if available
        timeoutType: 'default'
      });

      notification.show();

      notification.on('click', () => {
        // Could focus the app window or navigate to booking
        console.log('Reminder clicked for booking:', reminder.id);
      });

      return true;
    } catch (error) {
      console.error('Failed to show reminder notification:', error);
      return false;
    }
  }

  /**
   * Get upcoming bookings within time window
   */
  getUpcomingBookings(reminderTime) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT b.*, c.name as customer_name, p.name as product_name
        FROM bookings b
        LEFT JOIN customers c ON b.customer_id = c.id
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.booking_date > datetime('now')
        AND b.booking_date <= datetime(?)
        AND b.status IN ('pending', 'confirmed')
        ORDER BY b.booking_date ASC
      `;

      db.all(sql, [reminderTime.toISOString()], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Check if reminder already sent
   */
  checkReminderSent(bookingId, leadMinutes) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id FROM reminders
        WHERE booking_id = ?
        AND lead_minutes = ?
        AND created_at > datetime('now', '-1 hour')
      `;

      db.get(sql, [bookingId, leadMinutes], (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      });
    });
  }

  /**
   * Mark reminder as sent
   */
  markReminderSent(bookingId, leadMinutes) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO reminders (booking_id, lead_minutes, created_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `;

      db.run(sql, [bookingId, leadMinutes], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });
  }

  /**
   * Get current settings
   */
  getSettings() {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
  }
}

module.exports = new ReminderService();
