import { notFound } from "@/lib/api/errors";
import { ok, withRoute } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { signDownloadToken } from "@/lib/auth/jwt";
import { toApplicationDto, toDocumentDto } from "@/lib/dto";
import { findApplicationForUser } from "@/lib/repositories/applications";
import { listDocumentsForApplication } from "@/lib/repositories/documents";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/** GET /api/applications/:id — one application plus its documents. */
export const GET = withRoute(async (request: Request, context: Context) => {
  const user = await requireUser(request);
  const { id } = await context.params;

  const application = await findApplicationForUser({ applicationId: id, userId: user.id });
  // 404 rather than 403 for someone else's id, so ids stay unenumerable.
  if (!application) throw notFound("Application not found.");

  const documents = await listDocumentsForApplication({
    applicationId: application.id,
    userId: user.id,
  });

  return ok({
    application: toApplicationDto(application),
    documents: await Promise.all(
      documents.map(async (document) => ({
        ...toDocumentDto(document),
        downloadUrl: `/api/files/${document.id}?token=${await signDownloadToken({
          documentId: document.id,
          userId: user.id,
        })}`,
      }))
    ),
  });
});
