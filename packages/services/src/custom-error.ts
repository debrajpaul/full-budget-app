export class CustomError extends Error {
  public code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "CustomError";
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
