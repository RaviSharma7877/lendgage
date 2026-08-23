import { ok, withRoute } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { toApplicationDto } from "@/lib/dto";
import {
  createApplication,
  issueCertificate,
  listApplicationsForUser,
} from "@/lib/repositories/applications";
import { submitApplicationSchema } from "@/lib/validation/application";

export const runtime = "nodejs";

/** GET /api/applications — the signed-in user's applications, newest first. */
export const GET = withRoute(async (request: Request) => {
  const user = await requireUser(request);
  const applications = await listApplicationsForUser(user.id);
  return ok({ applications: applications.map(toApplicationDto) });
});

/**
 * POST /api/applications — final step of the wizard.
 *
 * The body is re-validated with the very same Zod schema the browser used, the
 * application and its two documents are written in one transaction, and the
 * acknowledgement is then issued. If issuing fails the application stays
 * SUBMITTED and the dashboard offers a retry, rather than losing the submission.
 */
export const POST = withRoute(async (request: Request) => {
  const user = await requireUser(request);
  const data = submitApplicationSchema.parse(await request.json());

  const created = await createApplication({ userId: user.id, data });

  let application = created;
  try {
    application = await issueCertificate({ applicationId: created.id, userId: user.id });
  } catch (error) {
    console.error("[applications] certificate issue failed:", error);
  }

  return ok({ application: toApplicationDto(application) }, 201);
});
