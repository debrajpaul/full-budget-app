import {
  ILogger,
  ETenantType,
  ISavingsGoal,
  ISavingsGoalService,
  ISavingsGoalStore,
  ICreateSavingsGoalInput,
  IUpdateSavingsGoalInput,
  IContributeSavingsGoalInput,
} from "@common";
import { CustomError } from "./custom-error";

export class SavingsGoalService implements ISavingsGoalService {
  private readonly logger: ILogger;
  private readonly store: ISavingsGoalStore;

  constructor(logger: ILogger, store: ISavingsGoalStore) {
    this.logger = logger;
    this.store = store;
  }

  public async getSavingsGoals(
    tenantId: ETenantType,
    userId: string
  ): Promise<ISavingsGoal[]> {
    this.logger.debug("Fetching savings goals", { tenantId, userId });
    return this.store.listSavingsGoals(tenantId, userId);
  }

  public async createSavingsGoal(
    tenantId: ETenantType,
    userId: string,
    input: ICreateSavingsGoalInput
  ): Promise<ISavingsGoal> {
    this.logger.debug("Creating savings goal", {
      tenantId,
      userId,
      name: input.name,
    });
    return this.store.createSavingsGoal(tenantId, userId, input);
  }

  public async updateSavingsGoal(
    tenantId: ETenantType,
    userId: string,
    id: string,
    input: IUpdateSavingsGoalInput
  ): Promise<ISavingsGoal> {
    this.logger.debug("Updating savings goal", { tenantId, userId, id });
    const goal = await this.store.getSavingsGoalById(tenantId, userId, id);
    if (!goal) throw new CustomError("Savings goal not found", "NOT_FOUND");
    return this.store.updateSavingsGoal(tenantId, userId, id, input);
  }

  public async deleteSavingsGoal(
    tenantId: ETenantType,
    userId: string,
    id: string
  ): Promise<boolean> {
    this.logger.debug("Deleting savings goal", { tenantId, userId, id });
    const goal = await this.store.getSavingsGoalById(tenantId, userId, id);
    if (!goal) throw new CustomError("Savings goal not found", "NOT_FOUND");
    await this.store.deleteSavingsGoal(tenantId, userId, id);
    return true;
  }

  public async contributeSavingsGoal(
    tenantId: ETenantType,
    userId: string,
    input: IContributeSavingsGoalInput
  ): Promise<ISavingsGoal> {
    this.logger.debug("Contributing to savings goal", {
      tenantId,
      userId,
      id: input.id,
      amount: input.amount,
    });
    const goal = await this.store.getSavingsGoalById(
      tenantId,
      userId,
      input.id
    );
    if (!goal) throw new CustomError("Savings goal not found", "NOT_FOUND");
    const today = new Date().toISOString().split("T")[0];
    return this.store.addContribution(
      tenantId,
      userId,
      input.id,
      input.amount,
      today
    );
  }
}
