export interface ICategoryRulesStore {
  getRulesByTenant(tenantId: string): Promise<Record<string, string>>;
  addRules(tenantId: string, rules: Record<string, string>): Promise<void>;
  addRule(tenantId: string, keyword: string, category: string): Promise<void>;
  removeRule(tenantId: string, ruleId: string): void;
}
