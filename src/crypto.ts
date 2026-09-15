import CryptoJS from "crypto-js";

export interface EncryptedPayload {
  iv: string;
  data: string;
}

export interface PermissionCrypto {
  encrypt<T>(value: T): EncryptedPayload;
  decrypt<T = unknown>(payload: unknown): T | null;
  decryptAuthPayload<T extends Record<string, any>>(
    payload: T,
    fields?: readonly string[],
  ): T;
}

function normalizeSecret(rawSecret: string): string {
  if (!rawSecret || typeof rawSecret !== "string") {
    throw new Error("A crypto secret is required");
  }

  const secret = rawSecret.trim();
  if (secret.startsWith('"') && secret.endsWith('"')) {
    return secret.slice(1, -1);
  }

  return secret;
}

function createKey(rawSecret: string): CryptoJS.lib.WordArray {
  const key = CryptoJS.enc.Utf8.parse(normalizeSecret(rawSecret));
  key.sigBytes = 32;
  key.words.length = 8;
  return key;
}

function parseEncryptedPayload(payload: unknown): EncryptedPayload | null {
  if (payload && typeof payload === "object") {
    const candidate = payload as Partial<EncryptedPayload>;
    if (typeof candidate.iv === "string" && typeof candidate.data === "string") {
      return candidate as EncryptedPayload;
    }
  }

  if (typeof payload === "string") {
    try {
      return parseEncryptedPayload(JSON.parse(payload));
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Creates an AES-CBC helper compatible with the encrypted permission payloads
 * returned by Jervis authentication APIs.
 */
export function createPermissionCrypto(rawSecret: string): PermissionCrypto {
  const key = createKey(rawSecret);

  const encrypt = <T>(value: T): EncryptedPayload => {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(value), key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return {
      iv: CryptoJS.enc.Base64.stringify(iv),
      data: CryptoJS.enc.Base64.stringify(encrypted.ciphertext),
    };
  };

  const decrypt = <T = unknown>(payload: unknown): T | null => {
    try {
      const encryptedPayload = parseEncryptedPayload(payload);
      if (!encryptedPayload) return null;

      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Base64.parse(encryptedPayload.data) } as CryptoJS.lib.CipherParams,
        key,
        {
          iv: CryptoJS.enc.Base64.parse(encryptedPayload.iv),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        },
      );
      const text = decrypted.toString(CryptoJS.enc.Utf8);
      return text ? (JSON.parse(text) as T) : null;
    } catch {
      return null;
    }
  };

  const decryptAuthPayload = <T extends Record<string, any>>(
    payload: T,
    fields: readonly string[] = ["roles", "permissions"],
  ): T => {
    const decryptedPayload = { ...payload };

    for (const field of fields) {
      const value = payload[field];
      if (Array.isArray(value)) continue;
      decryptedPayload[field as keyof T] = (decrypt(value) ?? []) as T[keyof T];
    }

    return decryptedPayload;
  };

  return { encrypt, decrypt, decryptAuthPayload };
}

export function createPermissionDecryptor(secret: string) {
  const { decrypt } = createPermissionCrypto(secret);
  return (payload: unknown): string[] => {
    const permissions = decrypt<unknown>(payload);
    return Array.isArray(permissions) ? permissions : [];
  };
}
