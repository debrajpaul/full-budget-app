import { HdfcBankParser } from "./hdfc";
import { EBankName } from "@common";

describe("HdfcBankParser", () => {
  const parser = new HdfcBankParser();
  const userId = "user456";

  const validCsv = [
    "Date,Narration,Withdrawal Amt.,Deposit Amt.,Closing Balance",
    "01/08/25,Salary,,10000,10000",
    "02/08/25,ATM Withdrawal,500,,9500",
    "03/08/25,Shopping,1500,,8000",
    "04/08/25,Interest,,50,8050",
  ].join("\n");

  it("should parse valid HDFC CSV and return transactions", async () => {
    const buffer = Buffer.from(validCsv, "utf-8");
    const txns = await parser.parse(buffer, userId);
    expect(txns.length).toBe(4);
    expect(txns[0]).toMatchObject({
      userId,
      bankName: EBankName.hdfc,
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
      "### Could not find valid CSV header in HDFC file.",
    );
  });

  it("should skip rows with missing date or balance", async () => {
    const csv = [
      "Date,Narration,Withdrawal Amt.,Deposit Amt.,Closing Balance",
      ",MissingDate,100,,1000",
      "05/08/25,Valid,100,,900",
      "06/08/25,NoBalance,100,,900",
    ].join("\n");
    const buffer = Buffer.from(csv, "utf-8");
    const txns = await parser.parse(buffer, userId);
    expect(txns.length).toBe(2);
    expect(txns[0].txnDate).toBe("2025-08-05");
    expect(txns[1].txnDate).toBe("2025-08-06");
  });

  it("should skip junk description rows", async () => {
    const csv = [
      "Date,Narration,Withdrawal Amt.,Deposit Amt.,Closing Balance",
      "07/08/25,Generated On,,,",
      "08/08/25,Statement,,,",
      "09/08/25,Page No,,,",
      "10/08/25,Valid,100,,900",
    ].join("\n");
    const buffer = Buffer.from(csv, "utf-8");
    const txns = await parser.parse(buffer, userId);
    expect(txns.length).toBe(1);
    expect(txns[0].txnDate).toBe("2025-08-10");
  });

  it("should format dd/mm/yy date as yyyy-mm-dd", () => {
    expect(parser["formatDate"]("07/08/25")).toBe("2025-08-07");
    expect(parser["formatDate"]("07/08/99")).toBe("1999-08-07");
    expect(parser["formatDate"]("07/08/2025")).toBe("2025-08-07");
  });

  it("should return undefined for invalid date", () => {
    expect(parser["formatDate"]("notadate")).toBeUndefined();
    expect(parser["formatDate"]("07/08")).toBeUndefined();
  });
});
