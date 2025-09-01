import { EBaseCategories } from "@common";

export const keywordBaseCategoryMap: Record<string, EBaseCategories> = {
  zerodha: EBaseCategories.savings, // existing rule
  rtgs: EBaseCategories.income, // salary/credit transfer (RTGS CR)
  neft: EBaseCategories.income, // NEFT credit
  imps: EBaseCategories.expenses, // outbound IMPS transfers
  upi: EBaseCategories.expenses, // UPI payments (typically purchases)
  achdr: EBaseCategories.expenses, // auto‐debit (ACHDr) like credit‑card/loan
  achcr: EBaseCategories.income, // auto credit (ACHCr) such as dividend/interest
  ach: EBaseCategories.expenses, // generic ACH fallback
  billpay: EBaseCategories.expenses, // bill payments
  bill: EBaseCategories.expenses, // general bill pay indicator
  credit: EBaseCategories.income, // credit interest/dividend
  debit: EBaseCategories.expenses, // debit charges/service charges
  salary: EBaseCategories.income,
  bulk: EBaseCategories.income, // bulk posting (e.g., dividend)
  interest: EBaseCategories.income, // credit interest
  rd: EBaseCategories.savings, // recurring deposit/FD
  installment: EBaseCategories.savings, // RDInstallment or similar
  funds: EBaseCategories.expenses, // funds transfer (debit)
  transfer: EBaseCategories.expenses, // generic “transfer to”
  tpt: EBaseCategories.expenses, // third‐party transfer
  gst: EBaseCategories.expenses, // GST payments
  rent: EBaseCategories.expenses, // rent or maintenance
  investment: EBaseCategories.savings, // investment deposits
  utilities: EBaseCategories.expenses, // generic utilities (power, water etc.)
};
