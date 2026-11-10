/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query Budgets($period: PeriodInput!) {\n    budgets(period: $period) {\n      id\n      month\n      year\n      category\n      amount\n    }\n  }\n": typeof types.BudgetsDocument,
    "\n  query MonthlyReviewForBudgets($month: Int!, $year: Int!) {\n    monthlyReview(month: $month, year: $year) {\n      categoryBreakdown {\n        name\n        amount\n      }\n    }\n  }\n": typeof types.MonthlyReviewForBudgetsDocument,
    "\n  mutation SetBudget(\n    $period: PeriodInput!\n    $category: String!\n    $amount: Float!\n  ) {\n    setBudget(period: $period, category: $category, amount: $amount) {\n      id\n      month\n      year\n      category\n      amount\n    }\n  }\n": typeof types.SetBudgetDocument,
    "\n  query DashboardMonthlyReview($month: Int!, $year: Int!) {\n    monthlyReview(month: $month, year: $year) {\n      totalIncome\n      totalExpenses\n      savings\n      categoryBreakdown {\n        name\n        amount\n      }\n      series {\n        date\n        budget\n        actual\n      }\n    }\n  }\n": typeof types.DashboardMonthlyReviewDocument,
    "\n  query DashboardRecentTransactions(\n    $filters: TransactionsFilter!\n    $cursor: String\n  ) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n      }\n      cursor\n    }\n  }\n": typeof types.DashboardRecentTransactionsDocument,
    "\n  query DashboardSegmentation($period: PeriodInput!) {\n    budgetSegmentation(period: $period) {\n      month\n      year\n      totalIncome\n      unsegmentedExpenses\n      unclassified\n      segments {\n        segment\n        actual\n        percentOfIncome\n        targetPercent\n        targetAmount\n        variance\n        status\n      }\n    }\n  }\n": typeof types.DashboardSegmentationDocument,
    "\n  query ForecastMonth(\n    $year: Int!\n    $month: Int!\n    $options: ForecastOptionsInput\n  ) {\n    forecastMonth(year: $year, month: $month, options: $options) {\n      month\n      year\n      startingBalance\n      endingBalance\n      days {\n        date\n        inflow\n        outflow\n        net\n        runningBalance\n      }\n      alerts {\n        date\n        type\n        message\n        severity\n      }\n    }\n  }\n": typeof types.ForecastMonthDocument,
    "\n  query SavingsGoals {\n    savingsGoals {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": typeof types.SavingsGoalsDocument,
    "\n  mutation CreateGoal($input: CreateSavingsGoalInput!) {\n    createSavingsGoal(input: $input) {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": typeof types.CreateGoalDocument,
    "\n  mutation ContributeGoal($input: ContributeSavingsGoalInput!) {\n    contributeSavingsGoal(input: $input) {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": typeof types.ContributeGoalDocument,
    "\n  mutation UpdateGoal($id: ID!, $input: UpdateSavingsGoalInput!) {\n    updateSavingsGoal(id: $id, input: $input) {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": typeof types.UpdateGoalDocument,
    "\n  mutation DeleteGoal($id: ID!) {\n    deleteSavingsGoal(id: $id)\n  }\n": typeof types.DeleteGoalDocument,
    "\n  query RecurringTransactions {\n    recurringTransactions {\n      id\n      description\n      amount\n      category\n      type\n      frequency\n      dayOfMonth\n      startDate\n      nextRunDate\n    }\n  }\n": typeof types.RecurringTransactionsDocument,
    "\n  mutation CreateRecurring($input: CreateRecurringTransactionInput!) {\n    createRecurringTransaction(input: $input) {\n      id\n      description\n      amount\n      category\n      type\n      frequency\n      dayOfMonth\n      startDate\n      nextRunDate\n    }\n  }\n": typeof types.CreateRecurringDocument,
    "\n  mutation GenerateRecurring($month: Int!, $year: Int!) {\n    generateRecurringTransactions(month: $month, year: $year)\n  }\n": typeof types.GenerateRecurringDocument,
    "\n  query SinkingFunds {\n    sinkingFunds {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": typeof types.SinkingFundsDocument,
    "\n  mutation CreateSinkingFund($input: CreateSinkingFundInput!) {\n    createSinkingFund(input: $input) {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": typeof types.CreateSinkingFundDocument,
    "\n  mutation ContributeSinkingFund($input: ContributeSinkingFundInput!) {\n    contributeSinkingFund(input: $input) {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": typeof types.ContributeSinkingFundDocument,
    "\n  mutation UpdateSinkingFund($id: ID!, $input: UpdateSinkingFundInput!) {\n    updateSinkingFund(id: $id, input: $input) {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": typeof types.UpdateSinkingFundDocument,
    "\n  mutation DeleteSinkingFund($id: ID!) {\n    deleteSinkingFund(id: $id)\n  }\n": typeof types.DeleteSinkingFundDocument,
    "\n  query Transactions($filters: TransactionsFilter!, $cursor: String) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        bankName\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n        confidence\n      }\n      cursor\n    }\n  }\n": typeof types.TransactionsDocument,
    "\n  query CategoriesByBase {\n    categoriesByBase {\n      base\n      categories\n    }\n  }\n": typeof types.CategoriesByBaseDocument,
    "\n  mutation Reclassify($id: String!, $category: String!) {\n    reclassifyTransaction(id: $id, category: $category) {\n      id\n      category\n      taggedBy\n    }\n  }\n": typeof types.ReclassifyDocument,
    "\n  mutation CreateUploadUrl($input: CreateUploadUrlInput!) {\n    createUploadUrl(input: $input) {\n      jobId\n      uploadUrl\n      expiresInSeconds\n    }\n  }\n": typeof types.CreateUploadUrlDocument,
    "\n  mutation NotifyUploadComplete($jobId: String!) {\n    notifyUploadComplete(jobId: $jobId) {\n      jobId\n      accepted\n      warnings\n    }\n  }\n": typeof types.NotifyUploadCompleteDocument,
};
const documents: Documents = {
    "\n  query Budgets($period: PeriodInput!) {\n    budgets(period: $period) {\n      id\n      month\n      year\n      category\n      amount\n    }\n  }\n": types.BudgetsDocument,
    "\n  query MonthlyReviewForBudgets($month: Int!, $year: Int!) {\n    monthlyReview(month: $month, year: $year) {\n      categoryBreakdown {\n        name\n        amount\n      }\n    }\n  }\n": types.MonthlyReviewForBudgetsDocument,
    "\n  mutation SetBudget(\n    $period: PeriodInput!\n    $category: String!\n    $amount: Float!\n  ) {\n    setBudget(period: $period, category: $category, amount: $amount) {\n      id\n      month\n      year\n      category\n      amount\n    }\n  }\n": types.SetBudgetDocument,
    "\n  query DashboardMonthlyReview($month: Int!, $year: Int!) {\n    monthlyReview(month: $month, year: $year) {\n      totalIncome\n      totalExpenses\n      savings\n      categoryBreakdown {\n        name\n        amount\n      }\n      series {\n        date\n        budget\n        actual\n      }\n    }\n  }\n": types.DashboardMonthlyReviewDocument,
    "\n  query DashboardRecentTransactions(\n    $filters: TransactionsFilter!\n    $cursor: String\n  ) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n      }\n      cursor\n    }\n  }\n": types.DashboardRecentTransactionsDocument,
    "\n  query DashboardSegmentation($period: PeriodInput!) {\n    budgetSegmentation(period: $period) {\n      month\n      year\n      totalIncome\n      unsegmentedExpenses\n      unclassified\n      segments {\n        segment\n        actual\n        percentOfIncome\n        targetPercent\n        targetAmount\n        variance\n        status\n      }\n    }\n  }\n": types.DashboardSegmentationDocument,
    "\n  query ForecastMonth(\n    $year: Int!\n    $month: Int!\n    $options: ForecastOptionsInput\n  ) {\n    forecastMonth(year: $year, month: $month, options: $options) {\n      month\n      year\n      startingBalance\n      endingBalance\n      days {\n        date\n        inflow\n        outflow\n        net\n        runningBalance\n      }\n      alerts {\n        date\n        type\n        message\n        severity\n      }\n    }\n  }\n": types.ForecastMonthDocument,
    "\n  query SavingsGoals {\n    savingsGoals {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": types.SavingsGoalsDocument,
    "\n  mutation CreateGoal($input: CreateSavingsGoalInput!) {\n    createSavingsGoal(input: $input) {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": types.CreateGoalDocument,
    "\n  mutation ContributeGoal($input: ContributeSavingsGoalInput!) {\n    contributeSavingsGoal(input: $input) {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": types.ContributeGoalDocument,
    "\n  mutation UpdateGoal($id: ID!, $input: UpdateSavingsGoalInput!) {\n    updateSavingsGoal(id: $id, input: $input) {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": types.UpdateGoalDocument,
    "\n  mutation DeleteGoal($id: ID!) {\n    deleteSavingsGoal(id: $id)\n  }\n": types.DeleteGoalDocument,
    "\n  query RecurringTransactions {\n    recurringTransactions {\n      id\n      description\n      amount\n      category\n      type\n      frequency\n      dayOfMonth\n      startDate\n      nextRunDate\n    }\n  }\n": types.RecurringTransactionsDocument,
    "\n  mutation CreateRecurring($input: CreateRecurringTransactionInput!) {\n    createRecurringTransaction(input: $input) {\n      id\n      description\n      amount\n      category\n      type\n      frequency\n      dayOfMonth\n      startDate\n      nextRunDate\n    }\n  }\n": types.CreateRecurringDocument,
    "\n  mutation GenerateRecurring($month: Int!, $year: Int!) {\n    generateRecurringTransactions(month: $month, year: $year)\n  }\n": types.GenerateRecurringDocument,
    "\n  query SinkingFunds {\n    sinkingFunds {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": types.SinkingFundsDocument,
    "\n  mutation CreateSinkingFund($input: CreateSinkingFundInput!) {\n    createSinkingFund(input: $input) {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": types.CreateSinkingFundDocument,
    "\n  mutation ContributeSinkingFund($input: ContributeSinkingFundInput!) {\n    contributeSinkingFund(input: $input) {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": types.ContributeSinkingFundDocument,
    "\n  mutation UpdateSinkingFund($id: ID!, $input: UpdateSinkingFundInput!) {\n    updateSinkingFund(id: $id, input: $input) {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n": types.UpdateSinkingFundDocument,
    "\n  mutation DeleteSinkingFund($id: ID!) {\n    deleteSinkingFund(id: $id)\n  }\n": types.DeleteSinkingFundDocument,
    "\n  query Transactions($filters: TransactionsFilter!, $cursor: String) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        bankName\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n        confidence\n      }\n      cursor\n    }\n  }\n": types.TransactionsDocument,
    "\n  query CategoriesByBase {\n    categoriesByBase {\n      base\n      categories\n    }\n  }\n": types.CategoriesByBaseDocument,
    "\n  mutation Reclassify($id: String!, $category: String!) {\n    reclassifyTransaction(id: $id, category: $category) {\n      id\n      category\n      taggedBy\n    }\n  }\n": types.ReclassifyDocument,
    "\n  mutation CreateUploadUrl($input: CreateUploadUrlInput!) {\n    createUploadUrl(input: $input) {\n      jobId\n      uploadUrl\n      expiresInSeconds\n    }\n  }\n": types.CreateUploadUrlDocument,
    "\n  mutation NotifyUploadComplete($jobId: String!) {\n    notifyUploadComplete(jobId: $jobId) {\n      jobId\n      accepted\n      warnings\n    }\n  }\n": types.NotifyUploadCompleteDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Budgets($period: PeriodInput!) {\n    budgets(period: $period) {\n      id\n      month\n      year\n      category\n      amount\n    }\n  }\n"): (typeof documents)["\n  query Budgets($period: PeriodInput!) {\n    budgets(period: $period) {\n      id\n      month\n      year\n      category\n      amount\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MonthlyReviewForBudgets($month: Int!, $year: Int!) {\n    monthlyReview(month: $month, year: $year) {\n      categoryBreakdown {\n        name\n        amount\n      }\n    }\n  }\n"): (typeof documents)["\n  query MonthlyReviewForBudgets($month: Int!, $year: Int!) {\n    monthlyReview(month: $month, year: $year) {\n      categoryBreakdown {\n        name\n        amount\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetBudget(\n    $period: PeriodInput!\n    $category: String!\n    $amount: Float!\n  ) {\n    setBudget(period: $period, category: $category, amount: $amount) {\n      id\n      month\n      year\n      category\n      amount\n    }\n  }\n"): (typeof documents)["\n  mutation SetBudget(\n    $period: PeriodInput!\n    $category: String!\n    $amount: Float!\n  ) {\n    setBudget(period: $period, category: $category, amount: $amount) {\n      id\n      month\n      year\n      category\n      amount\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DashboardMonthlyReview($month: Int!, $year: Int!) {\n    monthlyReview(month: $month, year: $year) {\n      totalIncome\n      totalExpenses\n      savings\n      categoryBreakdown {\n        name\n        amount\n      }\n      series {\n        date\n        budget\n        actual\n      }\n    }\n  }\n"): (typeof documents)["\n  query DashboardMonthlyReview($month: Int!, $year: Int!) {\n    monthlyReview(month: $month, year: $year) {\n      totalIncome\n      totalExpenses\n      savings\n      categoryBreakdown {\n        name\n        amount\n      }\n      series {\n        date\n        budget\n        actual\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DashboardRecentTransactions(\n    $filters: TransactionsFilter!\n    $cursor: String\n  ) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n      }\n      cursor\n    }\n  }\n"): (typeof documents)["\n  query DashboardRecentTransactions(\n    $filters: TransactionsFilter!\n    $cursor: String\n  ) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n      }\n      cursor\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DashboardSegmentation($period: PeriodInput!) {\n    budgetSegmentation(period: $period) {\n      month\n      year\n      totalIncome\n      unsegmentedExpenses\n      unclassified\n      segments {\n        segment\n        actual\n        percentOfIncome\n        targetPercent\n        targetAmount\n        variance\n        status\n      }\n    }\n  }\n"): (typeof documents)["\n  query DashboardSegmentation($period: PeriodInput!) {\n    budgetSegmentation(period: $period) {\n      month\n      year\n      totalIncome\n      unsegmentedExpenses\n      unclassified\n      segments {\n        segment\n        actual\n        percentOfIncome\n        targetPercent\n        targetAmount\n        variance\n        status\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ForecastMonth(\n    $year: Int!\n    $month: Int!\n    $options: ForecastOptionsInput\n  ) {\n    forecastMonth(year: $year, month: $month, options: $options) {\n      month\n      year\n      startingBalance\n      endingBalance\n      days {\n        date\n        inflow\n        outflow\n        net\n        runningBalance\n      }\n      alerts {\n        date\n        type\n        message\n        severity\n      }\n    }\n  }\n"): (typeof documents)["\n  query ForecastMonth(\n    $year: Int!\n    $month: Int!\n    $options: ForecastOptionsInput\n  ) {\n    forecastMonth(year: $year, month: $month, options: $options) {\n      month\n      year\n      startingBalance\n      endingBalance\n      days {\n        date\n        inflow\n        outflow\n        net\n        runningBalance\n      }\n      alerts {\n        date\n        type\n        message\n        severity\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SavingsGoals {\n    savingsGoals {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"): (typeof documents)["\n  query SavingsGoals {\n    savingsGoals {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateGoal($input: CreateSavingsGoalInput!) {\n    createSavingsGoal(input: $input) {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateGoal($input: CreateSavingsGoalInput!) {\n    createSavingsGoal(input: $input) {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ContributeGoal($input: ContributeSavingsGoalInput!) {\n    contributeSavingsGoal(input: $input) {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ContributeGoal($input: ContributeSavingsGoalInput!) {\n    contributeSavingsGoal(input: $input) {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateGoal($id: ID!, $input: UpdateSavingsGoalInput!) {\n    updateSavingsGoal(id: $id, input: $input) {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateGoal($id: ID!, $input: UpdateSavingsGoalInput!) {\n    updateSavingsGoal(id: $id, input: $input) {\n      id\n      name\n      target\n      current\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteGoal($id: ID!) {\n    deleteSavingsGoal(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteGoal($id: ID!) {\n    deleteSavingsGoal(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RecurringTransactions {\n    recurringTransactions {\n      id\n      description\n      amount\n      category\n      type\n      frequency\n      dayOfMonth\n      startDate\n      nextRunDate\n    }\n  }\n"): (typeof documents)["\n  query RecurringTransactions {\n    recurringTransactions {\n      id\n      description\n      amount\n      category\n      type\n      frequency\n      dayOfMonth\n      startDate\n      nextRunDate\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateRecurring($input: CreateRecurringTransactionInput!) {\n    createRecurringTransaction(input: $input) {\n      id\n      description\n      amount\n      category\n      type\n      frequency\n      dayOfMonth\n      startDate\n      nextRunDate\n    }\n  }\n"): (typeof documents)["\n  mutation CreateRecurring($input: CreateRecurringTransactionInput!) {\n    createRecurringTransaction(input: $input) {\n      id\n      description\n      amount\n      category\n      type\n      frequency\n      dayOfMonth\n      startDate\n      nextRunDate\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation GenerateRecurring($month: Int!, $year: Int!) {\n    generateRecurringTransactions(month: $month, year: $year)\n  }\n"): (typeof documents)["\n  mutation GenerateRecurring($month: Int!, $year: Int!) {\n    generateRecurringTransactions(month: $month, year: $year)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SinkingFunds {\n    sinkingFunds {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"): (typeof documents)["\n  query SinkingFunds {\n    sinkingFunds {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateSinkingFund($input: CreateSinkingFundInput!) {\n    createSinkingFund(input: $input) {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateSinkingFund($input: CreateSinkingFundInput!) {\n    createSinkingFund(input: $input) {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ContributeSinkingFund($input: ContributeSinkingFundInput!) {\n    contributeSinkingFund(input: $input) {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ContributeSinkingFund($input: ContributeSinkingFundInput!) {\n    contributeSinkingFund(input: $input) {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateSinkingFund($id: ID!, $input: UpdateSinkingFundInput!) {\n    updateSinkingFund(id: $id, input: $input) {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdateSinkingFund($id: ID!, $input: UpdateSinkingFundInput!) {\n    updateSinkingFund(id: $id, input: $input) {\n      id\n      name\n      target\n      current\n      monthlyContribution\n      deadline\n      history {\n        date\n        value\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteSinkingFund($id: ID!) {\n    deleteSinkingFund(id: $id)\n  }\n"): (typeof documents)["\n  mutation DeleteSinkingFund($id: ID!) {\n    deleteSinkingFund(id: $id)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Transactions($filters: TransactionsFilter!, $cursor: String) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        bankName\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n        confidence\n      }\n      cursor\n    }\n  }\n"): (typeof documents)["\n  query Transactions($filters: TransactionsFilter!, $cursor: String) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        bankName\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n        confidence\n      }\n      cursor\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CategoriesByBase {\n    categoriesByBase {\n      base\n      categories\n    }\n  }\n"): (typeof documents)["\n  query CategoriesByBase {\n    categoriesByBase {\n      base\n      categories\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Reclassify($id: String!, $category: String!) {\n    reclassifyTransaction(id: $id, category: $category) {\n      id\n      category\n      taggedBy\n    }\n  }\n"): (typeof documents)["\n  mutation Reclassify($id: String!, $category: String!) {\n    reclassifyTransaction(id: $id, category: $category) {\n      id\n      category\n      taggedBy\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateUploadUrl($input: CreateUploadUrlInput!) {\n    createUploadUrl(input: $input) {\n      jobId\n      uploadUrl\n      expiresInSeconds\n    }\n  }\n"): (typeof documents)["\n  mutation CreateUploadUrl($input: CreateUploadUrlInput!) {\n    createUploadUrl(input: $input) {\n      jobId\n      uploadUrl\n      expiresInSeconds\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation NotifyUploadComplete($jobId: String!) {\n    notifyUploadComplete(jobId: $jobId) {\n      jobId\n      accepted\n      warnings\n    }\n  }\n"): (typeof documents)["\n  mutation NotifyUploadComplete($jobId: String!) {\n    notifyUploadComplete(jobId: $jobId) {\n      jobId\n      accepted\n      warnings\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;