// electron/ipc/reminders.ipc.js
const { ipcMain } = require('electron');
const db = require('../database/db');
const { BrowserWindow } = require('electron');

ipcMain.handle('reminders:list', async (_event, bookingId) => {
  try {
    const reminders = db.getAllReminders();
    return { success: true, reminders: bookingId ? reminders.filter(r => r.booking_id === bookingId) : reminders };
  } catch (error) {
    console.error('Reminders list error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reminders:create', async (_event, payload) => {
  try {
    return db.insertReminder(payload);
  } catch (error) {
    console.error('Reminders create error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reminders:update', async (_event, payload) => {
  try {
    return db.updateReminder(payload);
  } catch (error) {
    console.error('Reminders update error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reminders:delete', async (_event, id) => {
  try {
    return db.deleteReminder(id);
  } catch (error) {
    console.error('Reminders delete error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reminders:check', async () => {
  try {
    const now = new Date().toISOString();
    const dueReminders = db.getDueReminders(now);

    for (const reminder of dueReminders) {
      const booking = db.getBookingById(reminder.booking_id);
      if (booking) {
        // Send notification to renderer
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send('notification', {
            type: 'reminder',
            title: 'Upcoming Booking Reminder',
            body: `Booking for ${booking.service_name} with ${booking.customer_name} at ${new Date(booking.booking_date).toLocaleTimeString()}`,
            bookingId: booking.id,
          });
        }
        // Mark reminder as notified
        db.updateReminder({ ...reminder, status: 'notified' });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Reminders check error:', error);
    return { success: false, error: error.message };
  }
});
