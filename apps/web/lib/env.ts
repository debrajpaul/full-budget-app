import { z } from "zod";

const schema = z.object({
  GRAPHQL_ENDPOINT: z.string().url("GRAPHQL_ENDPOINT must be a valid URL"),
  SESSION_COOKIE_NAME: z.string().min(1, "SESSION_COOKIE_NAME is required"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

type Env = z.infer<typeof schema>;

// Parsed lazily on first property access.
//
// Next.js executes module-level code during `next build` (static analysis /
// page-data collection) before real env vars are injected. Eager parsing at
// module load time causes ZodError in CI builds that don't set runtime vars.
// The Proxy defers validation to request time while keeping `env.X` syntax.
let _parsed: Env | undefined;
function parse(): Env {
  if (!_parsed) {
    _parsed = schema.parse(process.env);
  }
  return _parsed;
}

export const env: Env = new Proxy({} as Env, {
  get(_t, key: string) {
    return parse()[key as keyof Env];
  },
});
