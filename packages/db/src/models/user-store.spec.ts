import { UserStore } from "./user-store";
import { mock } from "jest-mock-extended";
import type { ILogger } from "@common";

describe("UserStore", () => {
  let storeMock: any;
  let loggerMock: ReturnType<typeof mock<ILogger>>;
  let userStore: UserStore;
  const tableName = "users";
  const tenantId = "tenant1";
  const user = {
    tenantId: tenantId,
    email: "test@example.com",
    name: "Test User",
    passwordHash: "hashedpw",
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  };

  beforeEach(() => {
    loggerMock = mock<ILogger>();
    storeMock = { send: jest.fn() } as any;
    userStore = new UserStore(loggerMock, tableName, storeMock);
  });

  it("should get a user from DynamoDB", async () => {
    storeMock.send = jest.fn().mockResolvedValue({ Item: user });
    const result = await userStore.getUser(tenantId, user.email);
    expect(storeMock.send).toHaveBeenCalled();
    expect(result).toEqual(user);
  });

  it("should return undefined if user not found", async () => {
    storeMock.send = jest.fn().mockResolvedValue({});
    const result = await userStore.getUser(tenantId, user.email);
    expect(result).toBeUndefined();
  });

  it("should save a user to DynamoDB", async () => {
    storeMock.send = jest.fn().mockResolvedValue({});
    await userStore.saveUser(user);
    expect(storeMock.send).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith("Saving user to DynamoDB");
  });

  it("should update a user in DynamoDB", async () => {
    storeMock.send = jest.fn().mockResolvedValue({});
    await userStore.updateUser(tenantId, {
      email: user.email,
      name: "New Name",
    });
    expect(storeMock.send).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith("Updating user in DynamoDB");
  });

  it("should not update if no fields provided", async () => {
    const result = await userStore.updateUser(tenantId, { email: user.email });
    expect(storeMock.send).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
