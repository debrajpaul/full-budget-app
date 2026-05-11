import { RefreshTokenStore } from "./refresh-token-store";
import { mock } from "jest-mock-extended";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ILogger, ETenantType, IRefreshToken } from "@common";

const TABLE = "refresh-tokens";
const TENANT = ETenantType.default;
const USER_ID = "user@example.com";
const TOKEN_ID = "sha256-hash-of-token";
const FAMILY = "family-uuid-123";

const makeToken = (overrides: Partial<IRefreshToken> = {}): IRefreshToken => ({
  tokenId: TOKEN_ID,
  family: FAMILY,
  userId: USER_ID,
  tenantId: TENANT,
  isRevoked: false,
  createdAt: "2026-01-01T00:00:00Z",
  expiresAt: "2026-02-01T00:00:00Z",
  ttl: 1738368000,
  ...overrides,
});

describe("RefreshTokenStore", () => {
  let storeMock: { send: jest.Mock };
  let logger: ReturnType<typeof mock<ILogger>>;
  let store: RefreshTokenStore;

  beforeEach(() => {
    logger = mock<ILogger>();
    storeMock = { send: jest.fn() };
    store = new RefreshTokenStore(
      logger,
      TABLE,
      storeMock as unknown as DynamoDBDocumentClient
    );
  });

  describe("save", () => {
    it("puts the token item into DynamoDB", async () => {
      storeMock.send.mockResolvedValue({});
      const token = makeToken();

      await store.save(token);

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.TableName).toBe(TABLE);
      expect(cmd.input.Item).toMatchObject({
        tokenId: TOKEN_ID,
        family: FAMILY,
      });
    });
  });

  describe("findById", () => {
    it("returns the token when found", async () => {
      storeMock.send.mockResolvedValue({ Item: makeToken() });

      const result = await store.findById(TOKEN_ID);

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.Key).toEqual({ tokenId: TOKEN_ID });
      expect(result?.tokenId).toBe(TOKEN_ID);
    });

    it("returns null when token not found", async () => {
      storeMock.send.mockResolvedValue({ Item: undefined });

      const result = await store.findById("missing");

      expect(result).toBeNull();
    });
  });

  describe("revokeToken", () => {
    it("updates isRevoked to true for the given tokenId", async () => {
      storeMock.send.mockResolvedValue({});

      await store.revokeToken(TOKEN_ID);

      const cmd = storeMock.send.mock.calls[0][0];
      expect(cmd.input.Key).toEqual({ tokenId: TOKEN_ID });
      expect(cmd.input.UpdateExpression).toContain("isRevoked");
      expect(cmd.input.ExpressionAttributeValues[":t"]).toBe(true);
      expect(cmd.input.ConditionExpression).toBe("attribute_exists(tokenId)");
    });
  });

  describe("revokeFamily", () => {
    it("queries FamilyIndex and marks every token in the family as revoked", async () => {
      const familyTokens = [makeToken(), makeToken({ tokenId: "token-2" })];
      storeMock.send
        .mockResolvedValueOnce({ Items: familyTokens }) // QueryCommand
        .mockResolvedValue({}); // UpdateCommand × N

      await store.revokeFamily(FAMILY);

      const [queryCall, ...updateCalls] = storeMock.send.mock.calls;
      expect(queryCall[0].input.IndexName).toBe("FamilyIndex");
      expect(queryCall[0].input.ExpressionAttributeValues[":family"]).toBe(
        FAMILY
      );
      expect(updateCalls).toHaveLength(2);
      for (const [cmd] of updateCalls) {
        expect(cmd.input.ExpressionAttributeValues[":t"]).toBe(true);
      }
    });

    it("does nothing when family has no tokens", async () => {
      storeMock.send.mockResolvedValueOnce({ Items: [] });

      await store.revokeFamily(FAMILY);

      expect(storeMock.send).toHaveBeenCalledTimes(1); // only the query
    });

    it("logs a reuse-attack warning", async () => {
      storeMock.send.mockResolvedValueOnce({ Items: [] });

      await store.revokeFamily(FAMILY);

      expect(logger.debug).toHaveBeenCalledWith(
        "Revoking entire token family — reuse attack detected",
        { family: FAMILY }
      );
    });
  });
});
