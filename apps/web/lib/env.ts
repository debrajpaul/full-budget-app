import { z } from "zod";

const schema = z.object({
  GRAPHQL_ENDPOINT: z.string().url("GRAPHQL_ENDPOINT must be a valid URL"),
  SESSION_COOKIE_NAME: z.string().min(1, "SESSION_COOKIE_NAME is required"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

// Throws at startup with a descriptive message if any required var is absent or malformed.
export const env = schema.parse(process.env);
