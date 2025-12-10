import { SbiBankParser } from "./sbi";
import { EBankName, EBankType } from "@common";

describe("SbiBankParser", () => {
  const parser = new SbiBankParser();
  const userId = "user123";

  const validCsv = [
    "Some heading,SBI Statement,Random,Text",
    "Txn Date, Description ,Debit,Credit,Balance",
    "01/08/2025,Salary,,10000.45,10000.45",
    "02/08/2025,ATM Withdrawal,500,,9500.45",
    "03/08/2025,Shopping,1500,,8000.45",
    "04/08/2025,Interest,,50,8050.45",
    "Account statement generated on 05/08/2025",
  ].join("\n");

  it("should parse valid SBI CSV and return transactions", async () => {
    const buffer = Buffer.from(validCsv, "utf-8");
    const txns = await parser.parse(buffer, userId);
    expect(txns).toHaveLength(4);
    expect(txns[0]).toMatchObject({
      userId,
      bankName: EBankName.sbi,
      bankType: EBankType.savings,
      credit: 10000.45,
      debit: 0,
      txnDate: "2025-08-01",
      balance: 10000.45,
      description: "Salary",
    });
    expect(txns[1]).toMatchObject({
      debit: 500,
      credit: 0,
      txnDate: "2025-08-02",
    });
    expect(txns[3]).toMatchObject({
      credit: 50,
      debit: 0,
      txnDate: "2025-08-04",
    });
    expect(new Set(txns.map((t) => t.transactionId)).size).toBe(txns.length);
  });

  it("should throw error if header not found", async () => {
    const buffer = Buffer.from("No header here\nSome random text", "utf-8");
    await expect(parser.parse(buffer, userId)).rejects.toThrow(
      "Could not find valid header row in SBI CSV."
    );
  });

  it("should skip rows with missing date or balance", async () => {
    const csv = [
      "Txn Date,Description,Debit,Credit,Balance",
      ",MissingDate,100,,1000",
      "05/08/2025,Valid Debit,100,,900",
      "06/08/2025,InvalidBalance,100,,NaNValue",
      "07/08/2025,Valid Credit,,250,1200",
    ].join("\n");
    const buffer = Buffer.from(csv, "utf-8");
    const txns = await parser.parse(buffer, userId);
    expect(txns).toHaveLength(2);
    expect(txns[0]).toMatchObject({
      txnDate: "2025-08-05",
      debit: 100,
      credit: 0,
    });
    expect(txns[1]).toMatchObject({
      txnDate: "2025-08-07",
      debit: 0,
      credit: 250,
    });
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
