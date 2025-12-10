import { mock } from "jest-mock-extended";
import { S3Service } from "./s3-client";
import { ILogger } from "@common";
import { S3 } from "@aws-sdk/client-s3";

describe("S3Service", () => {
  let s3Client: S3;
  let loggerMock: ReturnType<typeof mock<ILogger>>;
  let service: S3Service;
  const bucket = "test-bucket";
  const key = "test-key";
  const fileBuffer = Buffer.from("test-data");

  beforeEach(() => {
    loggerMock = mock<ILogger>();
    s3Client = new S3({});
    jest.spyOn(s3Client, "send").mockImplementation(jest.fn());
    service = new S3Service(loggerMock, bucket, s3Client);
  });

  it("should upload a file to S3", async () => {
    (s3Client.send as jest.Mock).mockResolvedValue({});
    await service.putFile(key, fileBuffer);
    expect(s3Client.send).toHaveBeenCalled();
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
    (s3Client.send as jest.Mock).mockResolvedValue({
      $metadata: { httpStatusCode: 200 },
      Body: asyncIterable,
    });
    const result = await service.getFile(key);
    expect(s3Client.send).toHaveBeenCalled();
    expect(loggerMock.debug).toHaveBeenCalledWith("###GettingS3", { key });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("chunk1chunk2");
  });

  it("should throw error if S3 Body is missing", async () => {
    (s3Client.send as jest.Mock).mockResolvedValue({
      $metadata: { httpStatusCode: 200 },
    });
    await expect(service.getFile(key)).rejects.toThrow(
      `No file body returned from S3: ${key}`
    );
  });

  it("should throw error if S3 httpStatusCode is not 200", async () => {
    (s3Client.send as jest.Mock).mockResolvedValue({
      $metadata: { httpStatusCode: 404 },
      Body: {},
    });
    await expect(service.getFile(key)).rejects.toThrow(
      "Failed to get file from S3: 404"
    );
  });
});
