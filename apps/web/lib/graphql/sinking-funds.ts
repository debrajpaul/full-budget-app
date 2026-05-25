import { graphql } from "@api-client";

export const SinkingFundsDocument = graphql(`
  query SinkingFunds {
    sinkingFunds {
      id
      name
      target
      current
      monthlyContribution
      deadline
      history {
        date
        value
      }
    }
  }
`);

export const CreateSinkingFundDocument = graphql(`
  mutation CreateSinkingFund($input: CreateSinkingFundInput!) {
    createSinkingFund(input: $input) {
      id
      name
      target
      current
      monthlyContribution
      deadline
      history {
        date
        value
      }
    }
  }
`);

export const ContributeSinkingFundDocument = graphql(`
  mutation ContributeSinkingFund($input: ContributeSinkingFundInput!) {
    contributeSinkingFund(input: $input) {
      id
      name
      target
      current
      monthlyContribution
      deadline
      history {
        date
        value
      }
    }
  }
`);

export const UpdateSinkingFundDocument = graphql(`
  mutation UpdateSinkingFund($id: ID!, $input: UpdateSinkingFundInput!) {
    updateSinkingFund(id: $id, input: $input) {
      id
      name
      target
      current
      monthlyContribution
      deadline
      history {
        date
        value
      }
    }
  }
`);

export const DeleteSinkingFundDocument = graphql(`
  mutation DeleteSinkingFund($id: ID!) {
    deleteSinkingFund(id: $id)
  }
`);
