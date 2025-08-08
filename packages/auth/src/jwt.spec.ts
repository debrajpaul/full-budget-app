import { signToken, verifyToken } from "./jwt";

describe("JWT Auth", () => {
  const jwtSecret = "test_secret";
  const payload = {
    userId: "user123",
    email: "user@example.com",
    tenantId: "tenant123",
  };

  it("should sign a token and verify it", () => {
    const token = signToken(payload, jwtSecret);
    expect(typeof token).toBe("string");
    const decoded = verifyToken(token, jwtSecret);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.tenantId).toBe(payload.tenantId);
  });

  it("should throw error for invalid token", () => {
    expect(() => verifyToken("invalid.token", jwtSecret)).toThrow();
  });

  it("should expire token after 1 hour", async () => {
    const token = signToken(payload, jwtSecret);
    const decoded = verifyToken(token, jwtSecret);
    expect(decoded.exp).toBeDefined();
    // exp is in seconds, check it's about 1 hour from now
    const now = Math.floor(Date.now() / 1000);
    expect(decoded.exp - now).toBeGreaterThan(3500); // allow for test runtime
    expect(decoded.exp - now).toBeLessThan(3700);
  });
});
