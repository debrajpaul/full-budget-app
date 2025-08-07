import { hashPassword, comparePassword } from "./password";

describe("Password Auth", () => {
  const password = "mySecret123";

  it("should hash and compare password correctly", async () => {
    const hash = await hashPassword(password);
    expect(typeof hash).toBe("string");
    const isMatch = await comparePassword(password, hash);
    expect(isMatch).toBe(true);
  });

  it("should fail to compare wrong password", async () => {
    const hash = await hashPassword(password);
    const isMatch = await comparePassword("wrongPassword", hash);
    expect(isMatch).toBe(false);
  });

  it("should produce different hashes for same password", async () => {
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });
});
