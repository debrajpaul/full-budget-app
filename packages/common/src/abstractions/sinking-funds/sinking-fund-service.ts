import { ETenantType } from "../users";
import { ISinkingFund } from "./sinking-fund";

export interface ISinkingFundService {
  getSinkingFunds(
    tenantId: ETenantType,
    userId: string
  ): Promise<ISinkingFund[]>;
}
