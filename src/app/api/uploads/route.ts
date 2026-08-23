import { badRequest, payloadTooLarge, unsupportedMediaType } from "@/lib/api/errors";
import { ok, withRoute } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { signDownloadToken } from "@/lib/auth/jwt";
import type { DocumentDto } from "@/lib/dto";
import { env } from "@/lib/env";
import { createStagedDocument, newDocumentId } from "@/lib/repositories/documents";
import { buildDocumentKey, objectStore } from "@/lib/storage";
import { documentTypeSchema } from "@/lib/validation/application";

export const runtime = "nodejs";

const PDF_MAGIC = "%PDF-";

/**
 * POST /api/uploads — multipart form with `file` and `docType`.
 *
 * Validation is defence in depth: the declared MIME type, the file extension
 * AND the first bytes of the payload all have to say "PDF", because the first
 * two are attacker-controlled. The size limit is enforced after reading into
 * memory (files are capped at 5 MB, so this is safe) as well as by the
 * declared size, and Next's own body limit backs it up.
 */
export const POST = withRoute(async (request: Request) => {
  const user = await requireUser(request);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    throw unsupportedMediaType("Send this request as multipart/form-data.");
  }

  const form = await request.formData();
  const docType = documentTypeSchema.parse(form.get("docType"));
  const file = form.get("file");

  if (!(file instanceof File)) {
    throw badRequest("No file was attached.", { file: "Choose a PDF to upload." });
  }
  if (file.size === 0) {
    throw badRequest("The uploaded file is empty.", { file: "That file is empty." });
  }
  if (file.size > env.maxUploadBytes) {
    throw payloadTooLarge(
      `Each file must be ${Math.floor(env.maxUploadBytes / (1024 * 1024))} MB or smaller.`
    );
  }
  if (file.type && file.type !== "application/pdf") {
    throw unsupportedMediaType("Only PDF files are accepted.");
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw unsupportedMediaType("Only PDF files are accepted.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > env.maxUploadBytes) {
    throw payloadTooLarge("That file is larger than the 5 MB limit.");
  }
  if (buffer.subarray(0, 5).toString("latin1") !== PDF_MAGIC) {
    throw unsupportedMediaType(
      "That file is not a valid PDF (its contents do not start with %PDF-)."
    );
  }

  const originalName = sanitiseFileName(file.name);
  const documentId = newDocumentId();
  const storageKey = buildDocumentKey({
    userId: user.id,
    documentId,
    originalName,
  });

  const stored = await objectStore.put(storageKey, buffer, "application/pdf");

  await createStagedDocument({
    id: documentId,
    userId: user.id,
    docType,
    originalName,
    storageKey: stored.key,
    mimeType: "application/pdf",
    sizeBytes: stored.size,
    checksumSha256: stored.checksumSha256,
  });

  const token = await signDownloadToken({ documentId, userId: user.id });

  return ok(
    {
      document: {
        id: documentId,
        docType,
        originalName,
        mimeType: "application/pdf",
        sizeBytes: stored.size,
        checksumSha256: stored.checksumSha256,
        uploadedAt: new Date().toISOString(),
      } satisfies DocumentDto,
      // Equivalent of an S3 pre-signed URL: valid for five minutes, for this
      // document, for this owner only.
      previewUrl: `/api/files/${documentId}?token=${token}`,
    },
    201
  );
});

/** Strips directory components and control characters from a client filename. */
function sanitiseFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "document.pdf";
  const cleaned = base
    .replace(/[\u0000-\u001f<>:"|?*]/g, "_")
    .trim()
    .slice(0, 200);
  return cleaned || "document.pdf";
}
