import { ETenantType } from "../users";
import {
  EBaseCategories,
  EAllSubCategories,
  ICategoryRules,
} from "./category-rules";
export interface ICategoryRulesStore {
  getRulesByTenant(tenantId: ETenantType): Promise<ICategoryRules[]>;
  // Returns distinct category keywords grouped by base category for a tenant
  listCategoriesByBase(
    tenantId: ETenantType,
  ): Promise<Record<EBaseCategories, string[]>>;
  addRules(
    tenantId: ETenantType,
    rules: Omit<ICategoryRules, "tenantId" | "ruleId" | "createdAt">[],
  ): Promise<void>;
  addRule(
    tenantId: ETenantType,
    rule: Omit<ICategoryRules, "tenantId" | "ruleId" | "createdAt">,
  ): Promise<void>;
  removeRule(tenantId: ETenantType, ruleId: string): void;
  mapClassificationToEnums(label: string): {
    category: EBaseCategories;
    subCategory?: EAllSubCategories;
  };
}
