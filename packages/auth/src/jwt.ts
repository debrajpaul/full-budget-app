import jwt from "jsonwebtoken";

export function signToken(payload: object, jwtSecret: string): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: "1H" });
}

export function verifyToken(token: string, jwtSecret: string): any {
  return jwt.verify(token, jwtSecret);
}
