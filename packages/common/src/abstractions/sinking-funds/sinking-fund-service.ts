import { ETenantType } from "../users";
import {
  ISinkingFund,
  ICreateSinkingFundInput,
  IUpdateSinkingFundInput,
} from "./sinking-fund";

export interface ISinkingFundService {
  getSinkingFunds(
    tenantId: ETenantType,
    userId: string
  ): Promise<ISinkingFund[]>;

  createSinkingFund(
    tenantId: ETenantType,
    userId: string,
    input: ICreateSinkingFundInput
  ): Promise<ISinkingFund>;

  updateSinkingFund(
    tenantId: ETenantType,
    userId: string,
    id: string,
    input: IUpdateSinkingFundInput
  ): Promise<ISinkingFund>;

  contributeSinkingFund(
    tenantId: ETenantType,
    userId: string,
    id: string,
    amount: number
  ): Promise<ISinkingFund>;

  deleteSinkingFund(
    tenantId: ETenantType,
    userId: string,
    id: string
  ): Promise<boolean>;
}
