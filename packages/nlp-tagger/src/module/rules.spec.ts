import { keywordBaseCategoryMap } from "./rules";
import { EBaseCategories } from "@common";

describe("keywordBaseCategoryMap", () => {
  it("maps base keywords to base categories", () => {
    expect(keywordBaseCategoryMap["zerodha"]).toBe(EBaseCategories.savings);
    expect(keywordBaseCategoryMap["upi"]).toBe(EBaseCategories.expenses);
    expect(keywordBaseCategoryMap["rtgs"]).toBe(EBaseCategories.income);
  });

  it("returns undefined for unknown keywords", () => {
    expect(keywordBaseCategoryMap["unknown"]).toBeUndefined();
    expect(keywordBaseCategoryMap["swiggy"]).toBeUndefined();
  });

  it("is case sensitive", () => {
    expect(keywordBaseCategoryMap["Zerodha"]).toBeUndefined();
    expect(keywordBaseCategoryMap["ZERODHA"]).toBeUndefined();
  });
});
