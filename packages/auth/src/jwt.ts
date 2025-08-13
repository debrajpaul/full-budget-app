import jwt from "jsonwebtoken";
import { ETenantType } from "@common";

export function signToken(
  user: {
    userId: string;
    email: string;
    tenantId: ETenantType;
  },
  secret: string,
): string {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      tenantId: user.tenantId,
    },
    secret,
    { expiresIn: "1h" },
  );
}

export function verifyToken(token: string, jwtSecret: string): any {
  return jwt.verify(token, jwtSecret);
}
