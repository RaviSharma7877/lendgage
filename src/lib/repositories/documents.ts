import { prisma } from "@/lib/db";
import { newId } from "@/lib/reference";
import type { DocumentType } from "@/lib/validation/application";
import type { Document, Prisma } from "@prisma/client";

export type DocumentRow = Omit<Document, "size_bytes"> & { size_bytes: number };

function mapDoc(doc: Document): DocumentRow {
  return { ...doc, size_bytes: Number(doc.size_bytes) };
}

export function newDocumentId(): string {
  return newId();
}

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
  await prisma.document.create({
    data: {
      id: input.id,
      user_id: input.userId,
      doc_type: input.docType as any,
      original_name: input.originalName,
      storage_key: input.storageKey,
      mime_type: input.mimeType,
      size_bytes: BigInt(input.sizeBytes),
      checksum_sha256: input.checksumSha256,
    }
  });
}

export async function findOwnedDocument(input: {
  documentId: string;
  userId: string;
}): Promise<DocumentRow | null> {
  const doc = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      user_id: input.userId
    }
  });
  return doc ? mapDoc(doc) : null;
}

export async function listDocumentsForApplication(input: {
  applicationId: string;
  userId: string;
}): Promise<DocumentRow[]> {
  const docs = await prisma.document.findMany({
    where: {
      application_id: input.applicationId,
      user_id: input.userId
    },
    orderBy: {
      doc_type: 'asc'
    }
  });
  return docs.map(mapDoc);
}

export async function attachDocumentToApplication(
  tx: Prisma.TransactionClient,
  input: { documentId: string; userId: string; applicationId: string; docType: DocumentType }
): Promise<boolean> {
  const result = await tx.document.updateMany({
    where: {
      id: input.documentId,
      user_id: input.userId,
      doc_type: input.docType as any,
      application_id: null
    },
    data: {
      application_id: input.applicationId
    }
  });
  return result.count === 1;
}

export async function listStagedDocuments(userId: string): Promise<DocumentRow[]> {
  const docs = await prisma.document.findMany({
    where: {
      user_id: userId,
      application_id: null
    },
    orderBy: {
      created_at: 'desc'
    }
  });
  return docs.map(mapDoc);
}
