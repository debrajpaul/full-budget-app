import { categorizeByRules } from "./ruleEngine";

describe("categorizeByRules", () => {
  const rules = {
    swiggy: "Food & Dining",
    amazon: "Shopping",
    ola: "Transport",
    "hdfc loan": "Loan Payment",
  };

  it("should return the correct category if keyword is present in description", () => {
    expect(categorizeByRules("Paid to Swiggy order", rules)).toBe(
      "Food & Dining",
    );
    expect(categorizeByRules("Amazon purchase", rules)).toBe("Shopping");
    expect(categorizeByRules("Ola cab ride", rules)).toBe("Transport");
    expect(categorizeByRules("HDFC Loan EMI", rules)).toBe("Loan Payment");
  });

  it("should be case-insensitive for description", () => {
    expect(categorizeByRules("Paid to SWIGGY order", rules)).toBe(
      "Food & Dining",
    );
    expect(categorizeByRules("amazon Purchase", rules)).toBe("Shopping");
  });

  it("should return null if no keyword matches", () => {
    expect(categorizeByRules("Starbucks coffee", rules)).toBeNull();
    expect(categorizeByRules("Flipkart order", rules)).toBeNull();
  });

  it("should match partial keywords in description", () => {
    expect(categorizeByRules("Paid to swiggy", rules)).toBe("Food & Dining");
    expect(categorizeByRules("EMI for hdfc loan", rules)).toBe("Loan Payment");
  });

  it("should return the first matching category if multiple keywords match", () => {
    const multiRules = { swiggy: "Food", amazon: "Shopping" };
    expect(categorizeByRules("swiggy amazon", multiRules)).toBe("Food");
  });
});
