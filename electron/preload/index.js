const { contextBridge, ipcRenderer } = require("electron");

const env = process.env.NODE_ENV || "production";

contextBridge.exposeInMainWorld("xnoll", {
  // App info
  getAppInfo: () => ({
    name: "Xnoll Booking Desktop",
    env,
  }),

  // Navigation
  onNavigate: (callback) => {
    const handler = (_event, page) => callback(page);
    ipcRenderer.on("navigate", handler);
    // Return a cleanup function
    return () => ipcRenderer.removeListener("navigate", handler);
  },

  // Database - Generic
  dbSelect: (table) => ipcRenderer.invoke("db:select", table),

  // Customers API
  customersList: () => ipcRenderer.invoke("customers:list"),
  customersCreate: (payload) => ipcRenderer.invoke("customers:create", payload),
  customersUpdate: (payload) => ipcRenderer.invoke("customers:update", payload),
  customersDelete: (id) => ipcRenderer.invoke("customers:delete", id),

  // Products API
  productsList: () => ipcRenderer.invoke("products:list"),
  productsCreate: (payload) => ipcRenderer.invoke("products:create", payload),
  productsUpdate: (payload) => ipcRenderer.invoke("products:update", payload),
  productsDelete: (id) => ipcRenderer.invoke("products:delete", id),

  // Bookings API
  bookingsList: (payload) => ipcRenderer.invoke("bookings:list", payload),
  bookingsCreate: (payload) => ipcRenderer.invoke("bookings:create", payload),
  bookingsUpdate: (payload) => ipcRenderer.invoke("bookings:update", payload),
  bookingsDelete: (id) => ipcRenderer.invoke("bookings:delete", id),
  getBookingsById: (id) => ipcRenderer.invoke("bookings:getById", id),

  // Invoices API
  invoicesList: () => ipcRenderer.invoke("invoices:list"),
  invoicesCreate: (payload) => ipcRenderer.invoke("invoices:create", payload),
  invoicesDelete: (id) => ipcRenderer.invoke("invoices:delete", id),
  invoicesGetById: (id) => ipcRenderer.invoke("invoices:getById", id),

  // Settings API
  settingsGet: () => ipcRenderer.invoke("settings:get"),
  settingsSave: (payload) => ipcRenderer.invoke("settings:save", payload),

  // Custom Fields API
  customFieldsList: (module) => ipcRenderer.invoke("customFields:list", module),
  customFieldsCreate: (payload) =>
    ipcRenderer.invoke("customFields:create", payload),
  customFieldsUpdate: (payload) =>
    ipcRenderer.invoke("customFields:update", payload),
  customFieldsDelete: (id) => ipcRenderer.invoke("customFields:delete", id),
  customFieldValuesGet: (fieldId, recordId) =>
    ipcRenderer.invoke("customFieldValues:get", { fieldId, recordId }),
  customFieldValuesSave: (payload) =>
    ipcRenderer.invoke("customFieldValues:save", payload),

  // Notes API
  notesList: () => ipcRenderer.invoke("notes:list"),
  notesCreate: (payload) => ipcRenderer.invoke("notes:create", payload),
  notesUpdate: (payload) => ipcRenderer.invoke("notes:update", payload),
  notesDelete: (id) => ipcRenderer.invoke("notes:delete", id),

  // Search API
  searchGlobal: (query) => ipcRenderer.invoke("search:global", query),
  searchModule: (module, query) =>
    ipcRenderer.invoke("search:module", { module, query }),

  // Reports API
  reportsGenerate: (type, params) =>
    ipcRenderer.invoke("reports:generate", { type, params }),
  reportsExport: (type, format, params) =>
    ipcRenderer.invoke("reports:export", { type, format, params }),

  // Error Reporting API
  errorReport: (errorData) => ipcRenderer.invoke("error:report", errorData),

  // SKU Generation API
  skuGenerate: (prefix) => ipcRenderer.invoke("sku:generate", prefix),
  skuValidate: (sku) => ipcRenderer.invoke("sku:validate", sku),

  // Company Profile API
  companyGet: () => ipcRenderer.invoke("company:get"),
  companySave: (payload) => ipcRenderer.invoke("company:save", payload),

  // Calendar API
  calendarGetBookings: (startDate, endDate) =>
    ipcRenderer.invoke("calendar:getBookings", { startDate, endDate }),

  // Notifications (from main process)
  onNotification: (callback) => {
    ipcRenderer.on("notification", (_event, data) => callback(data));
  },

  // System API
  systemInfo: () => ipcRenderer.invoke("system:info"),

  // File operations
  selectFile: (options) => ipcRenderer.invoke("file:select", options),
  selectDirectory: () => ipcRenderer.invoke("file:selectDirectory"),

  // Seeder logs & progress
  onSeederLog: (callback) => {
    const handler = (_event, log) => callback(log);
    ipcRenderer.on("seeder:log", handler);
    return () => ipcRenderer.removeListener("seeder:log", handler);
  },
  onSeederFinished: (callback) => {
    const handler = (_event, code) => callback(code);
    ipcRenderer.on("seeder:finished", handler);
    return () => ipcRenderer.removeListener("seeder:finished", handler);
  },

  // Print
  print: (htmlContent) => ipcRenderer.invoke("print:html", htmlContent),
});

// electron/preload/index.js (in the "api" exposure)
contextBridge.exposeInMainWorld("api", {
  runSeeder: () => ipcRenderer.invoke("dev:run-seeder"), // Now works with handle
});
