import jwt from "jsonwebtoken";

export function signToken(
  payload: object,
  jwtSecret: string,
  expiry: number,
): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: expiry });
}

export function verifyToken(token: string, jwtSecret: string): any {
  return jwt.verify(token, jwtSecret);
}
