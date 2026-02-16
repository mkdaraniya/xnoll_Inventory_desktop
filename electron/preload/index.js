const { contextBridge, ipcRenderer } = require("electron");

const env = process.env.NODE_ENV || "production";

contextBridge.exposeInMainWorld("xnoll", {
  // App info
  getAppInfo: () => ({
    name: "Xnoll Inventory Desktop",
    env,
  }),

  // Navigation
  onNavigate: (callback) => {
    const handler = (_event, page) => callback(page);
    ipcRenderer.on("navigate", handler);
    // Return a cleanup function
    return () => ipcRenderer.removeListener("navigate", handler);
  },
  onReportsType: (callback) => {
    const handler = (_event, type) => callback(type);
    ipcRenderer.on("reports:type", handler);
    return () => ipcRenderer.removeListener("reports:type", handler);
  },

  // Database - Generic
  dbSelect: (table) => ipcRenderer.invoke("db:select", table),

  // Customers API
  customersList: () => ipcRenderer.invoke("customers:list"),
  customersQuery: (payload) => ipcRenderer.invoke("customers:query", payload),
  customersCreate: (payload) => ipcRenderer.invoke("customers:create", payload),
  customersUpdate: (payload) => ipcRenderer.invoke("customers:update", payload),
  customersDelete: (id) => ipcRenderer.invoke("customers:delete", id),

  // Products API
  productsList: () => ipcRenderer.invoke("products:list"),
  productsQuery: (payload) => ipcRenderer.invoke("products:query", payload),
  productsCreate: (payload) => ipcRenderer.invoke("products:create", payload),
  productsUpdate: (payload) => ipcRenderer.invoke("products:update", payload),
  productsDelete: (id) => ipcRenderer.invoke("products:delete", id),

  // Invoices API
  invoicesList: () => ipcRenderer.invoke("invoices:list"),
  invoicesQuery: (payload) => ipcRenderer.invoke("invoices:query", payload),
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
  notesQuery: (payload) => ipcRenderer.invoke("notes:query", payload),
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

  // Suppliers API
  suppliersList: () => ipcRenderer.invoke("suppliers:list"),
  suppliersQuery: (payload) => ipcRenderer.invoke("suppliers:query", payload),
  suppliersCreate: (payload) => ipcRenderer.invoke("suppliers:create", payload),
  suppliersUpdate: (payload) => ipcRenderer.invoke("suppliers:update", payload),
  suppliersDelete: (id) => ipcRenderer.invoke("suppliers:delete", id),

  // Purchase Orders API
  purchaseOrdersList: () => ipcRenderer.invoke("purchaseOrders:list"),
  purchaseOrdersQuery: (payload) => ipcRenderer.invoke("purchaseOrders:query", payload),
  purchaseOrdersGetById: (id) => ipcRenderer.invoke("purchaseOrders:getById", id),
  purchaseOrdersCreate: (payload) => ipcRenderer.invoke("purchaseOrders:create", payload),
  purchaseOrdersUpdate: (payload) => ipcRenderer.invoke("purchaseOrders:update", payload),
  purchaseOrdersDelete: (id) => ipcRenderer.invoke("purchaseOrders:delete", id),

  // Stock API
  stockMovementsList: () => ipcRenderer.invoke("stockMovements:list"),
  stockMovementsCreate: (payload) => ipcRenderer.invoke("stockMovements:create", payload),
  stockSummary: () => ipcRenderer.invoke("stock:summary"),

  // Warehouses API
  warehousesList: () => ipcRenderer.invoke("warehouses:list"),
  warehousesQuery: (payload) => ipcRenderer.invoke("warehouses:query", payload),
  warehousesCreate: (payload) => ipcRenderer.invoke("warehouses:create", payload),
  warehousesUpdate: (payload) => ipcRenderer.invoke("warehouses:update", payload),
  warehousesDelete: (id) => ipcRenderer.invoke("warehouses:delete", id),

  // Inventory API
  inventoryTransactionCreate: (payload) =>
    ipcRenderer.invoke("inventory:transaction:create", payload),
  inventoryTransferCreate: (payload) =>
    ipcRenderer.invoke("inventory:transfer:create", payload),
  inventoryReorderUpsert: (payload) =>
    ipcRenderer.invoke("inventory:reorder:upsert", payload),
  inventoryStockSummary: () => ipcRenderer.invoke("inventory:stock:summary"),
  inventoryLotsList: (filters) =>
    ipcRenderer.invoke("inventory:lots:list", filters),
  inventoryReorderAlerts: () => ipcRenderer.invoke("inventory:alerts:reorder"),
  inventoryLedgerList: (filters) =>
    ipcRenderer.invoke("inventory:ledger:list", filters),
  inventoryLedgerQuery: (filters) =>
    ipcRenderer.invoke("inventory:ledger:query", filters),
  inventoryValuationReport: () =>
    ipcRenderer.invoke("inventory:report:valuation"),
  inventoryExpiryReport: () => ipcRenderer.invoke("inventory:report:expiry"),
});

// electron/preload/index.js (in the "api" exposure)
contextBridge.exposeInMainWorld("api", {
  runSeeder: () => ipcRenderer.invoke("dev:run-seeder"), // Now works with handle
});
