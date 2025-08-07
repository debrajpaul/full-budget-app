import { S3Service } from "./s3-client";

describe("S3Service", () => {
  let s3Mock: any;
  let loggerMock: any;
  let service: S3Service;
  const bucket = "test-bucket";
  const key = "test-key";
  const fileBuffer = Buffer.from("test-data");

  beforeEach(() => {
    loggerMock = {
      info: jest.fn(),
      debug: jest.fn(),
    };
    s3Mock = {
      send: jest.fn(),
    };
    service = new S3Service(loggerMock, s3Mock);
  });

  it("should upload a file to S3", async () => {
    s3Mock.send.mockResolvedValue({});
    await service.putFile(bucket, key, fileBuffer);
    expect(s3Mock.send).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith("#PuttingS3");
  });

  it("should download a file from S3", async () => {
    // Simulate a readable stream for S3 Body
    const chunks = [Buffer.from("chunk1"), Buffer.from("chunk2")];
    const asyncIterable = {
      [Symbol.asyncIterator]: function* () {
        for (const chunk of chunks) yield chunk;
      },
    };
    s3Mock.send.mockResolvedValue({ Body: asyncIterable });
    const result = await service.getFile(bucket, key);
    expect(s3Mock.send).toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith("###GettingS3");
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("chunk1chunk2");
  });

  it("should throw error if S3 Body is missing", async () => {
    s3Mock.send.mockResolvedValue({});
    await expect(service.getFile(bucket, key)).rejects.toThrow(
      "No file body returned from S3",
    );
  });
});
