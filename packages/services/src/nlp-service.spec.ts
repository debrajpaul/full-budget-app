import { NlpService } from "./nlp-service";
import { mock } from "jest-mock-extended";
import { ILogger, INlpService } from "@common";

const mockLogger = mock<ILogger>();

describe("NlpService (provider-free)", () => {
  let nlpService: INlpService;

  beforeEach(() => {
    jest.clearAllMocks();
    nlpService = new NlpService(mockLogger);
  });

  describe("analyzeDescription", () => {
    it("returns NEUTRAL sentiment with no entities by default", async () => {
      const result = await nlpService.analyzeDescription("Simple transaction");
      expect(result.sentiment).toBe("NEUTRAL");
      expect(result.entities).toEqual([]);
    });

    it("detects positive sentiment heuristically", async () => {
      const result = await nlpService.analyzeDescription(
        "salary credit received",
      );
      expect(result.sentiment).toBe("POSITIVE");
    });

    it("detects negative sentiment heuristically", async () => {
      const result = await nlpService.analyzeDescription(
        "late fee debit applied",
      );
      expect(result.sentiment).toBe("NEGATIVE");
    });
  });

  describe("classifyDescription", () => {
    it("returns empty classes without external classifier", async () => {
      const result = await nlpService.classifyDescription("Shopping at Amazon");
      expect(result).toEqual([]);
    });
  });
});
