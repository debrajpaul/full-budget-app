/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** ISO-8601 calendar date (YYYY-MM-DD). Validated on input; serialized as string. */
  Date: { input: any; output: any; }
};

/**
 * A single keyword-based classification rule to add for the tenant.
 * keyword is treated as a case-insensitive substring match.
 */
export type AddTransactionCategoryInput = {
  category: BaseCategory;
  confidence?: InputMaybe<Scalars['Float']['input']>;
  keyword: Scalars['String']['input'];
  reason?: InputMaybe<Scalars['String']['input']>;
  subCategory?: InputMaybe<Scalars['String']['input']>;
  when?: InputMaybe<Scalars['String']['input']>;
};

/** Aggregated totals for income, expenses, and net savings. */
export type AggregatedSummary = {
  __typename?: 'AggregatedSummary';
  netSavings: Scalars['Float']['output'];
  totalExpense: Scalars['Float']['output'];
  totalIncome: Scalars['Float']['output'];
};

/** Severity levels for forecast alerts. */
export enum AlertSeverity {
  Critical = 'critical',
  Info = 'info',
  Warning = 'warning'
}

/** Classification of forecast alerts. */
export enum AlertType {
  LargeExpense = 'LARGE_EXPENSE',
  LowBalance = 'LOW_BALANCE'
}

/** Yearly aggregates and a cursor-paginated list of transactions. */
export type AnnualReview = {
  __typename?: 'AnnualReview';
  netSavings: Scalars['Float']['output'];
  totalExpense: Scalars['Float']['output'];
  totalIncome: Scalars['Float']['output'];
  transactions: TransactionsPage;
};

/** Supported banks for statement import and transaction parsing. */
export enum BankName {
  Axis = 'AXIS',
  Hdfc = 'HDFC',
  Other = 'OTHER',
  Sbi = 'SBI'
}

/** Supported bank account types for statement import and transaction parsing. */
export enum BankType {
  CreditCard = 'CREDIT_CARD',
  Current = 'CURRENT',
  Other = 'OTHER',
  Savings = 'SAVINGS'
}

/** Top-level budget category buckets used for grouping. */
export enum BaseCategory {
  Default = 'DEFAULT',
  Expenses = 'EXPENSES',
  Income = 'INCOME',
  Savings = 'SAVINGS'
}

/** Budget allocation for a category in a specific month/year. */
export type Budget = {
  __typename?: 'Budget';
  amount: Scalars['Float']['output'];
  category: Scalars['String']['output'];
  id: Scalars['String']['output'];
  month: Scalars['Int']['output'];
  year: Scalars['Int']['output'];
};

/** Categories grouped by their base category bucket. */
export type CategoriesByBase = {
  __typename?: 'CategoriesByBase';
  base: BaseCategory;
  categories: Array<Scalars['String']['output']>;
};

/** Category with its aggregated amount. */
export type CategoryAmount = {
  __typename?: 'CategoryAmount';
  amount: Scalars['Float']['output'];
  name: Scalars['String']['output'];
};

/** Transactions grouped by category with total amount. */
export type CategoryGroup = {
  __typename?: 'CategoryGroup';
  category: Scalars['String']['output'];
  totalAmount: Scalars['Float']['output'];
  transactions: Array<Transaction>;
};

/** Input to contribute an amount toward a savings goal. */
export type ContributeSavingsGoalInput = {
  amount: Scalars['Float']['input'];
  id: Scalars['ID']['input'];
};

/** Input to record a contribution to a sinking fund. */
export type ContributeSinkingFundInput = {
  amount: Scalars['Float']['input'];
  id: Scalars['ID']['input'];
};

/** Input to create a recurring transaction rule. */
export type CreateRecurringTransactionInput = {
  amount: Scalars['Float']['input'];
  category?: InputMaybe<Scalars['String']['input']>;
  dayOfMonth?: InputMaybe<Scalars['Int']['input']>;
  dayOfWeek?: InputMaybe<Scalars['Int']['input']>;
  description: Scalars['String']['input'];
  endDate?: InputMaybe<Scalars['Date']['input']>;
  frequency: RecurringFrequency;
  monthOfYear?: InputMaybe<Scalars['Int']['input']>;
  startDate: Scalars['Date']['input'];
  type?: InputMaybe<TransactionType>;
};

/** Input to create a new savings goal. */
export type CreateSavingsGoalInput = {
  deadline: Scalars['Date']['input'];
  initialAmount?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  target: Scalars['Float']['input'];
};

/** Input to create a new sinking fund. */
export type CreateSinkingFundInput = {
  deadline?: InputMaybe<Scalars['Date']['input']>;
  monthlyContribution?: InputMaybe<Scalars['Float']['input']>;
  name: Scalars['String']['input'];
  target: Scalars['Float']['input'];
};

/** Input to request a pre-signed S3 upload URL for a bank statement. */
export type CreateUploadUrlInput = {
  bankName: BankName;
  bankType: BankType;
  fileName: Scalars['String']['input'];
};

