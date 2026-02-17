export const parseCustomFieldOptions = (optionsString = "") => {
  if (Array.isArray(optionsString)) {
    return optionsString
      .map((opt) => String(opt ?? "").trim())
      .filter(Boolean);
  }

  if (optionsString && typeof optionsString === "object") {
    return Object.values(optionsString)
      .map((opt) => String(opt ?? "").trim())
      .filter(Boolean);
  }

  const text = String(optionsString || "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .map((opt) => {
          if (opt && typeof opt === "object") {
            return String(opt.label ?? opt.value ?? "").trim();
          }
          return String(opt ?? "").trim();
        })
        .filter(Boolean);
    }
  } catch (_err) {
    // Not a JSON payload. Fall through to token parsing.
  }

  return text
    .split(/[\n,;|]/)
    .map((opt) => opt.trim())
    .filter(Boolean);
};

export const deserializeCustomFieldValue = (field, rawValue) => {
  if (!field || rawValue === undefined || rawValue === null) return rawValue;
  if (field.type !== "multiselect") return rawValue;

  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => String(item).trim()).filter(Boolean);
  }

  const text = String(rawValue).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (_err) {
    // Fallback to comma/newline format for legacy values.
  }

  return parseCustomFieldOptions(text);
};

export const serializeCustomFieldValue = (field, value) => {
  if (value === undefined || value === null) return "";

  if (field?.type === "multiselect") {
    const values = Array.isArray(value)
      ? value
      : parseCustomFieldOptions(String(value));
    return values.length ? JSON.stringify(values) : "";
  }

  return String(value);
};

export const formatCustomFieldDisplayValue = (field, rawValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === "") return "-";

  if (field?.type === "multiselect") {
    const values = deserializeCustomFieldValue(field, rawValue);
    return Array.isArray(values) && values.length ? values.join(", ") : "-";
  }

  return String(rawValue);
};
