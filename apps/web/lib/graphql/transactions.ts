import { graphql } from "@api-client";

export const TransactionsDocument = graphql(`
  query Transactions($filters: TransactionsFilter!, $cursor: String) {
    transactions(filters: $filters, cursor: $cursor) {
      items {
        transactionId
        bankName
        txnDate
        description
        credit
        debit
        category
        taggedBy
        confidence
      }
      cursor
    }
  }
`);

export const CategoriesByBaseDocument = graphql(`
  query CategoriesByBase {
    categoriesByBase {
      base
      categories
    }
  }
`);

export const ReclassifyDocument = graphql(`
  mutation Reclassify($id: String!, $category: String!) {
    reclassifyTransaction(id: $id, category: $category) {
      id
      category
      taggedBy
    }
  }
`);
