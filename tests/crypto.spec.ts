import { describe, expect, it } from "vitest";
import {
  createPermissionCrypto,
  createPermissionDecryptor,
} from "../src/crypto";

const secret = "base64:JdVOOP6UH8ly/dtvvNqNvtdLtFsbMpyNp0oGMXW2wA8=";

describe("permission crypto", () => {
  it("round-trips encrypted values", () => {
    const crypto = createPermissionCrypto(secret);
    const permissions = ["users.view", "users.edit"];

    expect(crypto.decrypt(crypto.encrypt(permissions))).toEqual(permissions);
  });

  it("decrypts roles and permissions in an auth payload", () => {
    const crypto = createPermissionCrypto(secret);
    const user = {
      id: 1,
      roles: crypto.encrypt([{ id: 2, name: "admin" }]),
      permissions: crypto.encrypt(["users.view"]),
    };

    expect(crypto.decryptAuthPayload(user)).toEqual({
      id: 1,
      roles: [{ id: 2, name: "admin" }],
      permissions: ["users.view"],
    });
  });

  it("creates a fail-closed permission decrypt hook", () => {
    const crypto = createPermissionCrypto(secret);
    const decrypt = createPermissionDecryptor(secret);

    expect(decrypt(crypto.encrypt(["dashboard.view"]))).toEqual(["dashboard.view"]);
    expect(decrypt("invalid")).toEqual([]);
  });
});
