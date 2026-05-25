import { graphql } from "@api-client";

export const RecurringTransactionsDocument = graphql(`
  query RecurringTransactions {
    recurringTransactions {
      id
      description
      amount
      category
      type
      frequency
      dayOfMonth
      startDate
      nextRunDate
    }
  }
`);

export const CreateRecurringDocument = graphql(`
  mutation CreateRecurring($input: CreateRecurringTransactionInput!) {
    createRecurringTransaction(input: $input) {
      id
      description
      amount
      category
      type
      frequency
      dayOfMonth
      startDate
      nextRunDate
    }
  }
`);

export const GenerateRecurringDocument = graphql(`
  mutation GenerateRecurring($month: Int!, $year: Int!) {
    generateRecurringTransactions(month: $month, year: $year)
  }
`);
