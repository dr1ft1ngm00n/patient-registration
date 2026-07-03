const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

if (KEY.length !== 32) {
  throw new Error(
    "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Check your .env file."
  );
}

function encrypt(plaintext) {
  // A random IV (initialization vector) per encryption — this is required:
  // reusing an IV with the same key breaks GCM's security guarantees entirely.
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Store IV + authTag + ciphertext together, since you need all three to
  // decrypt later. Joined with ":" and hex-encoded so it's a single safe
  // string to store in a normal text column.
  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

function decrypt(stored) {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

module.exports = { encrypt, decrypt };