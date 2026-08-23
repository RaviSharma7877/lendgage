import path from "node:path";

import { LocalObjectStore } from "./local";
import type { ObjectStore } from "./types";

export type { ObjectStore, StoredObject } from "./types";

/**
 * Single place where the storage driver is chosen. Point this at an S3 adapter
 * and nothing else in the codebase has to change.
 */
export const objectStore: ObjectStore = new LocalObjectStore();

/**
 * Keys are namespaced per user, which keeps one applicant's documents
 * physically separated from another's and makes an eventual S3 bucket policy
 * (or a per-user prefix lifecycle rule) trivial to express.
 */
export function buildDocumentKey(input: {
  userId: string;
  documentId: string;
  originalName: string;
}): string {
  const extension = path.extname(input.originalName).toLowerCase() || ".pdf";
  return path.posix.join("users", input.userId, `${input.documentId}${extension}`);
}

export function buildCertificateKey(input: { userId: string; applicationId: string }): string {
  return path.posix.join("users", input.userId, "certificates", `${input.applicationId}.pdf`);
}
