const { ipcMain } = require("electron");
const db = require("../database/db");

ipcMain.handle("suppliers:list", async () => db.getSuppliers());
ipcMain.handle("suppliers:query", async (_event, payload) => {
  try {
    return { success: true, ...db.querySuppliers(payload || {}) };
  } catch (error) {
    return { success: false, error: error.message, rows: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
  }
});

ipcMain.handle("suppliers:create", async (_event, payload) => {
  try {
    return db.insertSupplier(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("suppliers:update", async (_event, payload) => {
  try {
    return db.updateSupplier(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("suppliers:delete", async (_event, id) => db.deleteSupplier(id));

ipcMain.handle("purchaseOrders:list", async () => db.getPurchaseOrdersWithItems());
ipcMain.handle("purchaseOrders:query", async (_event, payload) => {
  try {
    return { success: true, ...db.queryPurchaseOrders(payload || {}) };
  } catch (error) {
    return { success: false, error: error.message, rows: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
  }
});
ipcMain.handle("purchaseOrders:getById", async (_event, id) => db.getPurchaseOrderById(id));

ipcMain.handle("purchaseOrders:create", async (_event, payload) => {
  try {
    return db.createPurchaseOrderWithItems(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("purchaseOrders:update", async (_event, payload) => {
  try {
    return db.updatePurchaseOrderWithItems(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("purchaseOrders:delete", async (_event, id) =>
  db.deletePurchaseOrder(id)
);

ipcMain.handle("stockMovements:list", async () => db.getStockMovements());
ipcMain.handle("stock:summary", async () => db.getStockSummary());

ipcMain.handle("stockMovements:create", async (_event, payload) => {
  try {
    return db.createStockMovement(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("warehouses:list", async () => db.listWarehouses());
ipcMain.handle("warehouses:query", async (_event, payload) => {
  try {
    return { success: true, ...db.queryWarehouses(payload || {}) };
  } catch (error) {
    return { success: false, error: error.message, rows: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
  }
});

ipcMain.handle("warehouses:create", async (_event, payload) => {
  try {
    return db.createWarehouse(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("warehouses:update", async (_event, payload) => {
  try {
    return db.updateWarehouse(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("warehouses:delete", async (_event, id) => {
  try {
    return db.deleteWarehouse(id);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("inventory:transaction:create", async (_event, payload) => {
  try {
    return db.createInventoryTransaction(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("inventory:transfer:create", async (_event, payload) => {
  try {
    return db.transferInventory(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("inventory:reorder:upsert", async (_event, payload) => {
  try {
    return db.upsertReorderLevel(payload);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("inventory:stock:summary", async () =>
  db.getWarehouseStockSummary()
);

ipcMain.handle("inventory:lots:list", async (_event, filters) =>
  db.getLots(filters || {})
);

ipcMain.handle("inventory:alerts:reorder", async () =>
  db.getReorderAlerts()
);

ipcMain.handle("inventory:ledger:list", async (_event, filters) =>
  db.getStockTransactions(filters || {})
);
ipcMain.handle("inventory:ledger:query", async (_event, filters) => {
  try {
    return { success: true, ...db.queryStockTransactions(filters || {}) };
  } catch (error) {
    return { success: false, error: error.message, rows: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };
  }
});

ipcMain.handle("inventory:report:valuation", async () =>
  db.getInventoryValuationReport()
);

ipcMain.handle("inventory:report:expiry", async () => db.getExpiryReport());
