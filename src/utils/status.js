const toKey = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, "_");

export const formatStatusLabel = (status) =>
  toKey(status)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const getStatusBadgeClass = (status, domain = "generic") => {
  const key = toKey(status);
  const domainKey = toKey(domain);

  const domainToneMap = {
    invoice: {
      unpaid: "warning",
      partially_paid: "info",
      paid: "success",
      cancelled: "danger",
    },
    purchase: {
      draft: "neutral",
      ordered: "info",
      partial: "warning",
      received: "success",
      cancelled: "danger",
    },
    supplier: {
      active: "success",
      inactive: "neutral",
    },
    warehouse: {
      active: "success",
      inactive: "neutral",
      primary: "info",
    },
    stock_txn: {
      in: "success",
      out: "danger",
      adjustment: "warning",
      transfer: "info",
    },
    note: {
      pinned: "warning",
    },
  };

  const genericToneMap = {
    active: "success",
    inactive: "neutral",
    enabled: "success",
    disabled: "neutral",
    open: "info",
    closed: "neutral",
    error: "danger",
    failed: "danger",
    pending: "warning",
    done: "success",
    cancelled: "danger",
  };

  const tone =
    domainToneMap[domainKey]?.[key] ||
    genericToneMap[key] ||
    "neutral";

  return `status-badge status-${tone}`;
};
