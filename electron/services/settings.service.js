const db = require("../database/db");

class SettingsService {
  getSettings() {
    return Promise.resolve(db.getSettings() || {});
  }

  updateSettings(settings) {
    const current = db.getSettings() || {};
    const next = { ...current, ...(settings || {}) };
    const result = db.updateSettings({
      company_name: next.company_name || "",
      currency: next.currency || "INR",
      auto_generate_sku: next.auto_generate_sku ? 1 : 0,
      sku_prefix: next.sku_prefix || "SKU",
      language: next.language || "en",
      enable_tax: next.enable_tax ? 1 : 0,
      default_tax_name: next.default_tax_name || "Tax",
      default_tax_rate: Number(next.default_tax_rate || 0),
      default_tax_mode: next.default_tax_mode || "exclusive",
      tax_scheme: next.tax_scheme || "simple",
      default_gst_tax_type: next.default_gst_tax_type || "intra",
      cgst_label: next.cgst_label || "CGST",
      sgst_label: next.sgst_label || "SGST",
      igst_label: next.igst_label || "IGST",
      enable_lot_tracking: next.enable_lot_tracking ? 1 : 0,
      enable_batch_tracking: next.enable_batch_tracking ? 1 : 0,
      enable_expiry_tracking: next.enable_expiry_tracking ? 1 : 0,
      enable_manufacture_date: next.enable_manufacture_date ? 1 : 0,
      invoice_prefix: next.invoice_prefix || "INV",
      invoice_terms: next.invoice_terms || "",
      invoice_footer: next.invoice_footer || "Thank you for your business!",
      invoice_show_company_address: next.invoice_show_company_address ? 1 : 0,
      invoice_show_company_phone: next.invoice_show_company_phone ? 1 : 0,
      invoice_show_company_email: next.invoice_show_company_email ? 1 : 0,
      invoice_show_company_tax_id: next.invoice_show_company_tax_id ? 1 : 0,
      invoice_show_due_date: next.invoice_show_due_date ? 1 : 0,
      invoice_show_notes: next.invoice_show_notes ? 1 : 0,
      invoice_decimal_places: Number(next.invoice_decimal_places || 2),
    });
    return Promise.resolve({ success: true, changes: result?.changes || 0 });
  }

  getSetting(key) {
    const settings = db.getSettings() || {};
    return Promise.resolve(settings[key] ?? null);
  }

  updateSetting(key, value) {
    const current = db.getSettings() || {};
    const next = { ...current, [key]: value };
    return this.updateSettings(next);
  }
}

module.exports = new SettingsService();
