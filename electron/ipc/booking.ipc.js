const { ipcMain } = require("electron");
const db = require("../database/db");

// list
ipcMain.handle("bookings:list", async () => {
  return db.getBookingsWithCustomFields();
});

// create (header + items)
ipcMain.handle("bookings:create", async (_event, payload) => {
  return db.createBookingWithItems(payload);
});

// update (header + items)
ipcMain.handle("bookings:update", async (_event, payload) => {
  return db.updateBookingWithItems(payload);
});

// delete (header + items)
ipcMain.handle("bookings:delete", async (_event, id) => {
  return db.deleteBookingWithItems(id);
});

ipcMain.handle("bookings:getById", async (_event, id) => {
  return db.getBookingsById(id);
});
