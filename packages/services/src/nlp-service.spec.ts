import { NlpService } from "./nlp-service";
import { ComprehendClient } from "@aws-sdk/client-comprehend";
import { mock } from "jest-mock-extended";
import { ILogger, INlpService } from "@common";

const mockLogger = mock<ILogger>();
const mockComprehend = mock<ComprehendClient>();

describe("NlpService", () => {
  let nlpService: INlpService;

  beforeEach(() => {
    jest.clearAllMocks();
    nlpService = new NlpService(
      mockLogger,
      mockComprehend,
      "arn:aws:comprehend:us-east-1:123456789012:document-classifier/test",
    );
  });

  describe("analyzeDescription", () => {
    it("should analyze description and return sentiment analysis (no classifier)", async () => {
      nlpService = new NlpService(mockLogger, mockComprehend, "");
      const description = "Great transaction with Amazon";
      const mockSentimentResult = { Sentiment: "POSITIVE" };
      const mockEntitiesResult = {
        Entities: [{ Text: "Amazon", Type: "ORGANIZATION" }],
      };

      mockComprehend.send
        .mockResolvedValueOnce(mockSentimentResult as never)
        .mockResolvedValueOnce(mockEntitiesResult as never);

      const result = await nlpService.analyzeDescription(description);

      expect(result).toEqual({
        entities: [{ Text: "Amazon", Type: "ORGANIZATION" }],
        sentiment: "POSITIVE",
      });
    });

    it("should handle empty entities result (no classifier)", async () => {
      nlpService = new NlpService(mockLogger, mockComprehend, "");
      const description = "Simple transaction";
      const mockSentimentResult = { Sentiment: "NEUTRAL" };
      const mockEntitiesResult = { Entities: undefined };

      mockComprehend.send
        .mockResolvedValueOnce(mockSentimentResult as never)
        .mockResolvedValueOnce(mockEntitiesResult as never);

      const result = await nlpService.analyzeDescription(description);

      expect(result).toEqual({
        entities: [],
        sentiment: "NEUTRAL",
      });
    });

    it("should use classifier when classifierArn is provided", async () => {
      const classifierArn =
        "arn:aws:comprehend:us-east-1:123456789012:document-classifier/test";
      nlpService = new NlpService(mockLogger, mockComprehend, classifierArn);

      const description = "Food delivery from Swiggy";
      const mockSentimentResult = { Sentiment: "NEUTRAL" };
      const mockClassificationResult = {
        Classes: [{ Name: "Food", Score: 0.95 }],
      };

      mockComprehend.send
        .mockResolvedValueOnce(mockSentimentResult as never)
        .mockResolvedValueOnce(mockClassificationResult as never);

      const result = await nlpService.analyzeDescription(description);

      expect(result).toEqual({
        entities: [],
        sentiment: "NEUTRAL",
        classification: [{ Name: "Food", Score: 0.95 }],
      });
    });
  });

  describe("classifyDescription", () => {
    it("should return empty array when no classifier ARN is configured", async () => {
      nlpService = new NlpService(mockLogger, mockComprehend, "");
      const description = "Test transaction";

      const result = await nlpService.classifyDescription(description);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Classifier ARN not configured",
      );
    });

    it("should classify description when classifier ARN is provided", async () => {
      const classifierArn =
        "arn:aws:comprehend:us-east-1:123456789012:document-classifier/test";
      nlpService = new NlpService(mockLogger, mockComprehend, classifierArn);

      const description = "Shopping at Amazon";
      const mockResult = { Classes: [{ Name: "Shopping", Score: 0.89 }] };

      mockComprehend.send.mockResolvedValueOnce(mockResult as never);

      const result = await nlpService.classifyDescription(description);

      expect(result).toEqual([{ Name: "Shopping", Score: 0.89 }]);
    });

    it("should handle classification errors gracefully", async () => {
      const classifierArn =
        "arn:aws:comprehend:us-east-1:123456789012:document-classifier/test";
      nlpService = new NlpService(mockLogger, mockComprehend, classifierArn);

      const description = "Test transaction";
      const error = new Error("Classification failed");

      mockComprehend.send.mockRejectedValueOnce(error as never);

      const result = await nlpService.classifyDescription(description);

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "ClassifyDocumentCommand failed",
        error,
      );
    });
  });
});
