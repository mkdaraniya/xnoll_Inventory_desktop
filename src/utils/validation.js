export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const required = (value) => String(value ?? "").trim().length > 0;
export const isPositiveNumber = (value) => Number(value) > 0;
export const isNonNegativeNumber = (value) => Number(value) >= 0;
export const isValidEmail = (value) => !value || EMAIL_REGEX.test(String(value).trim());
export const isValidPhone = (value) => !value || PHONE_REGEX.test(String(value).trim());
export const isValidGSTIN = (value) =>
  !value || GSTIN_REGEX.test(String(value).trim().toUpperCase());
export const isValidPAN = (value) =>
  !value || PAN_REGEX.test(String(value).trim().toUpperCase());

export function validateRequiredFields(fields, labels = {}) {
  for (const key of fields) {
    if (!required(fields[key])) {
      return `${labels[key] || key} is required.`;
    }
  }
  return null;
}
