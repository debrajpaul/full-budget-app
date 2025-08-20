describe("config", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  it("uses tiny defaults when NODE_ENV=test", async () => {
    process.env.NODE_ENV = "test";
    jest.resetModules();
    const cfg = await import("./config");
    expect(cfg.DEFAULT_EPOCHS).toBe(1);
    expect(cfg.WINDOW_DAYS).toBe(30);
    expect(cfg.MAX_DATASET_LENGTH).toBe(20);
  });

  it("uses production defaults otherwise", async () => {
    process.env.NODE_ENV = "production";
    jest.resetModules();
    const cfg = await import("./config");
    expect(cfg.DEFAULT_EPOCHS).toBe(10);
    expect(cfg.WINDOW_DAYS).toBe(30);
    expect(cfg.MAX_DATASET_LENGTH).toBe(Infinity);
  });
});
