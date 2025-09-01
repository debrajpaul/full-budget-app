import { ETenantType } from "../users";

export interface ITransactionCategoryRequest {
  tenantId: ETenantType;
  transactionId: string;
  description?: string;
  category?: string;
  createdAt: string;
  embedding?: number[];
  taggedBy?: string;
  confidence?: number;
}

export interface ITransactionCategoryService {
  process(request: ITransactionCategoryRequest): Promise<boolean>;
  addRulesByTenant(tenantId: ETenantType): Promise<void>;
}
