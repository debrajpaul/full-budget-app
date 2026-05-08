export interface ISavingsHistoryPoint {
  date: string;
  value: number;
}

export interface ISavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  history: ISavingsHistoryPoint[];
}

export interface ICreateSavingsGoalInput {
  name: string;
  target: number;
  deadline: string;
  initialAmount?: number;
}

export interface IUpdateSavingsGoalInput {
  name?: string;
  target?: number;
  deadline?: string;
}

export interface IContributeSavingsGoalInput {
  id: string;
  amount: number;
}
