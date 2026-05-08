import {
  ILogger,
  ETenantType,
  ISinkingFund,
  ISinkingFundService,
  ISinkingFundStore,
  ICreateSinkingFundInput,
  IUpdateSinkingFundInput,
} from "@common";
import { CustomError } from "./custom-error";

export class SinkingFundService implements ISinkingFundService {
  private readonly logger: ILogger;
  private readonly store: ISinkingFundStore;

  constructor(logger: ILogger, store: ISinkingFundStore) {
    this.logger = logger;
    this.store = store;
  }

  public async getSinkingFunds(
    tenantId: ETenantType,
    userId: string
  ): Promise<ISinkingFund[]> {
    this.logger.debug("Fetching sinking funds", { tenantId, userId });
    return this.store.listSinkingFunds(tenantId, userId);
  }

  public async createSinkingFund(
    tenantId: ETenantType,
    userId: string,
    input: ICreateSinkingFundInput
  ): Promise<ISinkingFund> {
    this.logger.debug("Creating sinking fund", {
      tenantId,
      userId,
      name: input.name,
    });
    return this.store.createSinkingFund(tenantId, userId, input);
  }

  public async updateSinkingFund(
    tenantId: ETenantType,
    userId: string,
    id: string,
    input: IUpdateSinkingFundInput
  ): Promise<ISinkingFund> {
    this.logger.debug("Updating sinking fund", { tenantId, userId, id });
    const fund = await this.store.getSinkingFund(tenantId, userId, id);
    if (!fund) throw new CustomError("Sinking fund not found", "NOT_FOUND");
    return this.store.updateSinkingFund(tenantId, userId, id, input);
  }

  public async contributeSinkingFund(
    tenantId: ETenantType,
    userId: string,
    id: string,
    amount: number
  ): Promise<ISinkingFund> {
    this.logger.debug("Contributing to sinking fund", {
      tenantId,
      userId,
      id,
      amount,
    });
    const fund = await this.store.getSinkingFund(tenantId, userId, id);
    if (!fund) throw new CustomError("Sinking fund not found", "NOT_FOUND");
    const today = new Date().toISOString().split("T")[0];
    return this.store.contributeSinkingFund(
      tenantId,
      userId,
      id,
      amount,
      today
    );
  }

  public async deleteSinkingFund(
    tenantId: ETenantType,
    userId: string,
    id: string
  ): Promise<boolean> {
    this.logger.debug("Deleting sinking fund", { tenantId, userId, id });
    const fund = await this.store.getSinkingFund(tenantId, userId, id);
    if (!fund) throw new CustomError("Sinking fund not found", "NOT_FOUND");
    await this.store.deleteSinkingFund(tenantId, userId, id);
    return true;
  }
}
