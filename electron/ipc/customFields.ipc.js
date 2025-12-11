const { ipcMain } = require('electron');
const db = require('../database/db');

ipcMain.handle('customFields:list', async (_event, module) => {
  try {
    return db.getAllCustomFields(module);
  } catch (err) {
    console.error('customFields:list error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('customFields:create', async (_event, payload) => {
  try {
    // Map frontend field names to database field names
    const dbPayload = {
      field_name: payload.name,
      field_label: payload.label,
      module: payload.module,
      field_type: payload.type,
      is_required: payload.required,
      display_in_grid: payload.display_in_grid,
      display_in_filter: payload.display_in_filter,
      is_sortable: payload.sortable,
      is_searchable: payload.searchable,
      options: payload.options,
      default_value: payload.default_value
    };
    return db.insertCustomField(dbPayload);
  } catch (err) {
    console.error('customFields:create error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('customFields:update', async (_event, payload) => {
  try {
    // Map frontend field names to database field names
    const dbPayload = {
      id: payload.id,
      field_name: payload.name,
      field_label: payload.label,
      module: payload.module,
      field_type: payload.type,
      is_required: payload.required,
      display_in_grid: payload.display_in_grid,
      display_in_filter: payload.display_in_filter,
      is_sortable: payload.sortable,
      is_searchable: payload.searchable,
      options: payload.options,
      default_value: payload.default_value
    };
    return db.updateCustomField(dbPayload);
  } catch (err) {
    console.error('customFields:update error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('customFields:delete', async (_event, id) => {
  try {
    return db.deleteCustomField(id);
  } catch (err) {
    console.error('customFields:delete error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('customFieldValues:get', async (_event, { fieldId, recordId }) => {
  try {
    return db.getCustomFieldValues(fieldId, recordId);
  } catch (err) {
    console.error('customFieldValues:get error', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('customFieldValues:save', async (_event, payload) => {
  try {
    // Map field_id to custom_field_id for database
    const dbPayload = {
      custom_field_id: payload.field_id,
      record_id: payload.record_id,
      value: payload.value
    };
    return db.saveCustomFieldValue(dbPayload);
  } catch (err) {
    console.error('customFieldValues:save error', err);
    return { success: false, error: err.message };
  }
});

