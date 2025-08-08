import jwt from "jsonwebtoken";

export function signToken(
  user: {
    userId: string;
    email: string;
    tenantId: string;
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
