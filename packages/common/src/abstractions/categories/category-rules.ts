import { ETenantType } from "../users";
export interface ICategoryRules {
  ruleId: string;
  tenantId: ETenantType;
  keyword: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  upstringdAt?: string;
  deletedAt?: string;
}
