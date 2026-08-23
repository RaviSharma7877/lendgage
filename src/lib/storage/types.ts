export type StoredObject = {
  key: string;
  size: number;
  checksumSha256: string;
};

/**
 * The application only ever talks to this interface, so swapping local disk
 * for S3/R2 means adding one adapter (put/get/remove + a signed URL) and
 * changing the export in `lib/storage/index.ts` — no route or UI changes.
 */
export interface ObjectStore {
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
