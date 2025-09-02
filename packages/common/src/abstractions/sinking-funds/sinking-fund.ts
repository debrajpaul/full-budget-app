export interface ISinkingFundHistoryPoint {
  date: string;
  value: number;
}

export interface ISinkingFund {
  id: string;
  name: string;
  target: number;
  current: number;
  monthlyContribution?: number;
  deadline?: string;
  history: ISinkingFundHistoryPoint[];
}
