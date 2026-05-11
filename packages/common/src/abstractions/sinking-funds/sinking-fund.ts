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

export interface ICreateSinkingFundInput {
  name: string;
  target: number;
  monthlyContribution?: number;
  deadline?: string;
}

export interface IUpdateSinkingFundInput {
  name?: string;
  target?: number;
  monthlyContribution?: number;
  deadline?: string;
}
