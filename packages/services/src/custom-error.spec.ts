import { CustomError } from "./custom-error";

describe("CustomError", () => {
  it("should set message and code", () => {
    const err = new CustomError("Something went wrong", "ERR_CODE");
    expect(err.message).toBe("Something went wrong");
    expect(err.code).toBe("ERR_CODE");
  });

  it("should be instance of Error and CustomError", () => {
    const err = new CustomError("msg", "CODE");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CustomError);
  });

  it("should set name to CustomError", () => {
    const err = new CustomError("msg", "CODE");
    expect(err.name).toBe("CustomError");
  });
});