/** Alert generated during forecasting with severity and message. */
export type ForecastAlert = {
  __typename?: 'ForecastAlert';
  date: Scalars['Date']['output'];
  message: Scalars['String']['output'];
  severity: AlertSeverity;
  type: AlertType;
};

/** Per-day forecast metrics and running balance. */
export type ForecastDay = {
  __typename?: 'ForecastDay';
  date: Scalars['Date']['output'];
  inflow: Scalars['Float']['output'];
  net: Scalars['Float']['output'];
  outflow: Scalars['Float']['output'];
  runningBalance?: Maybe<Scalars['Float']['output']>;
};

/** Optional parameters to tune forecasting behavior and thresholds. */
export type ForecastOptionsInput = {
  largeExpenseThreshold?: InputMaybe<Scalars['Float']['input']>;
  lowBalanceThreshold?: InputMaybe<Scalars['Float']['input']>;
  startingBalance?: InputMaybe<Scalars['Float']['input']>;
};

/** Monthly cash-flow forecast summary with daily details and alerts. */
export type ForecastResult = {
  __typename?: 'ForecastResult';
  alerts: Array<ForecastAlert>;
  days: Array<ForecastDay>;
  endingBalance: Scalars['Float']['output'];
  month: Scalars['Int']['output'];
  startingBalance: Scalars['Float']['output'];
  year: Scalars['Int']['output'];
};

/** Input payload to authenticate a user. */
export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  tenantId: TenantType;
};

/** Result of the login mutation containing user, access token, and a single-use refresh token. */
export type LoginResponse = {
  __typename?: 'LoginResponse';
  refreshToken: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user: User;
};

/** Monthly aggregates, category breakdown, and time series. */
export type MonthlyReview = {
  __typename?: 'MonthlyReview';
  categoryBreakdown: Array<CategoryAmount>;
  savings: Scalars['Float']['output'];
  series: Array<ReviewSeriesPoint>;
  totalExpenses: Scalars['Float']['output'];
  totalIncome: Scalars['Float']['output'];
};

