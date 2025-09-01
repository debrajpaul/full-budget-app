import { ETenantType, } from "../users";
import { EBaseCategories } from "./category-rules";
export interface ICategoryRulesStore {
  getRulesByTenant(tenantId: ETenantType): Promise<Record<string, EBaseCategories>>;
  addRules(tenantId: ETenantType, rules: Record<string, EBaseCategories>): Promise<void>;
  addRule(
    tenantId: ETenantType,
    keyword: string,
    category: EBaseCategories,
  ): Promise<void>;
  removeRule(tenantId: ETenantType, ruleId: string): void;
}
