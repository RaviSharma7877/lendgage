import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import { execute, query, queryOne } from "@/lib/db";
import { newId } from "@/lib/reference";
import type { DocumentType } from "@/lib/validation/application";

export type DocumentRow = RowDataPacket & {
  id: string;
  user_id: string;
  application_id: string | null;
  doc_type: DocumentType;
  original_name: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string;
  created_at: Date;
};

export function newDocumentId(): string {
  return newId();
}

/**
 * Creates a "staged" document: owned by the user, not yet attached to an
 * application. Submitting the form attaches it inside the same transaction
 * that creates the application.
 */
export async function createStagedDocument(input: {
  id: string;
  userId: string;
  docType: DocumentType;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
}): Promise<void> {
  await execute(
    `INSERT INTO documents
       (id, user_id, application_id, doc_type, original_name, storage_key,
        mime_type, size_bytes, checksum_sha256)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.userId,
      input.docType,
      input.originalName,
      input.storageKey,
      input.mimeType,
      input.sizeBytes,
      input.checksumSha256,
    ]
  );
}

/**
 * Every document read is scoped by `user_id`, so one applicant can never
 * address another applicant's file even with a valid document id.
 */
export async function findOwnedDocument(input: {
  documentId: string;
  userId: string;
}): Promise<DocumentRow | null> {
  return queryOne<DocumentRow>(
    `SELECT * FROM documents WHERE id = ? AND user_id = ? LIMIT 1`,
    [input.documentId, input.userId]
  );
}

export async function listDocumentsForApplication(input: {
  applicationId: string;
  userId: string;
}): Promise<DocumentRow[]> {
  return query<DocumentRow>(
    `SELECT * FROM documents
      WHERE application_id = ? AND user_id = ?
      ORDER BY doc_type`,
    [input.applicationId, input.userId]
  );
}

/** Used inside the submit transaction; requires the document to still be staged. */
export async function attachDocumentToApplication(
  connection: PoolConnection,
  input: { documentId: string; userId: string; applicationId: string; docType: DocumentType }
): Promise<boolean> {
  const [result] = await connection.execute(
    `UPDATE documents
        SET application_id = ?
      WHERE id = ?
        AND user_id = ?
        AND doc_type = ?
        AND application_id IS NULL`,
    [input.applicationId, input.documentId, input.userId, input.docType]
  );
  return ((result as { affectedRows?: number }).affectedRows ?? 0) === 1;
}

/** Housekeeping helper: staged uploads a user abandoned before submitting. */
export async function listStagedDocuments(userId: string): Promise<DocumentRow[]> {
  return query<DocumentRow>(
    `SELECT * FROM documents
      WHERE user_id = ? AND application_id IS NULL
      ORDER BY created_at DESC`,
    [userId]
  );
}
