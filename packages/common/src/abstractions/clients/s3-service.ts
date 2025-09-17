export interface IS3Service {
  getFile(key: string): Promise<Buffer>;
  putFile(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
  ): Promise<void>;
}
