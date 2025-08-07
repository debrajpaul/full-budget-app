import { WinstonLogger } from "./winston-logger";
import { LogLevel } from "@common";

describe("WinstonLogger", () => {
  let winstonLogger: WinstonLogger;
  let loggerMock: any;

  beforeEach(() => {
    // Use getInstance to create WinstonLogger
    winstonLogger = WinstonLogger.getInstance(LogLevel.INFO, "testLogger");
    // Spy on logger methods after instance creation
    loggerMock = winstonLogger["logger"];
    jest.spyOn(loggerMock, "log").mockImplementation(() => {});
    jest.spyOn(loggerMock, "error").mockImplementation(() => {});
    jest.spyOn(loggerMock, "warn").mockImplementation(() => {});
    jest.spyOn(loggerMock, "info").mockImplementation(() => {});
    jest.spyOn(loggerMock, "debug").mockImplementation(() => {});
    jest.spyOn(loggerMock, "child").mockReturnValue(loggerMock);
  });

  it("should log messages with correct level", () => {
    winstonLogger.log(LogLevel.INFO, "info message");
    expect(loggerMock.log).toHaveBeenCalledWith(
      LogLevel.INFO,
      "info message",
      expect.any(Object),
    );
  });

  it("should call error method", () => {
    winstonLogger.error("error message", { foo: "bar" }, ["tag"]);
    expect(loggerMock.error).toHaveBeenCalledWith("error message", {
      data: { foo: "bar" },
      tags: ["tag"],
    });
  });

  it("should call warn method", () => {
    winstonLogger.warn("warn message", { foo: "bar" }, ["tag"]);
    expect(loggerMock.warn).toHaveBeenCalledWith("warn message", {
      data: { foo: "bar" },
      tags: ["tag"],
    });
  });

  it("should call info method", () => {
    winstonLogger.info("info message", { foo: "bar" }, ["tag"]);
    expect(loggerMock.info).toHaveBeenCalledWith("info message", {
      data: { foo: "bar" },
      tags: ["tag"],
    });
  });

  it("should call debug method", () => {
    winstonLogger.debug("debug message", new Error("err"), { foo: "bar" }, [
      "tag",
    ]);
    expect(loggerMock.debug).toHaveBeenCalledWith("debug message", {
      error: expect.any(Error),
      data: { foo: "bar" },
      tags: ["tag"],
    });
  });

  it("should create child logger", () => {
    const child = winstonLogger.child("childLogger", { foo: "bar" });
    expect(loggerMock.child).toHaveBeenCalledWith({
      logger: "childLogger",
      foo: "bar",
    });
    expect(child).toBeInstanceOf(WinstonLogger);
  });

  it("should format error correctly", () => {
    const err = new Error("fail");
    const formatted = WinstonLogger.formatError(err);
    expect(formatted).toMatchObject({ message: "fail", stack: err.stack });
  });

  it("should format undefined error as undefined", () => {
    expect(WinstonLogger.formatError(undefined)).toBeUndefined();
  });

  it("should format unknown error as Error", () => {
    const formatted = WinstonLogger.formatError({ foo: "bar" } as any);
    expect(formatted).toBeInstanceOf(Error);
    expect((formatted as Error).message).toContain("Unknown error");
  });
});
