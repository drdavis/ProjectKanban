import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey() {
  const value = process.env.AI_CREDENTIAL_ENCRYPTION_KEY ?? "";
  if (!/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error("AI credential encryption requires a 32-byte hex key.");
  }
  return Buffer.from(value, "hex");
}

export function personalConnectionsAvailable() {
  return /^[a-fA-F0-9]{64}$/.test(process.env.AI_CREDENTIAL_ENCRYPTION_KEY ?? "");
}

export function encryptApiKey(apiKey: string, purpose: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  cipher.setAAD(Buffer.from(purpose));
  const encrypted = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return [nonce, cipher.getAuthTag(), encrypted].map((value) => value.toString("base64url")).join(".");
}

export function decryptApiKey(encrypted: string, purpose: string) {
  const [nonce, tag, content, ...extra] = encrypted.split(".");
  if (!nonce || !tag || !content || extra.length) throw new Error("Invalid encrypted credential.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(nonce, "base64url"));
  decipher.setAAD(Buffer.from(purpose));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(content, "base64url")), decipher.final()]).toString("utf8");
}
