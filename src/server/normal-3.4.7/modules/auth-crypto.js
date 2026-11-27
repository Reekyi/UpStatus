export function createAuthCrypto({ Buffer, createHash, randomBytes, scryptSync, timingSafeEqual }) {
  function tokenHash(token) {
    return createHash("sha256").update(token).digest("hex");
  }

  function passwordHash(password, salt = randomBytes(16).toString("hex")) {
    return salt + ":" + Buffer.from(scryptSync(password, salt, 64)).toString("hex");
  }

  function checkPassword(password, saved) {
    try {
      const parts = String(saved || "").split(":");
      if (parts.length !== 2) return false;
      const actual = scryptSync(password, parts[0], 64);
      const old = Buffer.from(parts[1], "hex");
      return actual.length === old.length && timingSafeEqual(actual, old);
    } catch {
      return false;
    }
  }

  return { tokenHash, passwordHash, checkPassword };
}
