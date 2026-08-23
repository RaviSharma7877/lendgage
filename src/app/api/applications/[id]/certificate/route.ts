import { notFound } from "@/lib/api/errors";
import { ok, withRoute } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { toApplicationDto } from "@/lib/dto";
import { buildCertificatePdf } from "@/lib/pdf/certificate";
import { findApplicationForUser, issueCertificate } from "@/lib/repositories/applications";
import { listDocumentsForApplication } from "@/lib/repositories/documents";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/**
 * GET /api/applications/:id/certificate — streams the acknowledgement PDF.
 *
 * The PDF is rendered on demand from the stored row rather than cached on disk:
 * it is cheap (~50 ms), it can never drift from the data, and it keeps the
 * re-download path on the dashboard trivially correct.
 */
export const GET = withRoute(async (request: Request, context: Context) => {
  const user = await requireUser(request);
  const { id } = await context.params;

  let application = await findApplicationForUser({ applicationId: id, userId: user.id });
  if (!application) throw notFound("Application not found.");

  // Self-healing: an application that never got its serial gets one now.
  if (!application.certificate_serial) {
    application = await issueCertificate({ applicationId: id, userId: user.id });
  }

  const documents = await listDocumentsForApplication({
    applicationId: application.id,
    userId: user.id,
  });

  const pdf = await buildCertificatePdf({
    application,
    documents,
    issuedTo: { email: user.email },
  });

  const disposition = new URL(request.url).searchParams.get("inline") === "1"
    ? "inline"
    : "attachment";

  return new Response(Buffer.from(pdf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-length": String(pdf.byteLength),
      "content-disposition": `${disposition}; filename="acknowledgement-${application.reference_number}.pdf"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
});

/** POST /api/applications/:id/certificate — retry issuing (idempotent). */
export const POST = withRoute(async (request: Request, context: Context) => {
  const user = await requireUser(request);
  const { id } = await context.params;

  const existing = await findApplicationForUser({ applicationId: id, userId: user.id });
  if (!existing) throw notFound("Application not found.");

  const application = await issueCertificate({ applicationId: id, userId: user.id });
  return ok({ application: toApplicationDto(application) });
});
