import { UserStore } from "./user";

describe("UserStore", () => {
  let storeMock: any;
  let loggerMock: any;
  let userStore: UserStore;
  const tableName = "users";
  const user = {
    email: "test@example.com",
    name: "Test User",
    passwordHash: "hashedpw",
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  };

  beforeEach(() => {
    loggerMock = {
      info: jest.fn(),
      debug: jest.fn(),
    };
    storeMock = {
      send: jest.fn(),
    };
    userStore = new UserStore(loggerMock, tableName, storeMock);
  });

  it("should get a user from DynamoDB", async () => {
    storeMock.send.mockResolvedValue({ Item: user });
    const result = await userStore.getUser(user.email);
    expect(storeMock.send).toHaveBeenCalled();
    expect(result).toEqual(user);
  });

  it("should return undefined if user not found", async () => {
    storeMock.send.mockResolvedValue({});
    const result = await userStore.getUser(user.email);
    expect(result).toBeUndefined();
  });

  it("should save a user to DynamoDB", async () => {
    storeMock.send.mockResolvedValue({});
    await userStore.saveUser(user);
    expect(storeMock.send).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith("Saving user to DynamoDB");
  });

  it("should update a user in DynamoDB", async () => {
    storeMock.send.mockResolvedValue({});
    await userStore.updateUser({ email: user.email, name: "New Name" });
    expect(storeMock.send).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith("Updating user in DynamoDB");
  });

  it("should not update if no fields provided", async () => {
    const result = await userStore.updateUser({ email: user.email });
    expect(storeMock.send).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
