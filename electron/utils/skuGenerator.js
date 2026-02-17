// electron/utils/skuGenerator.js
function sanitizeToken(value, fallback = "SKU", min = 2, max = 6) {
  const token = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!token) return fallback;
  return token.slice(0, max).padEnd(min, "X").slice(0, Math.max(min, max));
}

function buildNameToken(name = "") {
  const words = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "ITM";
  if (words.length >= 2) {
    const token = `${words[0].slice(0, 2)}${words[1].slice(0, 1)}`;
    return token.padEnd(3, "X").slice(0, 4);
  }
  return words[0].slice(0, 4).padEnd(3, "X");
}

function buildSkuBase(prefix = "SKU", name = "") {
  const prefixToken = sanitizeToken(prefix, "SKU", 2, 6);
  const nameToken = buildNameToken(name);
  return `${prefixToken}-${nameToken}`;
}

function generateSKU(input = "SKU") {
  const payload = typeof input === "string" ? { prefix: input } : input || {};
  const base = buildSkuBase(payload.prefix || "SKU", payload.name || "");
  const sequence = Math.max(1, Number(payload.sequence || 1));
  const sequenceToken = String(sequence).padStart(3, "0");
  return `${base}-${sequenceToken}`;
}

function validateSKU(sku) {
  const modernPattern = /^[A-Z0-9]{2,6}-[A-Z0-9]{3,4}-[0-9]{3,5}$/;
  const legacyPattern = /^[A-Z0-9]{3,}-[A-Z0-9]{6,}$/;
  return modernPattern.test(String(sku || "")) || legacyPattern.test(String(sku || ""));
}

module.exports = { generateSKU, validateSKU, buildSkuBase };
