import { ETenantType } from "../users";
import {
  ISinkingFund,
  ICreateSinkingFundInput,
  IUpdateSinkingFundInput,
} from "./sinking-fund";

export interface ISinkingFundStore {
  listSinkingFunds(
    tenantId: ETenantType,
    userId: string
  ): Promise<ISinkingFund[]>;

  getSinkingFund(
    tenantId: ETenantType,
    userId: string,
    id: string
  ): Promise<ISinkingFund | null>;

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
    amount: number,
    date: string
  ): Promise<ISinkingFund>;

  deleteSinkingFund(
    tenantId: ETenantType,
    userId: string,
    id: string
  ): Promise<void>;
}
