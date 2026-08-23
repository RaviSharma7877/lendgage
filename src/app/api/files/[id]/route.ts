import { forbidden, notFound } from "@/lib/api/errors";
import { withRoute } from "@/lib/api/handler";
import { verifyDownloadToken } from "@/lib/auth/jwt";
import { getSessionUser } from "@/lib/auth/session";
import { findOwnedDocument } from "@/lib/repositories/documents";
import { objectStore } from "@/lib/storage";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/files/:id?token=… — the only way an uploaded document leaves the
 * server. Uploads live outside ./public, so there is no static URL to guess.
 *
 * Two independent checks must pass:
 *   1. a valid signed download token for exactly this document + owner
 *      (5-minute TTL — the local-disk stand-in for an S3 pre-signed URL), or
 *      an active session belonging to the owner;
 *   2. the document row itself must match the caller's user id.
 */
export const GET = withRoute(async (request: Request, context: Context) => {
  const { id } = await context.params;
  const token = new URL(request.url).searchParams.get("token");

  let userId: string | null = null;

  if (token) {
    const claims = await verifyDownloadToken(token);
    if (!claims || claims.documentId !== id) {
      throw forbidden("This download link is invalid or has expired.");
    }
    userId = claims.userId;
  } else {
    const session = await getSessionUser(request);
    userId = session?.id ?? null;
  }

  if (!userId) throw forbidden("This download link is invalid or has expired.");

  const document = await findOwnedDocument({ documentId: id, userId });
  if (!document) throw notFound("Document not found.");

  const body = await objectStore.get(document.storage_key);

  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      "content-type": document.mime_type,
      "content-length": String(body.byteLength),
      "content-disposition": `inline; filename="${document.original_name.replace(/"/g, "")}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
});
