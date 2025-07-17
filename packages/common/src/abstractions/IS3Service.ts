export interface IS3Service {
  getFile(bucket: string, key: string): Promise<Buffer>;
  putFile(bucket: string, key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void>;
}