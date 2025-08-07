import { SbiBankParser } from "./sbi";
import { EBankName } from "@common";

describe("SbiBankParser", () => {
  const parser = new SbiBankParser();
  const userId = "user123";

  const validCsv = [
    "Txn Date,Description,Debit,Credit,Balance",
    "01/08/2025,Salary,,10000,10000",
    "02/08/2025,ATM Withdrawal,500,,9500",
    "03/08/2025,Shopping,1500,,8000",
    "04/08/2025,Interest,,50,8050",
  ].join("\n");

  it("should parse valid SBI CSV and return transactions", async () => {
    const buffer = Buffer.from(validCsv, "utf-8");
    const txns = await parser.parse(buffer, userId);
    expect(txns.length).toBe(4);
    expect(txns[0]).toMatchObject({
      userId,
      bankName: EBankName.sbi,
      amount: 10000,
      txnDate: "2025-08-01",
      balance: 10000,
      description: "Salary",
    });
    expect(txns[1].amount).toBe(-500);
    expect(txns[3].amount).toBe(50);
  });

  it("should throw error if header not found", async () => {
    const buffer = Buffer.from("No header here\nSome random text", "utf-8");
    await expect(parser.parse(buffer, userId)).rejects.toThrow(
      "Could not find valid header row in SBI CSV.",
    );
  });

  it("should skip rows with missing date or balance", async () => {
    const csv = [
      "Txn Date,Description,Debit,Credit,Balance",
      ",MissingDate,100,,1000",
      "05/08/2025,Valid,100,,900",
      "06/08/2025,NoBalance,100,,",
    ].join("\n");
    const buffer = Buffer.from(csv, "utf-8");
    const txns = await parser.parse(buffer, userId);
    expect(txns.length).toBe(1);
    expect(txns[0].txnDate).toBe("2025-08-05");
  });

  it("should format dd/mm/yyyy date", () => {
    expect(parser["formatDate"]("07/08/2025")).toBe("2025-08-07");
  });

  it("should format '2 Apr 2024' date", () => {
    expect(parser["formatDate"]("2 Apr 2024")).toBe("2024-04-02");
  });

  it("should return undefined for invalid date", () => {
    expect(parser["formatDate"]("notadate")).toBeUndefined();
  });
});
