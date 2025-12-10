import { ETenantType } from "../users";
import { EBaseCategories, EAllSubCategories } from "../categories";

export interface ITransactionCategoryRequest {
  tenantId: ETenantType;
  transactionId: string;
  description: string;
  category: EBaseCategories;
  subCategory?: EAllSubCategories; // Optional detailed sub-category
  credit: number;
  debit: number;
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
