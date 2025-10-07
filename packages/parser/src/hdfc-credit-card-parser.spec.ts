import { HdfcCreditCardParser } from "./hdfc-credit-card-parser";
import { EBankName } from "@common";

describe("HdfcCreditCardParser", () => {
  const parser = new HdfcCreditCardParser();
  const userId = "user123";

  it("should parse valid HDFC credit card statement entries", async () => {
    const statement = [
      "Some heading line",
      "Transaction Type~Card Name~Transaction Date~Transaction Description~Amount~Credit/Debit",
      "Purchase~VISA Signature~12/08/25~Amazon Marketplace~3,200.50~Dr",
      "Refund~VISA Signature~13/08/25~Amazon Refund~400.00~Cr",
      "Cash~VISA Signature~14/08/2025~ATM Withdrawal~1,000.00~dr",
      "Opening Bal~9999",
      "Should not be parsed",
    ].join("\n");

    const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

    expect(txns).toHaveLength(3);
    expect(txns[0]).toMatchObject({
      userId,
      bankName: EBankName.hdfc,
      amount: -3200.5,
      txnDate: "2025-08-12",
      description: "Amazon Marketplace",
    });
    expect(txns[1]).toMatchObject({ amount: 400, txnDate: "2025-08-13" });
    expect(txns[2]).toMatchObject({ amount: -1000, txnDate: "2025-08-14" });
    expect(new Set(txns.map((t) => t.transactionId)).size).toBe(3);
  });

  it("should throw an error when the transaction header is missing", async () => {
    const content = [
      "Totally unrelated header",
      "Purchase~Something~12/08/25~Desc~100~Dr",
    ].join("\n");

    await expect(
      parser.parse(Buffer.from(content, "utf-8"), userId),
    ).rejects.toThrow(
      "Could not find transaction header in HDFC credit card statement.",
    );
  });

  it("should skip invalid rows and stop parsing after Opening Bal section", async () => {
    const statement = [
      "Transaction Type~Card Name~Transaction Date~Transaction Description~Amount~Credit/Debit",
      "BadDate~Card~13-08-25~Invalid Date~500.00~Dr",
      "ZeroAmount~Card~14/08/25~Zero Amount~0~Dr",
      "Valid~Card~15/08/25~Gym Membership~800.00~DR",
      "Opening Bal~This should stop parsing",
      "Valid~Card~16/08/25~Should Be Ignored~900.00~Dr",
    ].join("\n");

    const txns = await parser.parse(Buffer.from(statement, "utf-8"), userId);

    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ amount: -800, txnDate: "2025-08-15" });
  });

  it("should format dd/mm/yy and dd/mm/yyyy dates", () => {
    expect(parser["formatDate"]("01/09/25")).toBe("2025-09-01");
    expect(parser["formatDate"]("07/08/1999")).toBe("1999-08-07");
  });

  it("should return undefined for invalid date strings", () => {
    expect(parser["formatDate"]("invalid")).toBeUndefined();
    expect(parser["formatDate"]("01/09")).toBeUndefined();
  });
});
