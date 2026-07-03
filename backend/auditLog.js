const crypto = require("crypto");

function hashForAudit(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function logRegistrationEvent(eventType, { email, ip } = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event: eventType, // "REGISTRATION_SUCCESS" | "DUPLICATE_ATTEMPT" | "VALIDATION_FAILURE"
    emailHash: hashForAudit(email),
    ipHash: hashForAudit(ip),
  };
  console.log("[AUDIT]", JSON.stringify(entry));
}

module.exports = { logRegistrationEvent };