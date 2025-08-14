import { ETenantType } from "../users";
export interface ITransactionCategoryService {
  process(request: any): Promise<boolean>;
  addRulesByTenant(
    tenantId: ETenantType,
    rules: Record<string, string>,
  ): Promise<void>;
}
