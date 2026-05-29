import { z } from "zod";

export const TENANT_IDS = ["PERSONAL", "CLIENT", "DEFAULT"] as const;

// ── Login ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  tenantId: z.enum(TENANT_IDS),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ── Register ──────────────────────────────────────────────────────────────────

// Backend shape — only these four fields are forwarded to the GraphQL mutation.
const registerBaseSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  tenantId: z.enum(TENANT_IDS),
});

export type RegisterInput = z.infer<typeof registerBaseSchema>;
// Alias used by route handlers when forwarding to the backend.
export const registerInputSchema = registerBaseSchema;

// Full form schema — extends the base with confirmPassword for the UI only.
export const registerSchema = registerBaseSchema
  .extend({ confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
