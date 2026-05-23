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
    "\n  query DashboardMonthlyReview($month: Int!, $year: Int!) {\n    monthlyReview(month: $month, year: $year) {\n      totalIncome\n      totalExpenses\n      savings\n      categoryBreakdown {\n        name\n        amount\n      }\n      series {\n        date\n        budget\n        actual\n      }\n    }\n  }\n": typeof types.DashboardMonthlyReviewDocument,
    "\n  query DashboardRecentTransactions(\n    $filters: TransactionsFilter!\n    $cursor: String\n  ) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n      }\n      cursor\n    }\n  }\n": typeof types.DashboardRecentTransactionsDocument,
    "\n  query Transactions($filters: TransactionsFilter!, $cursor: String) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        bankName\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n        confidence\n      }\n      cursor\n    }\n  }\n": typeof types.TransactionsDocument,
    "\n  query CategoriesByBase {\n    categoriesByBase {\n      base\n      categories\n    }\n  }\n": typeof types.CategoriesByBaseDocument,
    "\n  mutation Reclassify($id: String!, $category: String!) {\n    reclassifyTransaction(id: $id, category: $category) {\n      id\n      category\n      taggedBy\n    }\n  }\n": typeof types.ReclassifyDocument,
};
const documents: Documents = {
    "\n  query DashboardMonthlyReview($month: Int!, $year: Int!) {\n    monthlyReview(month: $month, year: $year) {\n      totalIncome\n      totalExpenses\n      savings\n      categoryBreakdown {\n        name\n        amount\n      }\n      series {\n        date\n        budget\n        actual\n      }\n    }\n  }\n": types.DashboardMonthlyReviewDocument,
    "\n  query DashboardRecentTransactions(\n    $filters: TransactionsFilter!\n    $cursor: String\n  ) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n      }\n      cursor\n    }\n  }\n": types.DashboardRecentTransactionsDocument,
    "\n  query Transactions($filters: TransactionsFilter!, $cursor: String) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        bankName\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n        confidence\n      }\n      cursor\n    }\n  }\n": types.TransactionsDocument,
    "\n  query CategoriesByBase {\n    categoriesByBase {\n      base\n      categories\n    }\n  }\n": types.CategoriesByBaseDocument,
    "\n  mutation Reclassify($id: String!, $category: String!) {\n    reclassifyTransaction(id: $id, category: $category) {\n      id\n      category\n      taggedBy\n    }\n  }\n": types.ReclassifyDocument,
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
export function graphql(source: "\n  query DashboardMonthlyReview($month: Int!, $year: Int!) {\n    monthlyReview(month: $month, year: $year) {\n      totalIncome\n      totalExpenses\n      savings\n      categoryBreakdown {\n        name\n        amount\n      }\n      series {\n        date\n        budget\n        actual\n      }\n    }\n  }\n"): (typeof documents)["\n  query DashboardMonthlyReview($month: Int!, $year: Int!) {\n    monthlyReview(month: $month, year: $year) {\n      totalIncome\n      totalExpenses\n      savings\n      categoryBreakdown {\n        name\n        amount\n      }\n      series {\n        date\n        budget\n        actual\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DashboardRecentTransactions(\n    $filters: TransactionsFilter!\n    $cursor: String\n  ) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n      }\n      cursor\n    }\n  }\n"): (typeof documents)["\n  query DashboardRecentTransactions(\n    $filters: TransactionsFilter!\n    $cursor: String\n  ) {\n    transactions(filters: $filters, cursor: $cursor) {\n      items {\n        transactionId\n        txnDate\n        description\n        credit\n        debit\n        category\n        taggedBy\n      }\n      cursor\n    }\n  }\n"];
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

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;