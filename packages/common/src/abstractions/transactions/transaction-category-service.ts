import { ETenantType } from "../users";
export interface ITransactionCategoryService {
  process(request: any): Promise<boolean>;
  addRulesByTenant(tenantId: ETenantType): Promise<void>;
}
