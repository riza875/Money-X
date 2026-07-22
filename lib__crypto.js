import crypto from "crypto";

// WALLET_ENCRYPTION_KEY must be a 64-char hex string (32 bytes) kept ONLY
// in server environment variables. Never expose it to the client, never log it.
function getKey() {
  const hex = process.env.WALLET_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY missing or invalid — must be a 64-character hex string (32 bytes)."
    );
  }
  return Buffer.from(hex, "hex");
}

// Encrypts a private key string. Returns a single string: iv:authTag:ciphertext (all hex).
export function encryptPrivateKey(plainText) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // GCM recommended IV size
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

// Reverses encryptPrivateKey. Throws if the payload was tampered with (auth tag check).
export function decryptPrivateKey(payload) {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Malformed encrypted payload.");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
