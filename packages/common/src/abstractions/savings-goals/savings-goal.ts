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