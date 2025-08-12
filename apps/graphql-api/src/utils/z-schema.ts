import { EBankName, ETenantType } from "@common";
import { z } from "zod";

export const MonthlyReviewArgs = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(new Date().getFullYear()),
});

export const AnnualReviewArgs = z.object({
  year: z.number().int().min(2000).max(new Date().getFullYear()),
});

export const CategoryBreakdownArgs = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(new Date().getFullYear()),
});

export const AggregateSummaryArgs = z.object({
  year: z.number().int().min(2000).max(new Date().getFullYear()),
  month: z.number().int().min(1).max(12).optional(),
});

export const FilteredTransactionsArgs = z.object({
  year: z.number().int().min(2000).max(new Date().getFullYear()),
  month: z.number().int().min(1).max(12),
  bankName: z.nativeEnum(EBankName).optional(),
  category: z.string().optional(),
});

export const UploadStatementArgs = z.object({
  bank: z.nativeEnum(EBankName),
  fileName: z.string().min(1, "File name is required"),
  contentBase64: z.string().min(1, "File content is required"),
  userId: z.string().min(1, "User ID is required"),
});

export const RegisterArgs = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  tenantId: z.nativeEnum(ETenantType),
});

export const LoginArgs = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  tenantId: z.nativeEnum(ETenantType),
});
