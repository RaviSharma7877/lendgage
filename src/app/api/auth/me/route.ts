import { ok, withRoute } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/session";
import { countApplicationsForUser } from "@/lib/repositories/applications";

export const runtime = "nodejs";

/** GET /api/auth/me — the current session plus a small summary for the header. */
export const GET = withRoute(async (request: Request) => {
  const user = await requireUser(request);
  const counts = await countApplicationsForUser(user.id);
  return ok({ user, applications: counts });
});
