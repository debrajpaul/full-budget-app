import { ETenantType } from "../users";
export interface ICategoryRulesStore {
  getRulesByTenant(tenantId: ETenantType): Promise<Record<string, string>>;
  addRules(tenantId: ETenantType, rules: Record<string, string>): Promise<void>;
  addRule(
    tenantId: ETenantType,
    keyword: string,
    category: string,
  ): Promise<void>;
  removeRule(tenantId: ETenantType, ruleId: string): void;
}
