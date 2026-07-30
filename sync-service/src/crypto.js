import crypto from "node:crypto";

const b64u = b => Buffer.from(b).toString("base64url");
const unb64u = s => Buffer.from(s, "base64url");

export function randomToken(bytes = 32) { return b64u(crypto.randomBytes(bytes)); }
export function hash(value) { return crypto.createHash("sha256").update(String(value)).digest("hex"); }

export function safeEqual(a, b) {
  const aa = Buffer.from(hash(a));
  const bb = Buffer.from(hash(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export function deriveEncryptionKey(raw = "") {
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is required");
  const parsed = Buffer.from(raw, "base64");
  if (parsed.length === 32 && parsed.toString("base64").replace(/=+$/, "") === raw.replace(/=+$/, "")) return parsed;
  if (raw.length >= 32) return crypto.createHash("sha256").update(raw, "utf8").digest();
  throw new Error("TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key or a high-entropy secret of at least 32 characters");
}
function key() { return deriveEncryptionKey(process.env.TOKEN_ENCRYPTION_KEY || ""); }

export function encrypt(value) {
  if (value == null || value === "") return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return ["v1", b64u(iv), b64u(cipher.getAuthTag()), b64u(data)].join(".");
}

export function decrypt(payload) {
  if (!payload) return null;
  const [version, iv, tag, data] = String(payload).split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unsupported encrypted token format");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), unb64u(iv));
  decipher.setAuthTag(unb64u(tag));
  return Buffer.concat([decipher.update(unb64u(data)), decipher.final()]).toString("utf8");
}
