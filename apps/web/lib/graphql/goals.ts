import { graphql } from "@app/api-client";

export const SavingsGoalsDocument = graphql(`
  query SavingsGoals {
    savingsGoals {
      id
      name
      target
      current
      deadline
      history {
        date
        value
      }
    }
  }
`);

export const CreateGoalDocument = graphql(`
  mutation CreateGoal($input: CreateSavingsGoalInput!) {
    createSavingsGoal(input: $input) {
      id
      name
      target
      current
      deadline
      history {
        date
        value
      }
    }
  }
`);

export const ContributeGoalDocument = graphql(`
  mutation ContributeGoal($input: ContributeSavingsGoalInput!) {
    contributeSavingsGoal(input: $input) {
      id
      name
      target
      current
      deadline
      history {
        date
        value
      }
    }
  }
`);

export const UpdateGoalDocument = graphql(`
  mutation UpdateGoal($id: ID!, $input: UpdateSavingsGoalInput!) {
    updateSavingsGoal(id: $id, input: $input) {
      id
      name
      target
      current
      deadline
      history {
        date
        value
      }
    }
  }
`);

export const DeleteGoalDocument = graphql(`
  mutation DeleteGoal($id: ID!) {
    deleteSavingsGoal(id: $id)
  }
`);
