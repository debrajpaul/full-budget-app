import { ETenantType } from "../users";
import { EBaseCategories } from "../categories";

export interface ITransactionCategoryRequest {
  tenantId: ETenantType;
  transactionId: string;
  description?: string;
  category?: EBaseCategories;
  subCategory?: string; // Optional detailed sub-category
  amount?: number | null; // positive for credits & negative for debits
  createdAt: string;
  embedding?: number[];
  taggedBy?: string;
  confidence?: number;
}

export interface ITransactionCategoryService {
  process(request: ITransactionCategoryRequest): Promise<boolean>;
  addRulesByTenant(tenantId: ETenantType): Promise<void>;
  getCategoriesByTenant(
    tenantId: ETenantType,
  ): Promise<Record<string, string[]>>;
}