/** Root mutation operations for the Finance Budget API. */
export type Mutation = {
  __typename?: 'Mutation';
  /**
   * Adds a single keyword-based classification rule for the current tenant.
   * Pass the built-in preset instead by omitting input and calling with no args,
   * or supply explicit keyword/category pairs to extend the rule set.
   */
  addTransactionCategory: Scalars['Boolean']['output'];
  /** Adds a contribution to a savings goal, appending a history point. */
  contributeSavingsGoal: SavingsGoal;
  /** Records a contribution to a sinking fund, updating current and appending history. */
  contributeSinkingFund: SinkingFund;
  /** Creates a recurring transaction definition. */
  createRecurringTransaction: RecurringTransaction;
  /** Creates a new savings goal and seeds an initial history point. */
  createSavingsGoal: SavingsGoal;
  /** Creates a new sinking fund and seeds an initial history point with value 0. */
  createSinkingFund: SinkingFund;
  /**
   * Creates a pre-signed S3 URL for direct statement upload. After the client PUTs
   * the file to uploadUrl, call notifyUploadComplete(jobId) to trigger processing.
   */
  createUploadUrl: UploadUrlResult;
  /** Deletes a budget entry by its id. Returns true on success. */
  deleteBudget: Scalars['Boolean']['output'];
  /** Deletes a savings goal by id. Returns true on success. */
  deleteSavingsGoal: Scalars['Boolean']['output'];
  /** Deletes a sinking fund by id. Returns true on success. */
  deleteSinkingFund: Scalars['Boolean']['output'];
  /** Materializes recurring transactions for the given month and returns the count. */
  generateRecurringTransactions: Scalars['Int']['output'];
  /** Authenticates a user and returns an access token and a single-use refresh token. */
  login: LoginResponse;
  /**
   * Notifies that a direct S3 upload has completed, enqueuing the transaction
   * processing job. Idempotent: replaying the same jobId is safe.
   */
  notifyUploadComplete: StatementUploadResult;
  /** Reclassifies a transaction to a new category and returns the updated item. */
  reclassifyTransaction: ReclassifiedTransaction;
  /**
   * Issues a new LoginResponse using a valid refresh token (single-use rotation).
   * Revokes the supplied token; replaying a used token revokes the entire family.
   */
  refreshToken: LoginResponse;
  /** Creates a new user account for the given tenant. */
  register: RegisterResponse;
  /** Sets the budget amount for a category in the specified month/year. */
  setBudget: Budget;
  /** Updates an existing savings goal using PATCH semantics (only provided fields change). */
  updateSavingsGoal: SavingsGoal;
  /** Updates sinking fund metadata using PATCH semantics (only provided fields change). */
  updateSinkingFund: SinkingFund;
  /**
   * Uploads a bank statement file (base64) for processing and import.
   * @deprecated Use createUploadUrl + notifyUploadComplete instead. Will be removed in the next release.
   */
  uploadStatement: StatementUploadResult;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationAddTransactionCategoryArgs = {
  input: AddTransactionCategoryInput;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationContributeSavingsGoalArgs = {
  input: ContributeSavingsGoalInput;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationContributeSinkingFundArgs = {
  input: ContributeSinkingFundInput;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationCreateRecurringTransactionArgs = {
  input: CreateRecurringTransactionInput;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationCreateSavingsGoalArgs = {
  input: CreateSavingsGoalInput;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationCreateSinkingFundArgs = {
  input: CreateSinkingFundInput;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationCreateUploadUrlArgs = {
  input: CreateUploadUrlInput;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationDeleteBudgetArgs = {
  id: Scalars['String']['input'];
};


/** Root mutation operations for the Finance Budget API. */
export type MutationDeleteSavingsGoalArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation operations for the Finance Budget API. */
export type MutationDeleteSinkingFundArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation operations for the Finance Budget API. */
export type MutationGenerateRecurringTransactionsArgs = {
  month: Scalars['Int']['input'];
  year: Scalars['Int']['input'];
};


/** Root mutation operations for the Finance Budget API. */
export type MutationLoginArgs = {
  input: LoginInput;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationNotifyUploadCompleteArgs = {
  jobId: Scalars['String']['input'];
};


/** Root mutation operations for the Finance Budget API. */
export type MutationReclassifyTransactionArgs = {
  category: Scalars['String']['input'];
  id: Scalars['String']['input'];
};


/** Root mutation operations for the Finance Budget API. */
export type MutationRefreshTokenArgs = {
  refreshToken: Scalars['String']['input'];
};


/** Root mutation operations for the Finance Budget API. */
export type MutationRegisterArgs = {
  input: RegisterInput;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationSetBudgetArgs = {
  amount: Scalars['Float']['input'];
  category: Scalars['String']['input'];
  period: PeriodInput;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationUpdateSavingsGoalArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSavingsGoalInput;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationUpdateSinkingFundArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSinkingFundInput;
};


/** Root mutation operations for the Finance Budget API. */
export type MutationUploadStatementArgs = {
  input: StatementInput;
};

/** Period identifier consisting of month and year. */
export type PeriodInput = {
  month: Scalars['Int']['input'];
  year: Scalars['Int']['input'];
};

/** Root query operations for the Finance Budget API. */
export type Query = {
  __typename?: 'Query';
  /** Returns income, expense, and net savings for the given period. */
  aggregateSummary: AggregatedSummary;
  /** Returns yearly income, expenses, net savings, and a paged transaction list. */
  annualReview: AnnualReview;
  /** API version of the GraphQL service. */
  apiVersion?: Maybe<Scalars['String']['output']>;
  /** Lists all budgets for the authenticated user for the given period. */
  budgets: Array<Budget>;
  /** Lists categories grouped by base type (INCOME/EXPENSES/SAVINGS). */
  categoriesByBase: Array<CategoriesByBase>;
  /** Groups transactions by category with totals for the month. */
  categoryBreakdown: Array<CategoryGroup>;
  /** Forecasts daily cash flow for the specified month with optional rules. */
  forecastMonth: ForecastResult;
  /** Simple health check; returns a status string if the API is up. */
  healthCheck?: Maybe<Scalars['String']['output']>;
  /** Returns monthly income, expenses, savings, category breakdown, and series. */
  monthlyReview: MonthlyReview;
  /** Lists all recurring transactions for the current tenant/user. */
  recurringTransactions: Array<RecurringTransaction>;
  /** Lists savings goals with current progress and history. */
  savingsGoals: Array<SavingsGoal>;
  /** Lists sinking funds, balances, and history for the tenant. */
  sinkingFunds: Array<SinkingFund>;
  /** Lists supported tenant types available in the system. */
  tenants: Array<Tenant>;
  /** Lists transactions filtered by month/year (paged by cursor). */
  transactions: TransactionsPage;
};


/** Root query operations for the Finance Budget API. */
export type QueryAggregateSummaryArgs = {
  month?: InputMaybe<Scalars['Int']['input']>;
  year: Scalars['Int']['input'];
};


/** Root query operations for the Finance Budget API. */
export type QueryAnnualReviewArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  year: Scalars['Int']['input'];
};


/** Root query operations for the Finance Budget API. */
export type QueryBudgetsArgs = {
  period: PeriodInput;
};


/** Root query operations for the Finance Budget API. */
export type QueryCategoryBreakdownArgs = {
  month: Scalars['Int']['input'];
  year: Scalars['Int']['input'];
};


/** Root query operations for the Finance Budget API. */
export type QueryForecastMonthArgs = {
  month: Scalars['Int']['input'];
  options?: InputMaybe<ForecastOptionsInput>;
  year: Scalars['Int']['input'];
};


/** Root query operations for the Finance Budget API. */
export type QueryMonthlyReviewArgs = {
  month: Scalars['Int']['input'];
  year: Scalars['Int']['input'];
};


/** Root query operations for the Finance Budget API. */
export type QueryTransactionsArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  filters: TransactionsFilter;
};

/** Subset of fields returned after reclassifying a transaction. */
export type ReclassifiedTransaction = {
  __typename?: 'ReclassifiedTransaction';
  category: Scalars['String']['output'];
  id: Scalars['String']['output'];
  taggedBy?: Maybe<Scalars['String']['output']>;
};

/** Supported schedules for recurring transactions. */
export enum RecurringFrequency {
  Biweekly = 'biweekly',
  Monthly = 'monthly',
  Weekly = 'weekly',
  Yearly = 'yearly'
}

/** Definition and schedule of a recurring transaction. */
export type RecurringTransaction = {
  __typename?: 'RecurringTransaction';
  amount: Scalars['Float']['output'];
  category?: Maybe<Scalars['String']['output']>;
  dayOfMonth?: Maybe<Scalars['Int']['output']>;
  dayOfWeek?: Maybe<Scalars['Int']['output']>;
  description: Scalars['String']['output'];
  endDate?: Maybe<Scalars['Date']['output']>;
  frequency: RecurringFrequency;
  id: Scalars['String']['output'];
  monthOfYear?: Maybe<Scalars['Int']['output']>;
  nextRunDate?: Maybe<Scalars['Date']['output']>;
  startDate: Scalars['Date']['output'];
  type: TransactionType;
};

/** Input payload to register a new user account. */
export type RegisterInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  tenantId: TenantType;
};

/** Result of the register mutation. */
export type RegisterResponse = {
  __typename?: 'RegisterResponse';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

/** Budget vs actual values for a specific date. */
export type ReviewSeriesPoint = {
  __typename?: 'ReviewSeriesPoint';
  actual: Scalars['Float']['output'];
  budget: Scalars['Float']['output'];
  date: Scalars['Date']['output'];
};

/** Savings goal with target, current progress, deadline, and history. */
export type SavingsGoal = {
  __typename?: 'SavingsGoal';
  current: Scalars['Float']['output'];
  deadline: Scalars['Date']['output'];
  history: Array<SavingsHistoryPoint>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  target: Scalars['Float']['output'];
};

/** Historical point representing savings value on a date. */
export type SavingsHistoryPoint = {
  __typename?: 'SavingsHistoryPoint';
  date: Scalars['Date']['output'];
  value: Scalars['Float']['output'];
};

/** Sinking fund with targets, balances, and contribution history. */
export type SinkingFund = {
  __typename?: 'SinkingFund';
  current: Scalars['Float']['output'];
  deadline?: Maybe<Scalars['Date']['output']>;
  history: Array<SinkingFundHistoryPoint>;
  id: Scalars['ID']['output'];
  monthlyContribution?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  target: Scalars['Float']['output'];
};

/** Historical point representing sinking fund value on a date. */
export type SinkingFundHistoryPoint = {
  __typename?: 'SinkingFundHistoryPoint';
  date: Scalars['Date']['output'];
  value: Scalars['Float']['output'];
};

/** Payload to upload a bank statement (base64 content). */
export type StatementInput = {
  bankName: BankName;
  bankType: BankType;
  contentBase64: Scalars['String']['input'];
  fileName: Scalars['String']['input'];
};

/**
 * Rich result returned after a statement upload is accepted for processing.
 * accepted is always true on success (errors are thrown); warnings surface
 * non-fatal issues such as oversized files or unusual column layouts.
 */
export type StatementUploadResult = {
  __typename?: 'StatementUploadResult';
  accepted: Scalars['Boolean']['output'];
  jobId: Scalars['String']['output'];
  warnings: Array<Scalars['String']['output']>;
};

/** Tenant record available in the system. */
export type Tenant = {
  __typename?: 'Tenant';
  id: TenantType;
  name: Scalars['String']['output'];
};

/** Tenant scope used for data segregation across users/clients. */
export enum TenantType {
  Client = 'CLIENT',
  Default = 'DEFAULT',
  Personal = 'PERSONAL'
}

/** Normalized bank transaction record as imported and processed. */
export type Transaction = {
  __typename?: 'Transaction';
  balance?: Maybe<Scalars['Float']['output']>;
  bankName: BankName;
  category?: Maybe<Scalars['String']['output']>;
  confidence?: Maybe<Scalars['Float']['output']>;
  credit: Scalars['Float']['output'];
  debit: Scalars['Float']['output'];
  description?: Maybe<Scalars['String']['output']>;
  taggedBy?: Maybe<Scalars['String']['output']>;
  tenantId: TenantType;
  transactionId: Scalars['String']['output'];
  txnDate: Scalars['Date']['output'];
  type?: Maybe<Scalars['String']['output']>;
  userId: Scalars['String']['output'];
};

/** Whether a recurring transaction represents an inflow or outflow. */
export enum TransactionType {
  Expense = 'EXPENSE',
  Income = 'INCOME'
}

/** Filters to list transactions for a given period and category. */
export type TransactionsFilter = {
  bankName?: InputMaybe<BankName>;
  category?: InputMaybe<Scalars['String']['input']>;
  month: Scalars['Int']['input'];
  year: Scalars['Int']['input'];
};

/** Cursor-paginated list of transactions. */
export type TransactionsPage = {
  __typename?: 'TransactionsPage';
  cursor?: Maybe<Scalars['String']['output']>;
  items: Array<Transaction>;
};

/** Input to update an existing savings goal (PATCH semantics – all fields optional). */
export type UpdateSavingsGoalInput = {
  deadline?: InputMaybe<Scalars['Date']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  target?: InputMaybe<Scalars['Float']['input']>;
};

/** Input to update sinking fund metadata (PATCH semantics — omitted fields unchanged). */
export type UpdateSinkingFundInput = {
  deadline?: InputMaybe<Scalars['Date']['input']>;
  monthlyContribution?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  target?: InputMaybe<Scalars['Float']['input']>;
};

/** Result of the createUploadUrl mutation: a pre-signed URL for direct S3 upload. */
export type UploadUrlResult = {
  __typename?: 'UploadUrlResult';
  expiresInSeconds: Scalars['Int']['output'];
  jobId: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

/** User account profile for the authenticated tenant. */
export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  tenantId: TenantType;
};

export type BudgetsQueryVariables = Exact<{
  period: PeriodInput;
}>;


export type BudgetsQuery = { __typename?: 'Query', budgets: Array<{ __typename?: 'Budget', id: string, month: number, year: number, category: string, amount: number }> };

export type MonthlyReviewForBudgetsQueryVariables = Exact<{
  month: Scalars['Int']['input'];
  year: Scalars['Int']['input'];
}>;


export type MonthlyReviewForBudgetsQuery = { __typename?: 'Query', monthlyReview: { __typename?: 'MonthlyReview', categoryBreakdown: Array<{ __typename?: 'CategoryAmount', name: string, amount: number }> } };

export type SetBudgetMutationVariables = Exact<{
  period: PeriodInput;
  category: Scalars['String']['input'];
  amount: Scalars['Float']['input'];
}>;


export type SetBudgetMutation = { __typename?: 'Mutation', setBudget: { __typename?: 'Budget', id: string, month: number, year: number, category: string, amount: number } };

export type DashboardMonthlyReviewQueryVariables = Exact<{
  month: Scalars['Int']['input'];
  year: Scalars['Int']['input'];
}>;


export type DashboardMonthlyReviewQuery = { __typename?: 'Query', monthlyReview: { __typename?: 'MonthlyReview', totalIncome: number, totalExpenses: number, savings: number, categoryBreakdown: Array<{ __typename?: 'CategoryAmount', name: string, amount: number }>, series: Array<{ __typename?: 'ReviewSeriesPoint', date: any, budget: number, actual: number }> } };

export type DashboardRecentTransactionsQueryVariables = Exact<{
  filters: TransactionsFilter;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type DashboardRecentTransactionsQuery = { __typename?: 'Query', transactions: { __typename?: 'TransactionsPage', cursor?: string | null, items: Array<{ __typename?: 'Transaction', transactionId: string, txnDate: any, description?: string | null, credit: number, debit: number, category?: string | null, taggedBy?: string | null }> } };

export type ForecastMonthQueryVariables = Exact<{
  year: Scalars['Int']['input'];
  month: Scalars['Int']['input'];
  options?: InputMaybe<ForecastOptionsInput>;
}>;


export type ForecastMonthQuery = { __typename?: 'Query', forecastMonth: { __typename?: 'ForecastResult', month: number, year: number, startingBalance: number, endingBalance: number, days: Array<{ __typename?: 'ForecastDay', date: any, inflow: number, outflow: number, net: number, runningBalance?: number | null }>, alerts: Array<{ __typename?: 'ForecastAlert', date: any, type: AlertType, message: string, severity: AlertSeverity }> } };

export type SavingsGoalsQueryVariables = Exact<{ [key: string]: never; }>;


export type SavingsGoalsQuery = { __typename?: 'Query', savingsGoals: Array<{ __typename?: 'SavingsGoal', id: string, name: string, target: number, current: number, deadline: any, history: Array<{ __typename?: 'SavingsHistoryPoint', date: any, value: number }> }> };

export type CreateGoalMutationVariables = Exact<{
  input: CreateSavingsGoalInput;
}>;


export type CreateGoalMutation = { __typename?: 'Mutation', createSavingsGoal: { __typename?: 'SavingsGoal', id: string, name: string, target: number, current: number, deadline: any, history: Array<{ __typename?: 'SavingsHistoryPoint', date: any, value: number }> } };

export type ContributeGoalMutationVariables = Exact<{
  input: ContributeSavingsGoalInput;
}>;


export type ContributeGoalMutation = { __typename?: 'Mutation', contributeSavingsGoal: { __typename?: 'SavingsGoal', id: string, name: string, target: number, current: number, deadline: any, history: Array<{ __typename?: 'SavingsHistoryPoint', date: any, value: number }> } };

export type UpdateGoalMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateSavingsGoalInput;
}>;


export type UpdateGoalMutation = { __typename?: 'Mutation', updateSavingsGoal: { __typename?: 'SavingsGoal', id: string, name: string, target: number, current: number, deadline: any, history: Array<{ __typename?: 'SavingsHistoryPoint', date: any, value: number }> } };

export type DeleteGoalMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteGoalMutation = { __typename?: 'Mutation', deleteSavingsGoal: boolean };

export type RecurringTransactionsQueryVariables = Exact<{ [key: string]: never; }>;


export type RecurringTransactionsQuery = { __typename?: 'Query', recurringTransactions: Array<{ __typename?: 'RecurringTransaction', id: string, description: string, amount: number, category?: string | null, type: TransactionType, frequency: RecurringFrequency, dayOfMonth?: number | null, startDate: any, nextRunDate?: any | null }> };

export type CreateRecurringMutationVariables = Exact<{
  input: CreateRecurringTransactionInput;
}>;


export type CreateRecurringMutation = { __typename?: 'Mutation', createRecurringTransaction: { __typename?: 'RecurringTransaction', id: string, description: string, amount: number, category?: string | null, type: TransactionType, frequency: RecurringFrequency, dayOfMonth?: number | null, startDate: any, nextRunDate?: any | null } };

export type GenerateRecurringMutationVariables = Exact<{
  month: Scalars['Int']['input'];
  year: Scalars['Int']['input'];
}>;


export type GenerateRecurringMutation = { __typename?: 'Mutation', generateRecurringTransactions: number };

export type SinkingFundsQueryVariables = Exact<{ [key: string]: never; }>;


export type SinkingFundsQuery = { __typename?: 'Query', sinkingFunds: Array<{ __typename?: 'SinkingFund', id: string, name: string, target: number, current: number, monthlyContribution?: number | null, deadline?: any | null, history: Array<{ __typename?: 'SinkingFundHistoryPoint', date: any, value: number }> }> };

export type CreateSinkingFundMutationVariables = Exact<{
  input: CreateSinkingFundInput;
}>;


export type CreateSinkingFundMutation = { __typename?: 'Mutation', createSinkingFund: { __typename?: 'SinkingFund', id: string, name: string, target: number, current: number, monthlyContribution?: number | null, deadline?: any | null, history: Array<{ __typename?: 'SinkingFundHistoryPoint', date: any, value: number }> } };

export type ContributeSinkingFundMutationVariables = Exact<{
  input: ContributeSinkingFundInput;
}>;


export type ContributeSinkingFundMutation = { __typename?: 'Mutation', contributeSinkingFund: { __typename?: 'SinkingFund', id: string, name: string, target: number, current: number, monthlyContribution?: number | null, deadline?: any | null, history: Array<{ __typename?: 'SinkingFundHistoryPoint', date: any, value: number }> } };

export type UpdateSinkingFundMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateSinkingFundInput;
}>;


export type UpdateSinkingFundMutation = { __typename?: 'Mutation', updateSinkingFund: { __typename?: 'SinkingFund', id: string, name: string, target: number, current: number, monthlyContribution?: number | null, deadline?: any | null, history: Array<{ __typename?: 'SinkingFundHistoryPoint', date: any, value: number }> } };

export type DeleteSinkingFundMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSinkingFundMutation = { __typename?: 'Mutation', deleteSinkingFund: boolean };

export type TransactionsQueryVariables = Exact<{
  filters: TransactionsFilter;
  cursor?: InputMaybe<Scalars['String']['input']>;
}>;


export type TransactionsQuery = { __typename?: 'Query', transactions: { __typename?: 'TransactionsPage', cursor?: string | null, items: Array<{ __typename?: 'Transaction', transactionId: string, bankName: BankName, txnDate: any, description?: string | null, credit: number, debit: number, category?: string | null, taggedBy?: string | null, confidence?: number | null }> } };

export type CategoriesByBaseQueryVariables = Exact<{ [key: string]: never; }>;


export type CategoriesByBaseQuery = { __typename?: 'Query', categoriesByBase: Array<{ __typename?: 'CategoriesByBase', base: BaseCategory, categories: Array<string> }> };

export type ReclassifyMutationVariables = Exact<{
  id: Scalars['String']['input'];
  category: Scalars['String']['input'];
}>;


export type ReclassifyMutation = { __typename?: 'Mutation', reclassifyTransaction: { __typename?: 'ReclassifiedTransaction', id: string, category: string, taggedBy?: string | null } };

export type CreateUploadUrlMutationVariables = Exact<{
  input: CreateUploadUrlInput;
}>;


export type CreateUploadUrlMutation = { __typename?: 'Mutation', createUploadUrl: { __typename?: 'UploadUrlResult', jobId: string, uploadUrl: string, expiresInSeconds: number } };

export type NotifyUploadCompleteMutationVariables = Exact<{
  jobId: Scalars['String']['input'];
}>;


export type NotifyUploadCompleteMutation = { __typename?: 'Mutation', notifyUploadComplete: { __typename?: 'StatementUploadResult', jobId: string, accepted: boolean, warnings: Array<string> } };


export const BudgetsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Budgets"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"period"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PeriodInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"budgets"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"period"},"value":{"kind":"Variable","name":{"kind":"Name","value":"period"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"month"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]} as unknown as DocumentNode<BudgetsQuery, BudgetsQueryVariables>;
export const MonthlyReviewForBudgetsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MonthlyReviewForBudgets"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"month"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"year"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"monthlyReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"month"},"value":{"kind":"Variable","name":{"kind":"Name","value":"month"}}},{"kind":"Argument","name":{"kind":"Name","value":"year"},"value":{"kind":"Variable","name":{"kind":"Name","value":"year"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"categoryBreakdown"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]} as unknown as DocumentNode<MonthlyReviewForBudgetsQuery, MonthlyReviewForBudgetsQueryVariables>;
export const SetBudgetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetBudget"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"period"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PeriodInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"category"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"amount"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setBudget"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"period"},"value":{"kind":"Variable","name":{"kind":"Name","value":"period"}}},{"kind":"Argument","name":{"kind":"Name","value":"category"},"value":{"kind":"Variable","name":{"kind":"Name","value":"category"}}},{"kind":"Argument","name":{"kind":"Name","value":"amount"},"value":{"kind":"Variable","name":{"kind":"Name","value":"amount"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"month"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]} as unknown as DocumentNode<SetBudgetMutation, SetBudgetMutationVariables>;
export const DashboardMonthlyReviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DashboardMonthlyReview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"month"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"year"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"monthlyReview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"month"},"value":{"kind":"Variable","name":{"kind":"Name","value":"month"}}},{"kind":"Argument","name":{"kind":"Name","value":"year"},"value":{"kind":"Variable","name":{"kind":"Name","value":"year"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalIncome"}},{"kind":"Field","name":{"kind":"Name","value":"totalExpenses"}},{"kind":"Field","name":{"kind":"Name","value":"savings"}},{"kind":"Field","name":{"kind":"Name","value":"categoryBreakdown"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"series"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"budget"}},{"kind":"Field","name":{"kind":"Name","value":"actual"}}]}}]}}]}}]} as unknown as DocumentNode<DashboardMonthlyReviewQuery, DashboardMonthlyReviewQueryVariables>;
export const DashboardRecentTransactionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DashboardRecentTransactions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filters"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TransactionsFilter"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filters"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filters"}}},{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transactionId"}},{"kind":"Field","name":{"kind":"Name","value":"txnDate"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"credit"}},{"kind":"Field","name":{"kind":"Name","value":"debit"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"taggedBy"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cursor"}}]}}]}}]} as unknown as DocumentNode<DashboardRecentTransactionsQuery, DashboardRecentTransactionsQueryVariables>;
export const ForecastMonthDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ForecastMonth"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"year"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"month"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"options"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ForecastOptionsInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"forecastMonth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"year"},"value":{"kind":"Variable","name":{"kind":"Name","value":"year"}}},{"kind":"Argument","name":{"kind":"Name","value":"month"},"value":{"kind":"Variable","name":{"kind":"Name","value":"month"}}},{"kind":"Argument","name":{"kind":"Name","value":"options"},"value":{"kind":"Variable","name":{"kind":"Name","value":"options"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"month"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"startingBalance"}},{"kind":"Field","name":{"kind":"Name","value":"endingBalance"}},{"kind":"Field","name":{"kind":"Name","value":"days"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"inflow"}},{"kind":"Field","name":{"kind":"Name","value":"outflow"}},{"kind":"Field","name":{"kind":"Name","value":"net"}},{"kind":"Field","name":{"kind":"Name","value":"runningBalance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"alerts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"severity"}}]}}]}}]}}]} as unknown as DocumentNode<ForecastMonthQuery, ForecastMonthQueryVariables>;
export const SavingsGoalsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SavingsGoals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"savingsGoals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"current"}},{"kind":"Field","name":{"kind":"Name","value":"deadline"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]} as unknown as DocumentNode<SavingsGoalsQuery, SavingsGoalsQueryVariables>;
export const CreateGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSavingsGoalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSavingsGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"current"}},{"kind":"Field","name":{"kind":"Name","value":"deadline"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]} as unknown as DocumentNode<CreateGoalMutation, CreateGoalMutationVariables>;
export const ContributeGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ContributeGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ContributeSavingsGoalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributeSavingsGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"current"}},{"kind":"Field","name":{"kind":"Name","value":"deadline"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]} as unknown as DocumentNode<ContributeGoalMutation, ContributeGoalMutationVariables>;
export const UpdateGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSavingsGoalInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSavingsGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"current"}},{"kind":"Field","name":{"kind":"Name","value":"deadline"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateGoalMutation, UpdateGoalMutationVariables>;
export const DeleteGoalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteGoal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSavingsGoal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteGoalMutation, DeleteGoalMutationVariables>;
export const RecurringTransactionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RecurringTransactions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recurringTransactions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfMonth"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"nextRunDate"}}]}}]}}]} as unknown as DocumentNode<RecurringTransactionsQuery, RecurringTransactionsQueryVariables>;
export const CreateRecurringDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRecurring"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateRecurringTransactionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRecurringTransaction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"frequency"}},{"kind":"Field","name":{"kind":"Name","value":"dayOfMonth"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"nextRunDate"}}]}}]}}]} as unknown as DocumentNode<CreateRecurringMutation, CreateRecurringMutationVariables>;
export const GenerateRecurringDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateRecurring"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"month"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"year"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateRecurringTransactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"month"},"value":{"kind":"Variable","name":{"kind":"Name","value":"month"}}},{"kind":"Argument","name":{"kind":"Name","value":"year"},"value":{"kind":"Variable","name":{"kind":"Name","value":"year"}}}]}]}}]} as unknown as DocumentNode<GenerateRecurringMutation, GenerateRecurringMutationVariables>;
export const SinkingFundsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SinkingFunds"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sinkingFunds"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"current"}},{"kind":"Field","name":{"kind":"Name","value":"monthlyContribution"}},{"kind":"Field","name":{"kind":"Name","value":"deadline"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]} as unknown as DocumentNode<SinkingFundsQuery, SinkingFundsQueryVariables>;
export const CreateSinkingFundDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSinkingFund"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSinkingFundInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSinkingFund"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"current"}},{"kind":"Field","name":{"kind":"Name","value":"monthlyContribution"}},{"kind":"Field","name":{"kind":"Name","value":"deadline"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]} as unknown as DocumentNode<CreateSinkingFundMutation, CreateSinkingFundMutationVariables>;
export const ContributeSinkingFundDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ContributeSinkingFund"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ContributeSinkingFundInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributeSinkingFund"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"current"}},{"kind":"Field","name":{"kind":"Name","value":"monthlyContribution"}},{"kind":"Field","name":{"kind":"Name","value":"deadline"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]} as unknown as DocumentNode<ContributeSinkingFundMutation, ContributeSinkingFundMutationVariables>;
export const UpdateSinkingFundDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSinkingFund"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSinkingFundInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSinkingFund"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"target"}},{"kind":"Field","name":{"kind":"Name","value":"current"}},{"kind":"Field","name":{"kind":"Name","value":"monthlyContribution"}},{"kind":"Field","name":{"kind":"Name","value":"deadline"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateSinkingFundMutation, UpdateSinkingFundMutationVariables>;
export const DeleteSinkingFundDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSinkingFund"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSinkingFund"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteSinkingFundMutation, DeleteSinkingFundMutationVariables>;
export const TransactionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Transactions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filters"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TransactionsFilter"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filters"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filters"}}},{"kind":"Argument","name":{"kind":"Name","value":"cursor"},"value":{"kind":"Variable","name":{"kind":"Name","value":"cursor"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"transactionId"}},{"kind":"Field","name":{"kind":"Name","value":"bankName"}},{"kind":"Field","name":{"kind":"Name","value":"txnDate"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"credit"}},{"kind":"Field","name":{"kind":"Name","value":"debit"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"taggedBy"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cursor"}}]}}]}}]} as unknown as DocumentNode<TransactionsQuery, TransactionsQueryVariables>;
export const CategoriesByBaseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CategoriesByBase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"categoriesByBase"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"base"}},{"kind":"Field","name":{"kind":"Name","value":"categories"}}]}}]}}]} as unknown as DocumentNode<CategoriesByBaseQuery, CategoriesByBaseQueryVariables>;
export const ReclassifyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Reclassify"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"category"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reclassifyTransaction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"category"},"value":{"kind":"Variable","name":{"kind":"Name","value":"category"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"taggedBy"}}]}}]}}]} as unknown as DocumentNode<ReclassifyMutation, ReclassifyMutationVariables>;
export const CreateUploadUrlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateUploadUrl"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateUploadUrlInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createUploadUrl"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"uploadUrl"}},{"kind":"Field","name":{"kind":"Name","value":"expiresInSeconds"}}]}}]}}]} as unknown as DocumentNode<CreateUploadUrlMutation, CreateUploadUrlMutationVariables>;
export const NotifyUploadCompleteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"NotifyUploadComplete"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"jobId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"notifyUploadComplete"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"jobId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"jobId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"accepted"}},{"kind":"Field","name":{"kind":"Name","value":"warnings"}}]}}]}}]} as unknown as DocumentNode<NotifyUploadCompleteMutation, NotifyUploadCompleteMutationVariables>;